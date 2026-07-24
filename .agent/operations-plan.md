# 배포·테스트·운영 계획서 (Deployment, Test & Operations Plan)

로보시지(RoboSEasy) B2B·B2C 로봇 판매 웹 서비스 — Astro · Hono · Supabase · Netlify · Sveltia CMS

> **v1.1 (2026-07-10)** — 김기호 작성 v1.0(2026-07-02, 워드 문서) 기반, 백엔드 1차 개발 완료(회원·B2C 문의·관리자·pg_cron 배치) 및 Supabase Pro 도입을 반영해 갱신.
> 실무 절차(명령어·환경변수 상세·CMS 주의사항)는 [operations.md](operations.md)가 기준. 이 문서는 배포·테스트·운영의 **전략과 실행 계획**을 정의한다.

**표기 규칙** — **[확정]**: 현재 구성되어 동작 중. **[계획]**: 도입을 권장하는 미적용 항목. 각 절에서 두 상태를 구분해 표기한다.

---

## 1. 문서 개요

### 1.1 목적

본 문서는 로보시지 웹 서비스의 배포, 테스트, 운영 활동에 대한 실행 지침을 정의한다. 개발 완료된 기능을 안정적으로 운영 환경에 배포하고, 품질을 검증하며, 서비스 중단 없이 운영·복구하기 위한 절차와 책임을 명시하는 것을 목적으로 한다.

### 1.2 범위

프론트엔드(Astro), 백엔드 API(Hono on Netlify Functions), 데이터베이스·인증(Supabase), 콘텐츠 관리(Sveltia CMS + GitHub), 메일(Resend), 스케줄 배치(pg_cron)를 대상으로 한다. API 상세 명세([backend.md](backend.md), [specs/](specs/))와 프론트 컨벤션([frontend.md](frontend.md))은 비범위.

### 1.3 시스템 구성 요약

```
User ──HTTPS──▶ Netlify (roboseasy.ai)
                 ├─ 정적 페이지 (빌드 타임 프리렌더 ◀── GitHub main ◀── Sveltia CMS)
                 └─ /api/v1/* — Hono 단일 앱 (Netlify Functions)
                      ├──▶ Supabase (Auth + Postgres, RLS)  ◀── pg_cron 배치
                      └──▶ Resend (메일)
```

| 구성 요소 | 역할 | 제공/호스팅 | 상태 |
|---|---|---|---|
| Astro 4 | 정적 사이트 + hybrid SSR | Netlify | 확정 |
| Hono | 서버리스 API (회원·문의·관리자, 2차: 주문·결제) | Netlify Functions | **확정 (1차 완료)** |
| Supabase | PostgreSQL · Auth · RLS · pg_cron | Supabase Cloud (**Pro**) | **확정 (1차 완료)** |
| Sveltia CMS | 제품 카탈로그(products.json)·뉴스·docs | GitHub 저장소 | 확정 |
| Resend | 문의·알림 메일 발송 | Resend (무료 100통/일) | 확정 |
| GitHub Actions | CI 파이프라인 (테스트·린트 게이트) | GitHub | 계획 |

서버를 직접 운영하지 않는 서버리스 구성 → 인프라 장애 대응의 대부분은 Netlify/Supabase의 관리 영역이며, 우리의 운영 책임은 **①배포 품질 ②가용성 감시 ③데이터 백업 ④키 관리**에 집중된다.

---

## 2. 배포 전략 및 환경 구성

### 2.1 환경 구분

환경은 세 단계로 구분한다. 현재는 로컬 개발과 운영 두 환경이 동작 중이며, 스테이징은 도입 권장 항목이다.

| 환경 | 용도 | 구성 | 상태 |
|---|---|---|---|
| 개발 (Local) | 기능 개발·단위 검증 | 로컬 Astro dev (`npm run dev`) + Supabase 로컬(Docker) 또는 개발 프로젝트 | 확정 |
| 스테이징 (Preview) | 통합·E2E 검증, 배포 전 확인 | Netlify Deploy Preview + **스테이징 전용 Supabase 프로젝트** | 계획 |
| 운영 (Production) | 실사용자 서비스 | Netlify Production + Supabase 운영 프로젝트 (Pro) | 확정 |

