import { Hono } from 'hono';
import { Resend } from 'resend';
import { esc } from '../../lib/contactEmail';
import { getEnv } from '../lib/env';
import { getServiceClient } from '../lib/supabase';
import { consumeEmailBudget } from '../middleware/rateLimit';

// 스케줄러 전용 엔드포인트 — pg_cron(+pg_net)이 CRON_SECRET Bearer로 호출한다.
// 메일 발송은 Node/Resend 레이어에서만 가능하므로 Postgres가 아닌 이 라우트에서 처리.
export const cron = new Hono();

const BATCH = 100;
const TWO_YEARS_MS = 1000 * 60 * 60 * 24 * 365 * 2;

// 광고성 정보 수신동의 재확인 안내문 (정보통신망법 시행령 제62조의3 필수 고지사항:
// 전송자 명칭 / 수신동의 날짜·사실 / 수신동의 철회 방법). 광고가 아닌 법정 안내라 "(광고)" 미표기.
function reconfirmHtml(name: string, consentDate: string, siteUrl: string): string {
  return `<!DOCTYPE html><html lang="ko"><body style="font-family:system-ui,'Malgun Gothic',sans-serif;font-size:14px;color:#333;line-height:1.7;">
    <h2 style="font-size:16px;color:#1a0a3d;">광고성 정보 수신동의 확인 안내</h2>
    <p>${esc(name)}님, 안녕하세요. (주)로보시지입니다.</p>
    <p>회원님께서는 <strong>${esc(consentDate)}</strong>에 로보시지의 광고성 정보(이벤트·할인 알림 등) 수신에 동의하셨습니다.
    「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 제50조 및 같은 법 시행령 제62조의3에 따라 2년마다 수신동의 사실을 확인해 드립니다.</p>
    <p>계속 수신을 원하시면 별도로 조치하실 필요가 없습니다. 수신을 원하지 않으시면
    <a href="${siteUrl}/mypage" style="color:#4472c4;">마이페이지 &gt; 회원정보 수정</a>에서 마케팅 수신동의를 언제든지 해제하실 수 있습니다.</p>
    <p style="color:#888;font-size:12px;margin-top:20px;">(주)로보시지 · roboseasy@gmail.com</p>
  </body></html>`;
}

/* ── 마케팅 수신동의 2년 주기 재확인 발송 ──
   최종 확인 시점(marketing_reconfirmed_at, 없으면 최초 동의 marketing_consent_at)이
   2년 지난 수신동의 회원에게 안내 메일 발송 → marketing_reconfirmed_at 갱신(다음 2년까지 재발송 안 함).
   발송 실패 건은 timestamp를 갱신하지 않아 다음 실행에서 재시도. */
cron.post('/cron/marketing-reconfirm', async (c) => {
  const secret = getEnv('CRON_SECRET');
  if (!secret || c.req.header('authorization') !== `Bearer ${secret}`) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const db = getServiceClient();
  if (!db) return c.json({ error: '서버 설정 오류입니다.' }, 500);

  const cutoff = new Date(Date.now() - TWO_YEARS_MS).toISOString();

  const { data: due, error } = await db
    .from('profiles')
    .select('user_id, user_email, user_name, marketing_consent_at')
    .eq('marketing_consent', true)
    .is('withdrawn_at', null)
    .or(`and(marketing_reconfirmed_at.is.null,marketing_consent_at.lt.${cutoff}),marketing_reconfirmed_at.lt.${cutoff}`)
    .limit(BATCH);
  if (error) {
    console.error('marketing-reconfirm 대상 조회 오류:', error);
    return c.json({ error: '대상 조회에 실패했습니다.' }, 500);
  }
  if (!due || due.length === 0) return c.json({ processed: 0, sent: 0, failed: 0 });

  const resend = new Resend(getEnv('RESEND_API_KEY'));
  const from = getEnv('QUOTE_FROM');
  const siteUrl = getEnv('PUBLIC_SITE_URL') || 'https://roboseasy.ai';
  const nowIso = new Date().toISOString();

  let sent = 0;
  let skipped = 0; // 전역 예산 소진으로 이번 실행에서 건너뛴 건 (timestamp 미갱신 → 다음 실행 재시도)
  const failed: string[] = [];
  for (const u of due) {
    // 전역 일일 예산(Resend 무료 100/day) 소진 시 남은 대상은 다음 실행으로 이월
    if (!(await consumeEmailBudget(db))) { skipped = due.length - sent - failed.length; break; }

    const consentDate = u.marketing_consent_at
      ? new Date(u.marketing_consent_at).toLocaleDateString('ko-KR')
      : '(기록 없음)';
    const { error: mailError } = await resend.emails.send({
      from,
      to: u.user_email,
      replyTo: 'roboseasy@gmail.com', // 회원이 "답장"하면 운영 메일함으로 (본문 안내 연락처와 동일)
      subject: '[로보시지] 광고성 정보 수신동의 확인 안내',
      html: reconfirmHtml(u.user_name, consentDate, siteUrl),
    });
    if (mailError) { failed.push(u.user_id); continue; }

    const { error: upError } = await db
      .from('profiles').update({ marketing_reconfirmed_at: nowIso }).eq('user_id', u.user_id);
    if (upError) { failed.push(u.user_id); continue; }
    sent++;
  }

  if (failed.length) console.error(`marketing-reconfirm 일부 실패: ${failed.length}건`);
  if (skipped) console.error(`marketing-reconfirm 예산 소진으로 이월: ${skipped}건`);
  return c.json({ processed: sent + failed.length, sent, failed: failed.length, skipped });
});
