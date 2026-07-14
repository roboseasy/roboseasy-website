# Operations — 배포·테스트·운영

로컬 개발부터 배포·운영까지의 절차와 주의사항. (구 tech-stack·workflows·known-issues의 운영 관련 내용 통합)

## 로컬 개발

```bash
npm install            # 의존성 설치 (최초 1회)
npm run dev            # http://localhost:4321 — 수정 시 자동 리로드
npm run build          # dist/ 생성 (정적 페이지 + SSR Functions)
npm run preview        # 프로덕션 번들 미리보기
```

- **Node 20 LTS** 필요 (`.nvmrc`) — nvm 있으면 `nvm use`. 시스템 Node 18.20.8+면 Astro 4가 동작은 하지만 Netlify 빌드는 Node 20
- Astro 4로 핀됨 (`astro@^4.16.19`) — Astro 5는 Node 20+ 강제라 업그레이드 시 로컬 환경 먼저 확인

## 커밋 규칙

| Prefix | 용도 |
| --- | --- |
| `FEAT:` | 새 기능 / 새 페이지 |
| `ADD:` | 콘텐츠·리소스 추가 (이미지, docs 페이지 등) |
| `UPDATE:` | 기존 기능/UI 개선 |
| `FIX:` | 버그 수정 |
| `REFACTOR:` | 동작 변경 없는 코드 정리 |
| `DOCS:` | 문서/주석 변경 |
| `CHORE:` | 설정·메타데이터 변경 |

제목은 영어로 간결하게 (예: `FEAT: Add LeKiwi assembly guide`).

## 배포

main 브랜치 푸시 → Netlify가 자동으로 `npm run build` 실행 후 `dist/` 배포.

```bash
git push origin main
```

- 빌드 시간 보통 30초~1분, Netlify 대시보드에서 로그 확인
- `netlify.toml`: build command·publish·NODE_VERSION·`included_files`(견적서 엑셀 템플릿) 정의
- **알려진 빌드 경고(무시 가능)**: `@astrojs/netlify`의 "assets" experimental 경고 — 동작 무관한 업스트림 노이즈

## 환경변수 (Netlify Site configuration)