- Netlify는 PR마다 Deploy Preview URL을 자동 생성하므로, 스테이징은 별도 인프라 없이 **Preview + 전용 Supabase 프로젝트(무료 조직)** 조합으로 낮은 비용에 구성할 수 있다.
- **현재 주의점 [확정]**: Deploy Preview가 운영 환경변수·운영 DB를 그대로 공유한다. 스테이징 정식화 전까지 Preview에서의 쓰기 테스트(가입·문의)는 운영 데이터에 남으므로 정리까지 감안할 것. 스테이징 정식화 = Netlify Deploy context별 환경변수(Preview에는 스테이징 Supabase 키) 분리가 핵심 작업.

### 2.2 배포 아키텍처 및 흐름

코드는 GitHub 단일 저장소에서 관리되며, main 브랜치 병합이 배포 트리거가 된다. 프론트와 API(Hono)가 한 번의 빌드로 함께 배포된다(catch-all 마운트 구조) — 별도 API 배포 절차 없음.

- **애플리케이션 배포**: GitHub main 병합 → Netlify 빌드(Astro) → Functions(Hono) 배포 → CDN 반영
- **콘텐츠 배포**: Sveltia CMS 편집 → GitHub main 직접 커밋 → Netlify 자동 재빌드 (검수 없음 — 운영 주의는 operations.md)
- **DB 스키마 배포**: `supabase/migrations/` → `supabase db push` 또는 SQL Editor 수동 적용 (자동 배포 아님 — §2.3.2)

### 2.3 배포 절차

#### 2.3.1 애플리케이션 — 현재 [확정]

Netlify의 Git 연동 자동 배포를 사용한다. main 브랜치에 병합되면 자동으로 빌드·배포된다.

> ① 기능 브랜치에서 개발 → ② PR 생성 → ③ Deploy Preview로 확인 → ④ main 병합 → ⑤ Netlify 자동 배포 → ⑥ 배포 후 스모크(랜딩 로드 + `/api/v1/health` 200, §4.2 신설 후)

#### 2.3.2 DB 마이그레이션 [확정 — 절차 준수]

코드(Netlify)와 DB(Supabase)는 배포 채널이 분리되어 있다.

- **순서 원칙: DB 먼저, 코드 나중** — 새 컬럼/테이블/RPC를 쓰는 코드가 배포되기 전에 마이그레이션을 먼저 적용 (반대 순서는 런타임 에러)
- 적용 후 확인: `cron.job` 등록·RLS 정책 등 (operations.md "스케줄 작업 확인" 쿼리)
- **호환 원칙**: 파괴적 변경(컬럼 삭제·이름 변경)은 "추가 → 코드 전환 → 다음 배포에서 제거" 2단계로

#### 2.3.3 개선 계획 — CI 품질 게이트 [계획]

배포 전 품질 게이트가 없다는 것이 현재 구성의 약점이다. GitHub Actions를 도입해 병합 전에 테스트·린트·타입체크를 강제하고, 통과한 코드만 배포되도록 한다.

| 단계 | 실행 내용 | 도구 | 실패 시 |
|---|---|---|---|
| Lint / Type | 코드 스타일·타입 검사 | ESLint · `astro check`(tsc) | 머지 차단 |
| Unit / Integration | 단위·통합 테스트 실행 | Vitest | 머지 차단 |
| Build | Astro 프로덕션 빌드 검증 | `astro build` | 머지 차단 |
| E2E (Preview 대상) | 핵심 시나리오 검증 | Playwright | 경고 후 검토 |
| Deploy | Netlify 배포 | Netlify | 롤백 (§2.5) |

### 2.4 환경변수 및 시크릿 관리

민감 정보는 코드 저장소에 포함하지 않으며, 각 플랫폼의 시크릿 저장소를 통해 주입한다. (전체 목록·미설정 시 증상: operations.md)

| 항목 | 저장 위치 | 비고 |
|---|---|---|
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Netlify 환경변수 | anon 키는 유저 토큰 클라이언트(RLS 적용) 생성용 — 서버에서만 사용 |
| `SUPABASE_SERVICE_ROLE_KEY` | Netlify 환경변수 | **서버 전용, 클라이언트 노출 절대 금지** (RLS 우회) |
| `RESEND_API_KEY`, `QUOTE_FROM/TO` | Netlify 환경변수 | 메일 발송 |
| `CRON_SECRET` | Netlify 환경변수 + Supabase Vault(`cron_secret`) | **양쪽 동일 값 유지** — pg_cron→API 인증 |
| (2차) `TOSS_SECRET_KEY` | Netlify 환경변수 | 결제 승인·취소 |
| (CI 도입 시) GitHub PAT 등 | GitHub Actions Secrets | 단일 저장소 최소 권한 원칙 |

- 세션은 httpOnly 쿠키로 서버 관리 — 클라이언트에 토큰·키를 저장하지 않는다.
- service_role 키는 유출 시 피해가 가장 크다. **노출 의심 시 즉시 재발급** — 절차는 §5.3 시나리오 6.
- 환경변수 변경 후에는 **재배포 필요** (Functions는 배포 시점 값을 스냅샷).

### 2.5 롤백 전략

| 대상 | 방법 | 소요 |
|---|---|---|
| 애플리케이션(프론트+API) | Netlify는 모든 배포를 보존 → 대시보드에서 이전 배포 **Publish deploy**(재빌드 없음) | 수 초~수 분 |
| 콘텐츠(CMS 오입력) | GitHub 커밋 revert 후 재빌드 (또는 CMS 재수정 저장) | 빌드 1회 |
| 데이터베이스 | **롤백하지 않고 전진 수정(forward fix)** 원칙. 데이터 손상 시에만 백업 복원(§5.3) | — |
| 환경변수 | 대시보드에서 원복 → 재배포 | 빌드 1회 |

**주의**: 코드만 롤백해도 DB는 롤백되지 않는다. 마이그레이션이 낀 배포를 되돌릴 땐 §2.3.2 호환 원칙(신 스키마 + 구 코드 공존 가능)이 지켜졌는지 먼저 확인.

---

## 3. 테스트 계획

> 현재 자동화된 테스트 없음 [계획]. 도입 완료 시 실행 절차는 operations.md "테스트" 섹션에 옮겨 적는다.

### 3.1 테스트 전략 개요

테스트 피라미드 원칙을 따른다. 빠르고 저렴한 단위 테스트를 다수 확보하고, 통합 테스트로 계층 간 연동을 검증하며, E2E는 핵심 사용자 시나리오에 집중한다. 모든 테스트는 CI(GitHub Actions, §2.3.3)에서 자동 실행되는 것을 목표로 한다.

| 구분 | 대상 | 도구 | 실행 시점 |
|---|---|---|---|
| 단위 (Unit) | 순수 함수·유틸·검증 로직 | Vitest | 커밋·PR |
| 통합 (Integration) | Hono 핸들러 ↔ Supabase | Vitest + 테스트 DB | PR |
| E2E | 브라우저 사용자 시나리오 | Playwright | PR(Preview)·배포 전 |

### 3.2 단위 테스트

외부 의존성이 없는 로직을 대상으로 하고, 외부 호출(Supabase·Resend)은 모킹한다. Hono는 서버 기동 없이 `app.request()`로 인메모리 요청 테스트가 가능 — `src/server/` 분리 구조의 이점.