| 변수 | 용도 | 미설정 시 |
|---|---|---|
| `RESEND_API_KEY` | 문의 메일 발송 | 빌드는 통과, 런타임에 폼 전송 실패 |
| `QUOTE_FROM` / `QUOTE_TO` | 문의 메일 발신/수신 주소 | 〃 |
| (1차 예정) `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | 백엔드 — anon 키는 유저 토큰 클라이언트(RLS 적용) 생성용, service role은 RLS 우회 작업 전용·클라이언트 노출 금지 | backend.md §1 |
| `CRON_SECRET` | 스케줄러 전용 엔드포인트(`/api/v1/cron/*`) 인증 토큰. Supabase Vault의 `cron_secret`과 동일 값으로 설정 | 마케팅 재확인 배치가 401로 거부됨 |
| (2차 예정) `TOSS_SECRET_KEY` | 결제 승인·취소 API | backend.md §4 |

### 스케줄 작업 (pg_cron) 확인

DB에 등록된 정기 작업은 SQL Editor에서 확인·검증한다. pg_cron은 Supabase DB(상시 가동)에서 돌아가며 Netlify 배포와 무관하다.

- **최초 활성화**: Dashboard > Database > Extensions에서 `pg_cron`·`pg_net` 활성화(마이그레이션의 `create extension`으로도 시도되나, 권한 이슈 시 대시보드에서 확인).
- **등록된 작업 조회**: `select jobid, jobname, schedule, active, command from cron.job;` → `purge-expired-contacts`, `marketing-reconfirm-notice`, `purge-rate-limit-buckets` 세 건이 보이면 정상.
- **실행 이력**: `select jobname, status, return_message, start_time from cron.job_run_details order by start_time desc limit 20;` → `status = 'succeeded'` 확인. 실패면 `return_message`에 원인.
- **HTTP 호출 결과(pg_net)**: 마케팅 재확인은 엔드포인트를 호출하므로 `select id, status_code, error_msg, created from net._http_response order by created desc limit 10;`로 응답 코드(200 기대) 확인.
- **수동 실행(테스트)**: 파기는 `select public.purge_expired_contacts();`(삭제 건수 반환). 마케팅 재확인은 `select cron.schedule` 명령 본문을 직접 실행하거나 `curl -X POST https://roboseasy.ai/api/v1/cron/marketing-reconfirm -H "Authorization: Bearer <CRON_SECRET>"`.
- **Vault 시크릿 등록(재확인 배치 전제)**: `select vault.create_secret('<CRON_SECRET 값>', 'cron_secret');` (Netlify `CRON_SECRET`과 동일 값).
- **주의**: cron 스케줄은 UTC 기준. `0 3 * * *` = KST 12:00, `0 4 1 * *` = 매월 1일 KST 13:00.

## CMS 운영 주의 (Sveltia — /admin)

- **저장 = main 직접 커밋 = 즉시 라이브 반영** (PR 검수 없음). 잘못 저장하면 곧장 노출 — 저장 전 필수값 확인, 저장 후 배포된 사이트에서 재확인. 검수가 필요해지면 config.yml에 `publish_mode: editorial_workflow` 복원
- **잘못된 입력 → 빌드 실패 가능**: 제품 필수값(id/name/category/price) 누락 주의. id는 `pattern`으로 형식 검증되지만 **중복은 CMS가 못 막음**
- **제품 id 변경 금지**: URL(`/products/<id>`)이 바뀌고, 판매 연동 후에는 주문 FK까지 얽힘 (backend.md §2)
- **스키마 이중 관리**: `src/data/products.ts` 타입 ↔ `public/admin/config.yml` 필드를 함께 수정해야 함 (2차부터는 DB products 동기화 매핑도 — backend.md §2)
- 미디어 업로드는 `public/img/uploads`에 누적 — 대용량 이미지는 webp로 변환 후 업로드 권장

## 옛 URL 호환 (SEO 리다이렉트)

옛 docsify URL(`docs-*.html`, `*.html`, `/shop` 등)은 `public/_redirects`에서 301 매핑 — Netlify가 처리.

- **기존 라인은 삭제·수정 금지** (외부 인바운드 링크 호환). 새 매핑은 한 줄 추가:
  ```
  /old-path     /new-path     301
  ```
- 새 페이지 추가 시에는 수정 불필요 (Astro 라우팅이 처리)

## 문의 메일 운영

- 문의(B2B) 기록의 원본은 **수신 메일함** — 첨부(사업자등록증)는 서버·DB에 저장되지 않음
- 보유기간 운영 규칙: 일반 문의 1년 / 불만·분쟁 3년 (개인정보처리방침 제3조) — 메일함 정리 시 준수
- (1차부터) contacts 테이블에 병행 기록 — backend.md §3
- **Rate limit (Token Bucket, `rate_limit_buckets` 테이블 + `consume_token` RPC)**: B2B 문의는 IP, B2C 문의는 user_id 기준으로 버스트 5회·이후 5분당 1회. 초과 시 429.
- **Resend 무료 100/day 예산**: 전역 버킷(`global:resend`, capacity 100·1일 100충전)이 contact·inquiry·마케팅 cron의 모든 발송을 통과시킴. 소진 시 → B2B 문의는 DB에 접수 저장 후 "확인 후 연락" 안내(첨부만 유실), B2C 알림·마케팅 재확인은 스킵(재확인은 다음 실행 이월). **유료 전환 시 이 예산 상향**: `src/server/middleware/rateLimit.ts`의 `consumeEmailBudget` capacity·refill 조정

## 테스트

> 아직 자동화된 테스트 없음. 백엔드 1차 개발 시 이 섹션에 정리 예정:
> - API 테스트 방식 (Hono 앱 단위 테스트 등)
> - RLS 검증 절차 (타 유저 데이터 접근 불가 확인)
> - 결제 테스트 (토스 테스트 키) — 2차

## 검증 파일 (건드리지 말 것)

- `public/googlef0b1a1e39ee27640.html` — Google Search Console 소유 인증
- `public/naver7c406803e4247ba3ca91608608d9f54b.html`, `public/naver9135c1ba273dbc0521b00160be932a2f.html` — 네이버 웹마스터 인증
- `public/robots.txt` — 수동 관리, `sitemap-index.xml` 참조 유지