- **대상 예시 (1차)**: 회원가입·문의 입력값 검증(누락·형식 오류 → 400), 인증/인가 분기(비로그인 401, 일반 유저의 `/api/v1/admin/*` 403), rate limit 분기(토큰 소진 429), cron 라우트 `CRON_SECRET` 불일치 401, 견적서 데이터 조립(`buildQuoteExcel`), API 응답 camelCase 매핑
- **대상 예시 (2차)**: 장바구니 합계·주문 금액 계산, product_sku 매핑
- **목표**: 핵심 유틸·검증 로직 커버리지 80% 이상

### 3.3 통합 테스트

Hono API 핸들러가 Supabase와 올바르게 연동되는지 검증한다 — 실제 요청-응답 흐름, RLS 정책, 인증 상태에 따른 접근 제어, 트리거 동작.

#### 3.3.1 테스트 DB 격리

- **운영 DB에서는 절대 테스트를 실행하지 않는다.** 운영(Pro 프로젝트)과 테스트를 프로젝트 단위로 분리: 테스트는 **로컬 Supabase(Docker, `supabase start`)를 기본**으로 하고, CI에서는 별도 무료 조직의 테스트 전용 프로젝트를 대안으로 사용
- 로컬 Supabase는 `supabase/migrations/`를 그대로 적용하므로 스키마·RLS·트리거가 운영과 동일하게 재현됨
- 무료 프로젝트는 일정 기간 미사용 시 자동 일시정지되므로, CI 실행 전 깨우거나 로컬 Supabase(CI에서 Docker) 사용

#### 3.3.2 테스트 후 데이터 정리

각 테스트는 **트랜잭션으로 감싸고 종료 시 롤백**하여 DB를 원상태로 되돌린다.

> **주의 — TRUNCATE 금지**: TRUNCATE는 롤백이 불가능하고, FK CASCADE로 연쇄 삭제(예: orders → order_items)를 유발할 수 있어 테스트 정리 용도로 부적합하다. 트랜잭션 롤백이 오염 원천 차단·속도 면에서도 우수하다.

#### 3.3.3 통합 테스트 검증 항목

| 검증 항목 | 시나리오 예시 |
|---|---|
| 인증 | 미인증 요청이 401을 반환하는가 |
| 권한(RLS) | 타 사용자의 profiles·contacts(2차: 장바구니·주문) 접근이 차단되는가 |
| 관리자 권한 | role=admin이 아닌 계정의 `/api/v1/admin/*` 접근이 403인가 |
| 가입 트리거 | auth 가입 → profiles 자동 생성 + 동의 일시 기록되는가 |
| rate limit | `consume_token` RPC 소진 시 429, anon의 `rate_limit_buckets` 직접 접근 차단되는가 |
| 오류 처리 | 잘못된 body가 400과 오류 메시지를 반환하는가 |
| (2차) 주문 생성 | 다중 상품 주문이 order_items에 정상 기록되는가 |

### 3.4 E2E 테스트

실제 브라우저에서 사용자 관점의 핵심 흐름을 검증한다. **Netlify Deploy Preview URL을 대상으로** 실행해 실제 배포 환경과 동일하게 확인한다(스테이징 DB 분리 §2.1 전제).

- (1차) 회원가입 → 로그인 → 로그아웃 / 정보수정 → 탈퇴
- (1차) B2C 문의 작성 → 마이페이지에서 본인 문의 확인
- (1차) B2B 문의하기 및 견적서 다운로드
- (1차) 관리자 로그인 → 회원·문의 목록 조회 → 문의 상태 변경
- (2차) 제품 조회 → 장바구니 담기 → 수량 변경 → 주문 → 결제(토스 테스트 키)
- (2차) 찜 추가 → 찜 목록 확인 → 삭제 / 관리자 주문 조회 → 배송 상태 변경

### 3.5 테스트 데이터 및 환경

- 테스트는 테스트 전용 Supabase(로컬 또는 별도 프로젝트)에서만 수행 (§3.3.1)
- 시드 데이터(테스트 계정 2개 — 일반/관리자, 샘플 제품 sku)를 스크립트로 준비하고, 각 테스트는 트랜잭션 롤백으로 정리
- 이메일 발송(Resend)은 테스트 환경에서 실제 발송 대신 **모킹** 사용 (무료 100통/일 예산 소모 방지 겸)

### 3.6 완료 기준 (Definition of Done)

- CI의 단위·통합 테스트가 모두 통과한다.
- 핵심 E2E 시나리오가 Preview에서 통과한다.
- 신규 기능에는 대응 테스트가 함께 추가된다.

---

## 4. 모니터링 및 로깅

### 4.1 모니터링 대상

| 대상 | 지표 | 도구 | 상태 |
|---|---|---|---|
| 웹 가용성 | 업타임·응답 상태·지연 | **n8n 외형 감시** (보조: UptimeRobot) | 계획 |
| 프론트 (Astro) | 빌드 성공·트래픽·대역폭 | Netlify 대시보드/빌드 알림 | 확정 |
| API (Hono 함수) | 함수 오류·응답 | Netlify Functions 로그 + `/api/v1/health` | 부분 (health 구현됨 — n8n 연동 계획) |
| 데이터베이스 | 쿼리 오류·연결·용량·egress | Supabase 대시보드/Logs | 확정 (수동 확인) |
| 스케줄 배치 | pg_cron 성공/실패 | `cron.job_run_details` + pg_net 응답 코드 | 확정 (수동 확인) |
| 오류 추적 | 런타임 예외·스택트레이스 | Sentry (무료 티어) | 계획 (2차 전 검토) |

### 4.2 가용성 모니터링 — n8n [계획]

n8n은 외부에서 주기적으로 HTTP 요청을 보내는 외형 감시 방식이므로, 프론트·API·Supabase 모두 URL만으로 감시 가능하다.

```
[Schedule Trigger 5분]
   ├─ HTTP Request: https://roboseasy.ai/            → 200 체크          (프론트/CDN)
   ├─ HTTP Request: https://roboseasy.ai/api/v1/health  → 200 + JSON 체크   (API 서버 + DB 연결)
   └─ HTTP Request: https://<project>.supabase.co/auth/v1/health → 200   (Supabase Auth, 선택)
        │
        ▼ (IF: 실패 또는 응답 지연 임계 초과)
   [알림 노드] 이메일 / Slack / Discord / Telegram 등
```

- **전제 — `GET /api/v1/health` [구현됨]**: 응답에 Supabase 연결 확인(products 1행 조회) 포함 → 호출 한 번으로 "Netlify Functions 생존 + DB 연결"을 동시 검증. 정상 200 `{ok, db}`, 장애 503 — 상태 코드만으로 판별. 인증 불필요, rate limit 제외 경로
- **prod·develop 각각 감시**: 배포(사이트)마다 Netlify Function이 별개이므로 `https://roboseasy.ai`와 `https://develop.roboseasy.ai`의 `/api/v1/health`를 모두 핑한다. 5분 이하 간격이면 부수 효과로 함수 인스턴스 워밍(콜드 스타트 ~2초 방지)도 겸한다
- **오탐 억제**: 1회 실패는 무시, **2회 연속 실패 시 알림**. 복구 시 회복 알림 1회
- **n8n 호스팅**: 자체 호스팅(Docker, 무료) 또는 n8n Cloud(유료). **n8n 자체가 죽으면 감시 공백** → 자체 호스팅 시 UptimeRobot(무료)이 n8n의 `/healthz`를 역감시하는 이중화 권장. n8n 운영이 부담이면 UptimeRobot 단독으로 시작하는 것도 유효한 대안
- **한계**: 외형 감시는 "느려짐·간헐 오류·내부 에러율"을 못 본다 — 그건 로그(§4.4)와 Sentry(계획)의 영역

### 4.3 알림 정책

| 이벤트 | 채널 | 대응 |
|---|---|---|
| 운영 사이트 다운 (n8n 2회 연속 실패) | 이메일/메신저 즉시 | **최우선 대응** — §5.3 시나리오 1·3·4 |
| Netlify 빌드 실패 | Netlify 이메일 알림 | 배포 차단이므로 당일 대응 (라이브는 기존 배포 유지) |
| Supabase 용량/쿼터 경고 | Supabase 메일 + 대시보드 | 주기 점검 (§4.6) |
| pg_cron 배치 실패 | 주간 점검으로 확인 (§4.6) | 파기 배치 실패는 보유기간 위반 소지 — 우선 대응 |

### 4.4 로그 관리

서버리스라 로그가 플랫폼별로 흩어지고 **보존기간이 짧다**. 어디에 어떤 로그가 있고 언제 사라지는지 인지하고, 오래 남길 것은 DB에 기록한다.

| 로그 | 위치 | 보존 | 용도 |
|---|---|---|---|
| API 함수 로그 (`console.log/error`) | Netlify → Logs → Functions | 짧음 (실시간 중심, 장기 보존은 Enterprise Log Drains 전용) | 배포 직후 에러 확인·실시간 디버깅 |
| 빌드 로그 | Netlify → Deploys | 배포 이력과 함께 | 빌드 실패 원인 |
| DB/Auth 로그 | Supabase → Logs | Pro 기준 약 7일 | 쿼리 에러·인증 실패 추적 |
| pg_cron 실행 이력 | `cron.job_run_details` | DB에 누적 | 배치 성공/실패 (operations.md 쿼리) |
| 비즈니스 이벤트 | 도메인 테이블 자체 (contacts 등) | 보유기간 정책대로 | 문의 접수·처리 이력은 DB가 원본 |

**운영 규칙**:
- 서버 코드의 에러는 반드시 `console.error`에 요청 경로·원인을 포함해 남긴다 (Netlify 로그에서 추적 가능한 유일한 수단)
- **민감정보(비밀번호·토큰·개인정보)는 로그에 남기지 않는다**
- 장기 추적이 필요한 운영 이벤트(메일 발송 실패, 2차: 결제 실패)는 로그가 아니라 **DB 컬럼/테이블에 상태로 기록** — 서버리스에서 가장 확실한 영속 기록
- 에러율·스택트레이스 수집이 필요해지는 시점(2차 결제)에 Sentry 무료 티어 도입 검토

### 4.5 트래픽 모니터링

| 도구 | 성격 | 비고 |
|---|---|---|
| Netlify 대시보드 [확정] | 대역폭·빌드 시간·Functions 호출량 | 플랜 한도 초과 감시 |
| Supabase 대시보드 [확정] | DB 용량·API 요청·Auth MAU·egress | Pro 한도 접근 시 메일 알림 |
| Netlify Analytics [계획] | 서버 사이드 집계 (유료, 월 $9) — JS·쿠키 없음 | 페이지뷰·404 목록. 개인정보 이슈 최소 |
| GA4 [계획] | 클라이언트 사이드 (무료) | 유입·행동 분석 필요 시. 쿠키 동의 → 개인정보처리방침 반영 필수 |

우선 기본 대시보드 + 월간 사용량 점검으로 시작하고, 필요가 생기면 Netlify Analytics(정확한 수치) 또는 GA4(행동 분석)를 추가한다.

### 4.6 점검 주기

| 주기 | 점검 항목 |
|---|---|
| 실시간(자동) | 업타임(n8n)·빌드 실패 알림 수신 |
| 주간 | pg_cron 실행 이력 (`cron.job_run_details`), Supabase 오류 로그 검토 |
| 월간 | Supabase 자동 백업 존재 확인, Netlify/Supabase 사용량·용량 점검, 의존성 보안 업데이트(`npm audit`) 확인 |
| 분기/2차 전 | 백업 복원 리허설 (§5.1) |

---

## 5. 백업 및 장애 복구 (운영)

### 5.1 백업 대상 및 정책

**원칙: 원본이 git인 것은 git이 백업이고, DB만 별도 백업이 필요하다.**

| 대상 | 방법 | 주기 | 보관 | 상태 |
|---|---|---|---|---|
| Supabase DB (profiles·contacts, 2차: orders·payments) | Pro 자동 백업 | 일 1회 | 7일 | 확정 (Pro 기본) |
| 〃 (플랫폼 외부 사본) | `pg_dump` GitHub Actions → 프라이빗 저장소/암호화 보관 | 주 1회 | 4주 순환 | 계획 |
| 제품 카탈로그·콘텐츠·코드 | GitHub 저장소 (버전 관리 자체가 백업) | 커밋 시 | 영구(이력) | 확정 |
| 환경변수/시크릿 | 키 목록·용도 문서화(operations.md, 값은 미기재) + 각 서비스에서 재발급 가능 | 변경 시 | 최신본 | 확정 |
| 문의 첨부(사업자등록증) | 수신 메일함이 원본 (DB 미저장 — 설계상 의도) | — | 보유기간 정책 | 확정 |

- Sveltia CMS의 제품 데이터는 GitHub에 커밋되므로 Git 이력 자체가 백업이다. 별도 백업보다 **저장소 보호(브랜치 보호·접근 제한)**가 중요하다.
- 보조 pg_dump의 목적: Supabase 계정/프로젝트 단위 사고(프로젝트 오삭제 등)에 대비한 플랫폼 외부 사본. 개인정보 포함이므로 접근 통제·보관 주기 명시.
- **PITR(Point-in-Time Recovery)**: 유료 애드온. 일 단위 백업(RPO 24h)으로 부족해지는 시점 = **결제·주문 데이터가 쌓이는 2차**에 도입 검토.
- **복원 리허설 [계획]**: 2차 오픈 전 1회 — 백업본을 별도 프로젝트에 복원해 절차·소요시간 확인. *한 번도 복원해보지 않은 백업은 백업이 아니다.*

### 5.2 복구 목표 (RTO / RPO)

초기 운영 규모를 전제로 한 목표값이며, 실사용 트래픽·판매(2차) 개시 시 재검토한다.

| 구분 | RTO (복구 시간 목표) | RPO (데이터 손실 허용) |
|---|---|---|
| 프론트/함수 | 수 분 (Netlify 롤백) | 0 (Git 기반) |
| 콘텐츠 | 수 분~1시간 (revert + 재빌드) | 0 (Git 기반) |
| 데이터베이스 | 1~2시간 (백업 복원) | 최대 24시간 (2차: PITR 도입 시 분 단위) |

### 5.3 장애 시나리오 및 대응

| # | 시나리오 | 감지 | 대응 |
|---|---|---|---|
| 1 | 사이트 접속 불가 | n8n 알림 | netlifystatus.com 확인 → 플랫폼 장애면 대기(정적 페이지는 CDN 캐시로 상당 부분 서빙 지속), 배포 문제면 이전 배포로 롤백(§2.5). DNS/도메인 만료 여부 확인 |
| 2 | 배포 후 기능 오동작 / API 오류 급증 | 스모크 실패, 함수 로그, (계획) Sentry | 최근 배포가 원인이면 즉시 롤백 → 원인은 로컬에서 수정 후 재배포. Supabase 장애 여부(연결·쿼터) 병행 확인 |
| 3 | 빌드 실패 (CMS 오입력 포함) | Netlify 빌드 실패 메일 | 라이브는 기존 배포 유지되므로 급하지 않음. 원인 커밋 revert 또는 CMS 재수정 |
| 4 | Supabase 장애 | n8n `/api/v1/health` 실패 | status.supabase.com 확인 → 대기. 정적 페이지는 정상 — 로그인·문의만 영향. 장기화 시 문의 폼에 안내 문구 |
| 5 | DB 손상/오조작 (잘못된 삭제·업데이트) | 운영 중 발견 | Supabase Backups에서 복원. **주의: 복원은 DB 전체를 해당 시점으로 되돌림** — 이후 발생분(신규 가입·문의) 유실 감수 판단 → 가능하면 백업본을 **별도 프로젝트에 복원해 해당 행만 추출·수동 반영**. 복원 후 통합 테스트로 정합성 확인 |
| 6 | 시크릿 유출 (service_role 키 등) | 코드 리뷰·이상 트래픽 | 즉시 로테이션: Supabase API 키 재발급 → Netlify 환경변수 교체 → 재배포. `CRON_SECRET`은 Vault(`cron_secret`)와 Netlify **양쪽 동시 교체**. Resend 키 재발급 |
| 7 | Resend 발송 예산 소진 | 문의 접수 후 메일 미수신 | 자동 처리됨 — B2B는 DB 접수 저장 + 안내, 배치는 이월 (operations.md). 반복 시 유료 전환 + `consumeEmailBudget` 상향 |
| 8 | pg_cron 배치 실패 | 주간 점검 (§4.6) | operations.md의 확인·수동 실행 절차. **파기 배치 실패는 개인정보 보유기간 위반으로 이어지므로 우선 대응** |

### 5.4 복구 절차 원칙

> ① 영향 범위 파악 → ② 사용자 영향 최소화 (**롤백 우선**, 원인 분석은 그다음) → ③ 근본 원인 분석 → ④ 정식 수정·재배포 → ⑤ 사후 기록 (장애 노트 — .agent/issues.md, 기술적 결정 변경 수반 시 ADR)

장애 대응 후에는 원인과 조치를 기록으로 남겨 재발을 방지한다.

**상태 페이지**: [Netlify](https://www.netlifystatus.com/) · [Supabase](https://status.supabase.com/) · [Resend](https://resend-status.com/)

---

## 6. 부록: 확정 / 계획 항목 요약

본 문서에서 [계획]으로 표기한 항목의 도입 우선순위. (v1.0의 "Supabase·Hono 구축"은 1차 개발로 **완료**되어 제외)

| 항목 | 우선순위 | 기대 효과 | 참조 |
|---|---|---|---|
| `GET /api/v1/health` 라우트 신설 | **완료** | 가용성 감시의 전제 — Functions+DB 동시 검증 | §4.2 |
| n8n 가용성 감시 워크플로 (+UptimeRobot 이중화) | 높음 | 다운타임 즉시 인지 | §4.2 |
| GitHub Actions CI (테스트·린트 게이트) | 높음 | 배포 전 품질 보증, 회귀 방지 | §2.3.3 |
| 단위·통합 테스트 구축 (Vitest, 테스트 DB 격리) | 높음 | 안정성·리팩터링 안전성 | §3.2–3.3 |
| 보조 pg_dump 백업 (GitHub Actions 주 1회) | 중간 | 플랫폼 외부 사본 확보 | §5.1 |
| E2E 테스트 (Playwright, Preview 대상) | 중간 | 핵심 시나리오 배포 전 검증 | §3.4 |
| 스테이징 정식화 (Preview + 전용 Supabase) | 중간 | 운영 DB와 분리된 실환경 검증 | §2.1 |
| Sentry 오류 추적 | 중간 (2차 전) | 런타임 예외 신속 감지 | §4.4 |
| PITR 애드온 + 복원 리허설 | 2차 착수 시 | 결제 데이터 RPO 분 단위 확보 | §5.1 |
| 트래픽 분석 도구 (Netlify Analytics 또는 GA4) | 낮음 (필요 시) | 정확한 트래픽·유입 분석 | §4.5 |

> 요금·보존기간 수치(Netlify Analytics $9, Supabase 로그·백업 7일 등)는 작성 시점(2026-07) 기준 — 도입 시 각 서비스 요금 페이지 재확인.

*— 문서 끝 —*
