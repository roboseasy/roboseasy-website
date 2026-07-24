# 백엔드 개발 기획서 — 로보시지 판매 사이트

기존 회사 웹사이트(Astro 정적 사이트)에 판매 기능을 덧붙이는 방식으로 개발한다.

- **1차**: 회원(가입/로그인/탈퇴/정보수정) + 관리자 시스템
- **2차**: 토스 페이먼츠 기반 주문·결제 시스템 (장바구니/찜/주문/배송 관리)

> 원본 산출물: 노션(요구사항·기능·API 명세서), roboseasy.sql(ERD), drawio(시스템 아키텍처, 결제 플로우차트, 유저 로그인·회원가입 시퀀스). 본 문서는 이를 코드베이스 현황과 통합 정리한 것.
> 확정 사항을 반영한 명세서 최신본: [.agent/specs/](specs/) (노션 DB 최신화용 CSV 3종)

---

## 1. 시스템 아키텍처

```
User ──HTTPS──▶ Netlify (Astro hybrid)
                  ├─ 정적 페이지 (빌드 타임 콘텐츠 ◀── GitHub ◀── Sveltia CMS)
                  └─ API 요청 ──▶ Hono (서버 라우트)
                                    ├──▶ Supabase (Auth + Postgres DB)
                                    └──▶ Resend API (메일 발송)
```

- **프론트**: Astro (기존 사이트에 판매 페이지 추가, `output: 'hybrid'`)
- **API 레이어**: Hono 단일 앱으로 모든 API 관리. 기존 `src/pages/api/contact.ts`(Resend), `quote-download.ts`(exceljs)도 Hono 라우트로 이식 (`buildQuoteExcel` 등 lib은 재사용, 라우팅 껍데기만 교체)
- **인증/DB**: Supabase (Auth: 이메일 가입·로그인, DB: Postgres + RLS)
- **메일**: Resend (문의 메일 — 구현 완료)
- **배포**: Netlify (서버 라우트는 Netlify Functions로 변환됨)
- **스케줄 배치**: Supabase pg_cron — DB 내 배치(contacts 보유기간 파기, rate limit 버킷 정리)는 직접 실행, 메일 발송이 필요한 배치(마케팅 수신동의 재확인)는 pg_net으로 `POST /api/v1/cron/*`(CRON_SECRET Bearer)를 호출해 Hono/Resend 레이어에서 처리

### Hono 통합 방식 (확정)

Astro catch-all 라우트 마운트 방식: `src/pages/api/[...path].ts`에서 `app.fetch(request)`로 위임하고, **Hono 앱 본체는 `src/server/`에 프레임워크 독립적으로 배치**한다. `npm run dev` 하나로 페이지+API 동시 개발이 가능하고 프론트와 API가 한 번에 빌드·배포되며, 나중에 별도 함수나 외부 호스트로 분리할 때도 마운트 파일 하나만 바꾸면 된다.

**URL 버저닝**: 모든 API는 `/api/v1/*`로 서빙된다 (`new Hono().basePath('/api/v1')`). 구 `/api/*` 경로는 JSON 404. 모니터링용 `GET /api/v1/health`(인증 불필요)가 함수 생존 + DB 연결(products 1행 조회)을 한 번에 확인한다 — 정상 200 `{ok, db}`, 장애 503.

### 인증 방식
- Supabase Auth 사용: `signUp()` / `signInWithPassword()` / `updateUser()` / 탈퇴는 서버에서 service role로 — 주문 이력 없으면 `admin.deleteUser()`, 있으면 `admin.updateUserById()`로 이메일 스크램블 + ban (§6 탈퇴 정책)
- 세션은 **httpOnly 쿠키**로 서버에서 관리 (클라이언트 localStorage 저장 금지)
- 로그인 성공 시 `profiles.role` 조회 → 일반/관리자 구분
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 환경변수 전용, 클라이언트 노출 금지

---

## 2. 데이터 모델 (ERD)

**적용 기준: `supabase/migrations/`** (PostgreSQL, 테이블 10개 — [roboseasy-erd.sql](roboseasy-erd.sql)은 초기 8테이블 설계 기록). 원본 `roboseasy.sql`(v1, MySQL) 대비 변경:

| 테이블 | 주요 컬럼 | 비고 |
|---|---|---|
| profiles | user_id(PK, FK→auth.users), user_email(UQ), user_name, user_phone, user_postcode, user_address, user_address_detail, role, marketing_consent(+_at), marketing_reconfirmed_at, terms_agreed_at, privacy_agreed_at, withdrawn_at | **Users 테이블 제거** — user_id = `auth.users.id`, ON DELETE CASCADE. 동의 일시는 분쟁 증빙용(가입 시점 = 동의 시점, default now()). marketing_consent_at은 2년 주기 재확인 기준점(동의·철회 시 갱신), marketing_reconfirmed_at은 재확인 안내 발송 시점(§3 스케줄러). withdrawn_at은 익명화 탈퇴(주문 이력 보유) 표시 — 거래기록의 논리적 분리 보관, 관리자 활성 회원 목록에서 제외 |
| products | product_sku(PK), product_name, category, product_price, is_active, description | JSON(Sveltia)이 원본, DB는 미러 — 아래 "products 동기화" 참조. 재고 관리 없음 |
| cart_items | cart_id(PK), user_id(FK), product_sku(FK), quantity | UNIQUE(user_id, product_sku) |
| dibs | dibs_id(PK), user_id(FK), product_sku(FK) | 찜. UNIQUE(user_id, product_sku) |
| **deliveries** | delivery_id(PK), user_id(FK, ON DELETE CASCADE), delivery_label(선택), receiver_name, receiver_phone, postcode, address, address_detail | **신설** — 회원 배송지 주소록(회원당 최대 10개, API에서 제한). 주문서에서 불러 쓰는 용도일 뿐이고 **주문의 배송지는 orders 스냅샷이 원본** — 여기 행을 수정·삭제해도 접수된 주문은 변하지 않는다. RLS는 본인 행만(cart_items·dibs와 동일, 관리자 예외 없음) |
| orders | order_id(PK), user_id(FK), total_price, status, 배송 스냅샷(receiver_name/receiver_phone/shipping_postcode/shipping_address/shipping_address_detail), courier, tracking_number | status: `PENDING→PAID→SHIPPING→DELIVERED / CANCELLED` (CHECK) |
| order_items | oitem_id(PK), order_id(FK), product_sku(FK), quantity, unit_price | 주문 시점 단가 스냅샷 |
| **payments** | payment_id(PK), order_id(FK), payment_key(UQ), amount, method, status, requested_at/approved_at/canceled_at, cancel_reason, receipt_url, raw_response(jsonb) | **신설** — 토스 승인·취소 기록. status는 토스 상태값 그대로 (CHECK) |
| **contacts** | contact_id(PK), **channel(b2b/b2c)**, user_id(FK, null 허용·**ON DELETE SET NULL**), order_id(FK, null 허용), product_sku(FK, null 허용), contact_type, name, email, phone, org, message, is_dispute, status | **신설** — B2B·B2C 문의 공용(입구 2개, 테이블 1개). 법정 보유기간 관리(일반 1년 / 불만·분쟁 3년, is_dispute로 구분) — pg_cron 매일 `purge_expired_contacts()`가 updated_at 기준 만료 건 자동 파기. 첨부는 DB 미저장(메일 전용). 관리자 전체 조회, 회원은 본인 b2c 문의만 조회(마이페이지). user_id SET NULL로 문의 이력이 회원 hard delete를 막지 않음 — 탈퇴 시 개인정보 처리는 §6 |
| **rate_limit_buckets** | bucket_key(PK), tokens, updated_at | **신설** — Token Bucket 상태(서버리스 인스턴스 간 공유, §7). RLS 정책 없음 = 전면 차단, `consume_token` RPC(service role 전용)로만 접근. 유휴 버킷은 pg_cron 매일 정리 |

주요 설계 결정:
- **Users 미러 테이블 없음**: `auth.users`가 원본. 이메일은 관리자 목록 조회용으로 `profiles.user_email`에 복사(가입 트리거에서 기록, 이메일은 수정 불가라 동기화 불필요)
- **명명은 snake_case**: Postgres는 따옴표 없는 식별자를 소문자로 접으므로 camelCase 유지 불가 — API 응답에서 camelCase로 매핑
- **토스 orderId = orders.order_id(uuid)** 그대로 사용 — 토스 허용 형식(6~64자 영숫자·`-`·`_`)에 uuid가 부합하므로 별도 주문번호 컬럼 불필요
- **결제 재시도 허용**: payments.order_id는 UNIQUE 아님(실패 후 재시도 시 행 추가), payment_key만 UNIQUE
- 주소는 우편번호 + 기본주소(카카오 우편번호 서비스로 채움, 프론트에서 읽기전용) + 상세주소(직접 입력) 3필드. 배송지는 주문 시점 스냅샷으로 orders에 저장 (profiles 주소 변경과 무관하게 보존). orders.user_id는 거래기록 5년 보관 의무 때문에 CASCADE 삭제 없음 — 탈퇴 정책은 §6 확정 사항 참조
- 가입 트리거(auth.users insert → profiles 생성)·updated_at 트리거·RLS 정책: [roboseasy-trigger-rls.sql](roboseasy-trigger-rls.sql) — 스키마 적용 후 실행. 일반 요청은 유저 토큰(RLS 적용), 주문 생성·결제 승인·상태 전이·회원탈퇴는 service role(RLS 우회 — 주문·품목 insert 정책은 금액 위조 심층 방어로 제거됨, 20260716000000 마이그레이션)

### products 동기화 (JSON → DB) — 구현됨 (`scripts/sync-products.mjs`)

Sveltia CMS는 Git 기반 백엔드(GitHub/GitLab/Gitea)만 지원하고 DB 백엔드는 로드맵상 우선순위 아님 — CMS가 DB를 직접 관리하는 방법은 없다. 따라서:

- **원본(SoT)은 `src/data/products.json`** — 지금처럼 Sveltia CMS로 관리 (이미지·갤러리 등 표시용 필드 포함)
- **DB products는 거래용 미러**: 주문 FK·서버 금액 검증에만 사용. 표시용 필드는 DB로 옮기지 않음
- **동기화**: Netlify 빌드 시 스크립트가 products.json을 Supabase에 upsert (service role 키). 매핑: `id → product_sku`, `name → product_name`, `price → product_price`, `summary → description`
- **삭제 대신 비활성화**: JSON에서 빠진 제품은 주문 이력 FK 때문에 delete 불가 → `is_active = false` 처리. 주문 API는 `is_active = true`인 제품만 허용

동기화 스크립트 규칙:
1. **is_active 파생**: `is_active = (price > 0) AND (comingSoon != true) AND (JSON에 존재)` — JSON에 is_active 필드는 없음. CMS 안내("출시 예정은 price 0 + 곧 출시")와 맞물려 미출시 제품 판매가 자동 차단됨
2. **중복 id 방어**: JSON 내 중복 id 발견 시 **빌드 실패** 처리 (Sveltia는 항목 간 unique 검증을 못 함. 형식은 CMS `pattern`으로 검증: `^[a-z0-9-]{1,50}$`)
3. **id는 판매 시작 후 불변**: id 변경 = DB에선 신규 sku 생성 + 옛 sku 비활성화이며, 기존 주문·장바구니·찜 FK는 옛 sku에 남음 (CMS hint에 경고 명시)
4. 정적 페이지 가격과 DB 가격이 같은 커밋·배포에서 나오므로 불일치 최소화
5. **실행 가드**: Netlify `CONTEXT=production` 빌드에서만 자동 실행(netlify.toml — develop·Preview 빌드가 prod DB를 덮어쓰지 않도록 스킵). 로컬은 `npm run sync-products`(.env → 테스트 DB). 검증 실패(중복·형식 오류 id)는 exit 1 = 빌드 실패

---

## 3. API 명세

기본 응답: JSON, 인증 필요 API는 세션 쿠키 검사. 관리자 API는 추가로 `role = admin` 검사.

### 회원 (1차)
| 기능 | Method | Path | 상태 |
|---|---|---|---|
| 회원가입 | POST | /api/v1/users/signup | 구현됨 — 약관·개인정보 동의 필수 검증, 중복 이메일 409 |
| 로그인 | POST | /api/v1/users/login | 구현됨 — httpOnly 쿠키 발급 + role 반환 |
| 로그아웃 | POST | /api/v1/users/logout | 구현됨 — 리프레시 토큰 폐기 + 쿠키 삭제 |
| 내 정보 조회 | GET | /api/v1/users/me | 구현됨 (마이페이지 초기값용 — 원 명세에 없어 추가) |
| 회원정보 수정 | PATCH | /api/v1/users/me | 구현됨 — 마케팅 동의 변경 시 marketing_consent_at 갱신 |
| 회원탈퇴 | DELETE | /api/v1/users/me | 구현됨 — §6 정책(주문 유무 분기 + 문의 기록 처리) |
| 비밀번호 변경 | PATCH | /api/v1/users/password | 구현됨 — 현재 비밀번호 재확인(signInWithPassword) 후 변경 (마이페이지) |
| 비밀번호 재설정 요청 | POST | /api/v1/users/reset-password-request | 구현됨 — 재설정 메일 발송. 미가입 이메일도 성공 응답(계정 존재 탐색 차단) |
| 비밀번호 재설정 확정 | POST | /api/v1/users/reset-password | 구현됨 — 메일 링크의 복구 토큰(1회용·1시간)으로 변경. /reset-password 페이지 |
| 마케팅 수신거부 | GET | /api/v1/marketing/unsubscribe | 시작 전 (서명 토큰 방식, 로그인 불필요 — 광고 메일 본문의 수신거부 링크용. 기존 POST /api/v1/marketing 대체) |

### 문의 — 입구 2개(B2B/B2C), 저장은 contacts 테이블 하나(channel 구분)

**B2B — 기존 `/contact` 폼** (기관·기업, 비로그인 허용, 견적서·사업자등록증 첨부):
| 기능 | Method | Path | 상태 |
|---|---|---|---|
| 문의하기 | POST | /api/v1/contact | **완료 (Hono 이식됨)** — contacts insert(b2b) 포함, 메일 HTML 전 필드 이스케이프 |
| 견적서 다운로드 | POST | /api/v1/quote-download | **완료 (Hono 이식됨)** (원 명세의 GET은 오기 — 구현은 POST) |

이식 원칙: 경로·요청/응답 스펙은 그대로 유지(프론트 수정 없음). 메일 HTML·`buildQuoteExcel` 등 로직은 `src/lib/`에서 재사용하고 라우트 핸들러만 Hono로 교체. 이식 완료 후 기존 `src/pages/api/contact.ts`, `quote-download.ts` 삭제. 이식 시 메일 발송과 함께 **contacts insert(channel='b2b')** 추가 — 첨부파일은 메일 첨부로만 전달하고 DB 미저장.

**B2C — 판매 사이트 개인 문의** (로그인 전용, products 페이지·마이페이지에서 진입):
| 기능 | Method | Path | 상태 |
|---|---|---|---|
| 개인 문의 등록 | POST | /api/v1/inquiries | 구현됨 — profiles에서 이름·연락처 자동, [개인문의] 알림 메일, FK 오류 400 |
| 내 문의 내역 (마이페이지) | GET | /api/v1/inquiries | 구현됨 — RLS(contacts_select_own_b2c)로 본인 것만 |

- 이름·연락처는 입력받지 않고 서버가 세션의 profiles에서 채움. 폼은 유형(제품/배송/AS/환불)·문의 내용·제품 선택(product_sku)만
- 접수 시 운영 알림 메일 병행 발송(제목 `[개인문의]` prefix, 첨부 없음) — B2C는 DB가 기록 원본, 메일은 알림
- 주문 연계(orderId 선택) 구현됨 — 본인 주문만 연결 가능(검증 후 contacts.order_id 저장), 내역 응답에 orderId 포함. 불만·분쟁 표시(is_dispute)·처리 상태는 관리자가 갱신

### 쇼핑 (2차)
| 기능 | Method | Path | 상태 |
|---|---|---|---|
| 장바구니 조회/추가 | GET / POST | /api/v1/cart_items | 구현됨 — POST 중복 담기는 수량 합산(상한 99), is_active 제품만, products 조인 응답 |
| 장바구니 수정/삭제 | PATCH / DELETE | /api/v1/cart_items/{id} | 구현됨 — RLS 본인 행만(타인·없는 id는 404) |
| 찜 조회/추가 | GET / POST | /api/v1/dibs | 구현됨 — 중복 찜은 멱등 성공. 미출시(is_active=false) 제품도 찜 허용(출시 대기 용도) |
| 찜 삭제 | DELETE | /api/v1/dibs/{id} | 구현됨 |
| 배송지 주소록 조회/추가 | GET / POST | /api/v1/deliveries | 구현됨 — 회원당 최대 10개. 배송지명·상세주소는 선택, 우편번호는 5자리 검증 |
| 배송지 수정/삭제 | PATCH / DELETE | /api/v1/deliveries/{id} | 구현됨 — PATCH는 전체 필드 교체(우편번호·주소가 한 벌), RLS 본인 행만(타인·없는 id는 404) |
| 주문 생성 | POST | /api/v1/orders | 구현됨 — 서버가 DB 단가로 재계산(+배송비 3,000원 정액, `src/data/shipping.ts`), PENDING + order_items 단가 스냅샷, 배송지 5필드 스냅샷 |
| 주문 내역 | GET | /api/v1/orders | 구현됨 — 본인 것만(RLS), 품목·제품명 조인 |
| 주문 단건 조회 | GET | /api/v1/orders/{id} | 구현됨 — 본인 전용. PENDING 재결제 모드(`/checkout?orderId=`)의 주문서 로드용 |
| 주문 취소 | POST | /api/v1/orders/{id}/cancel | 구현됨 — 상태 분기: PENDING+payments 없음 → 삭제(failUrl 복귀 정리 겸용) / PENDING+payments 있음 → CANCELLED / PAID → 토스 취소 + CANCELLED / 배송 시작 후 400, CANCELLED 멱등 |
| 결제 승인 | POST | /api/v1/payments/confirm | 구현됨 — 가드(본인·PENDING·금액 일치) 후 토스 승인, payments 기록(raw_response 포함) + PAID 전이 + 장바구니 제거. 이미 PAID면 멱등 성공. ⚠️ 실제 토스 승인·취소 호출은 테스트 키 발급 후 검증 필요 |
| 토스 웹훅 | POST | /api/v1/payments/webhook | 2차 후순위 (가상계좌 제외로 필수 아님 — confirm 응답 유실 대비 상태 동기화 안전망) |

### 관리자 (1차)

별도 관리자 로그인 없음(확정) — 일반 로그인 후 `/api/v1/admin/*` 전체에 미들웨어 체인 `requireAuth → requireAdmin`(세션 검증 → profiles.role = 'admin' 검사) 적용.

| 기능 | Method | Path | 상태 |
|---|---|---|---|
| 전체/개별 주문 조회 | GET | /api/v1/admin/orders, /api/v1/admin/orders/{id} | 구현됨 — status 필터, 상세는 order_items 포함. `q` 검색: `@` 포함=주문자 이메일(profiles 조인 ilike) / hex 4~8자=주문번호 프리픽스(uuid 범위) / 그 외=수령인 이름 ilike |
| 전체/개별 유저 조회 | GET | /api/v1/admin/users, /api/v1/admin/users/{id} | 구현됨 — 페이지네이션(50/페이지). `q` 검색: 이름·이메일 ilike |
| 주문 배달 관리 | PATCH | /api/v1/admin/orders/{id}/delivery | 구현됨 — 전이 규칙: PAID→SHIPPING(택배사·운송장 필수), SHIPPING→DELIVERED. 운송장은 관리자가 /manage에서 수동 입력. **status 없이 trackingNumber만 보내면 상태 전이 없이 운송장만 정정**(오기입 수정 — /manage의 SHIPPING 행 "배송 수정" 버튼) |
| 문의 내역 조회 (B2B·B2C) | GET | /api/v1/admin/contacts | 구현됨 — channel·status·is_dispute 필터 |
| 문의 상태 관리 | PATCH | /api/v1/admin/contacts/{id} | 구현됨 — 상태 전이 + is_dispute 표시(보유기간 1년/3년 구분 장치) |

### 스케줄러 (pg_cron 전용 — 브라우저 진입 없음)

| 기능 | Method | Path | 상태 |
|---|---|---|---|
| 마케팅 수신동의 2년 재확인 발송 | POST | /api/v1/cron/marketing-reconfirm | 구현됨 — CRON_SECRET Bearer 인증(pg_net 서버-서버 호출, CSRF 검증 예외). 매월 1일 실행, 대상: 최종 확인 시점(marketing_reconfirmed_at, 없으면 marketing_consent_at)이 2년 경과한 수신동의 회원. 발송 성공 시 marketing_reconfirmed_at 갱신, 실패·메일 예산 소진 건은 다음 실행에서 재시도 |

CRON_SECRET은 Netlify 환경변수 + Supabase Vault(`cron_secret`)에 동일 값으로 설정 — pg_cron job이 Vault에서 읽어 Bearer로 전달. DB 내부에서 끝나는 배치(contacts 파기·버킷 정리·**PENDING 주문 정리** — `cleanup_pending_orders()`, 15분 간격, 20260720010000 마이그레이션)는 HTTP 없이 pg_cron이 직접 실행.

---

## 4. 주요 플로우

### 유저 로그인 (시퀀스 — drawio 기준)
1. User → Web: 로그인 요청 → 프론트 Form 검증 (`opt` 실패 시 실패 표출)
2. Web → Hono: 로그인 요청
3. Hono → Supabase: `signInWithPassword()` 호출 → 계정 데이터 검증
4. `alt` 성공: 세션 반환 → Hono가 Profiles에서 role 조회 → 세션 쿠키(httpOnly) 생성 → 성공 응답 → 로그인 성공 표출
5. `alt` 실패: 검증 실패 반환 → 로그인 실패 표출

### 유저 회원가입 (시퀀스 — drawio 기준)
1. User → Web: 회원가입 요청 → 프론트 Form 검증 (`opt` 실패 시 실패 표출)
2. Web → Hono: 회원가입 요청
3. Hono → Supabase: `signUp()` 호출
4. Supabase 내부: user insert 시 **Profiles 행 자동 생성** (`auth.users` insert 트리거 — 가입 폼의 이름/전화/주소는 `signUp()`의 `options.data`(user_metadata)로 전달 → 트리거에서 복사)
5. Supabase → User: 이메일 검증 요청 (확인 메일 발송, `emailRedirectTo` URL 지정)
6. User → Supabase: 확인 링크 클릭 → 이메일 검증
7. Supabase → Hono → Web → User: 성공 여부 반환 → 회원가입 성공여부 표출

구현 메모:
- 이메일 미확인 상태의 로그인 차단은 Supabase 기본 동작(Confirm email 활성화) 사용
- 다이어그램에 `signUp()` 실패 분기(이메일 중복 등)가 없음 — 구현 시 실패 응답 → 가입 실패 표출 분기 추가
- 5~7 단계는 실제로는 비동기: `signUp()` 응답 시점에 "확인 메일 안내"를 먼저 표출하고, 링크 클릭 후에는 `emailRedirectTo` 페이지로 리다이렉트되어 완료를 표출하는 두 단계로 구현됨

### 결제 (2차 — 토스 페이먼츠)
제출된 플로우차트는 일반 PG 구조(고객→가맹점→PG→VAN→카드사, 인증 실패 시 opt) 설명이며, 실제 구현은 토스 결제위젯 표준 플로우를 따른다:

1. 주문서 페이지: 서버에 주문 생성(POST /api/v1/orders, status=PENDING) → **서버가 금액 재계산** (클라이언트 금액 신뢰 금지)
2. 토스 결제위젯 호출 (orderId, amount) — 결제수단은 카드·간편결제만(가상계좌 미지원)
3. 결제 인증 성공 → successUrl로 리다이렉트 (paymentKey, orderId, amount 쿼리)
4. 서버: 주문이 존재하고 **PENDING 상태인지 검사(가드)** → 주문 금액 == amount 검증 → 토스 **결제 승인 API** 호출 (`POST /v1/payments/confirm`, 시크릿 키). 이미 DONE인 주문이면 성공 응답(멱등 — successUrl 새로고침 대응)
5. 승인 성공: payments 기록 + orders.status=PAID + **주문 품목을 장바구니에서 제거** → 주문 완료 페이지 표시 (**약관 제12조 수신확인통지 역할** — 주문번호·품목·금액 표시) / 실패: 주문 실패 처리
6. 주문 취소(`POST /api/v1/orders/{id}/cancel` — 상태 분기): PAID면 토스 결제 취소 API 호출 후 CANCELLED (배송 전만 허용 — ORD-10) / PENDING + payments 없음이면 주문 삭제(아래 정리와 동일 규칙)

미결제(PENDING) 주문 정리 — 클라이언트 즉시 정리 + 시간 기반 배치(확정):
- **주문서 이탈 즉시 정리**(`src/pages/checkout.astro`): 결제창을 닫거나(USER_CANCEL) 주문서를 벗어날 때 `POST /api/v1/orders/{id}/cancel?mode=abandon`. 페이지 종료 경로는 `pagehide` + `navigator.sendBeacon`(응답을 기다릴 수 없음). **결제창으로 리다이렉트하는 순간은 이탈로 보지 않고**(플래그), 재결제 모드(`?orderId=`)는 기존 주문을 지우면 안 되므로 대상에서 제외. `mode=abandon`은 결제 시도가 없는 주문만 삭제하므로 승인 직전/직후에 창이 닫혀도 결제된 주문은 사라지지 않는다
- **pg_cron 15분 간격**: 생성 후 **2시간** 경과한 PENDING 주문 중 ① payments 행 없음 → **DELETE**(order_items는 CASCADE, 계약 미성립 건이라 보존 의무 없음) ② payments 행 있음(승인 실패 ABORTED만) → **CANCELLED 전이**(결제사 대사·분쟁 기록 보존, FK도 삭제를 막음). DONE·IN_PROGRESS가 있으면 자동 취소 제외(돈 묶임 방지 — 20260715020000). 위 즉시 정리가 유실된 경우(탭 강제 종료 등)를 회수하는 안전망이라 주기를 짧게 잡되, 주문서를 오래 열어 둔 사용자의 주문이 결제 직전에 사라지지 않도록 2시간 여유를 둔다 (20260720010000)
- failUrl 복귀 페이지에서도 `POST /api/v1/orders/{id}/cancel?mode=abandon` 호출 (별도 엔드포인트 없이 취소 API의 PENDING 분기 재사용)
- 4번의 PENDING 가드가 안전망: 삭제된 orderId로 늦게 도착한 confirm은 "주문 없음"으로 거부

---

## 5. 마일스톤

### 1차 — 회원·관리자
1. ✅ Supabase 프로젝트 셋업(서울 리전), 스키마+트리거·RLS 적용 — `supabase/migrations/`가 적용 기준(CLI db push), `.agent/*.sql`은 설계 기록. 가입 트리거·Auth 설정(Confirm email, Redirect URL) 검증 완료
2. ✅ Hono 마운트(§1) — 앱 본체 `src/server/app.ts`, 마운트 `src/pages/api/[...path].ts`. contact·quote-download 이식 + contacts insert(b2b) + 메일 이스케이프 + AS 필드(구매자 여부·구매 날짜) 메일 표기 추가. 검증: dev 서버에서 견적 xlsx 생성·검증 400·404 확인 (실메일 발송은 배포 후 확인 필요)
3. ✅ 회원 API (`src/server/routes/users.ts` + `middleware/auth.ts` — requireAuth·토큰 자동 갱신). e2e 19건 통과: 가입 트리거(metadata 복사·동의 일시), 로그인(쿠키·role)·오입력 401, 조회·수정(marketing_consent_at)·변조 거부, 탈퇴(hard delete·문의 익명화·분쟁 보존·세션 무효). **미검증 잔여**: 실메일 확인 플로우(가입 페이지 구현 후), 주문 이력 있는 탈퇴(익명화 경로 — 2차 주문 API 이후). ⚠️ supabase-js는 Node 20에서 `ws` transport 필요(`src/server/lib/supabase.ts` 주석 참고)
4. ✅ 관리자 API (`src/server/routes/admin.ts` + requireAdmin) — 유저 조회 2종, 주문 조회 2종(1차엔 빈 목록), 문의 관리 2종(channel·status·is_dispute 필터 + 상태·분쟁 갱신). e2e 14건 통과: 비로그인 401·일반 유저 403 경계, 404·400 검증 포함. 배달 관리(PATCH delivery)는 배송 정책 확정 후 2차
5. ✅ 회원 관련 페이지 (라이트 테마, 1차 디자인 — 사용자 재디자인 예정): `/login`·`/signup`(약관 분리 동의 + 국외 이전 고지 문구), `/mypage`(내 정보·문의하기/내역·탈퇴·로그아웃), `/manage`(관리자 — 문의 관리·유저·주문. **`/admin`은 Sveltia CMS 경로라 사용 불가**), 헤더 로그인 상태 전환(rb-auth 표시 쿠키). ⚠️ 가입 폼의 /terms·/privacy 링크는 약관 페이지 게시 전까지 404
6. ✅ B2C 개인 문의 API (`src/server/routes/inquiries.ts`) — e2e 10건 통과: 등록(profiles 자동 기입·b2c 채널·RECEIVED), B2B 유형 거부·빈 내용·없는 sku(FK)·비로그인 검증, **RLS 본인 격리(타 유저 내역 빈 배열) 확인**. 알림 메일은 DB 접수와 분리(실패 시 로깅). 마이페이지 문의 내역 UI는 5번에서. 제품 선택(product_sku)은 products 동기화(2차) 후 활성화
7. ✅ 보안·컴플라이언스 강화 (§7) — CSRF 미들웨어, rate limit(Token Bucket, DB 공유 상태) + 전역 메일 예산, contacts 보유기간 자동 파기, 탈퇴 회원 논리적 분리 보관(withdrawn_at), 마케팅 수신동의 2년 재확인 cron(§3 스케줄러)

### 2차 — 주문·결제
1. ✅ products 동기화 스크립트(`scripts/sync-products.mjs`, §2 — production 빌드 가드) → 장바구니·찜 API(`src/server/routes/cart.ts`·`dibs.ts`). e2e 21건 통과: 수량 합산·비활성 차단·RLS 404·멱등 찜·CSRF 403 포함
2. ✅ 주문 생성(`src/server/routes/orders.ts` — 서버 금액 재계산 + 배송비 3,000원 정액) → 토스 위젯 연동(주문서 `/checkout`, v2 위젯) → 결제 승인(`src/server/routes/payments.ts` + `src/server/lib/toss.ts`) → payments 기록. e2e: 금액 변조 무시(서버 값), 비활성 제품·중복 sku·우편번호 400, confirm 가드(금액 불일치·비PENDING·멱등 PAID)
3. ✅ 주문 취소(상태 분기 e2e: DELETED/CANCELLED/배송 후 400), 주문 내역(마이페이지), 관리자 배달 관리(PATCH delivery — 전이 규칙 e2e), B2C 문의 주문 연계(본인 주문 검증)
4. ✅ PENDING 주문 정리 pg_cron(매시간 — 25h 삭제/CANCELLED/24h 미만 유지 e2e), 쇼핑 프론트(제품 상세 구매 동선 자체 결제 교체·`/cart`·`/checkout`·`/order/success|fail`·`/orders`·`/dibs` 전용 페이지 — 마이페이지는 건수 요약+이동, 헤더 장바구니·찜 아이콘 활성화·관리자 배송 UI), **주문 이력 회원 탈퇴 e2e**(1차 잔여 — PAID 보유 409 게이트, DELIVERED 후 익명화: profiles 익명화+withdrawn_at·주문 보존·cart/dibs 파기·문의 익명화 확인)
5. ✅ 결제 실호출 검증 완료 (2026-07-14, 문서 공용 위젯 키) — 위젯 → 승인(payments DONE·raw_response) → 취소(토스 수락·CANCELED/CANCELLED 전이·실환불 입금 확인). ⚠️ **테스트 주의**: 간편결제는 **토스페이만** 모든 테스트 키에서 가상 승인 — **카카오페이는 공용/타 테스트 키에서 실제 출금됨**(실사고: 26,000원 실결제 → 취소로 환불). 카드도 가상 승인이라 안전. 잔여: 본인 위젯 키 교체, 실 결제 테스트(가맹 계약 후), 웹훅(후순위)

---

## 6. 미결 사항 (보류 — 결정 시점 명시)

| # | 항목 | 내용 | 결정 시한 |
|---|---|---|---|
| 2 | 통신판매업 신고 | 판매 개시 전 신고 필수 — 신고번호를 약관 표시사항·사이트 하단에 게시 | 2차 오픈 전 |
| 3 | 토스 가맹 계약 | 가맹 심사 리드타임 확인 — 개발은 테스트 키로 선행(개발자센터 키를 `TOSS_SECRET_KEY`·`PUBLIC_TOSS_CLIENT_KEY`에 설정) | 2차 실결제 전 |
| 4 | 찜 할인 알림(ORD-08) 데이터 근거 | 시스템에 "할인" 개념 없음 — ① CMS에 salePrice 필드 추가 + 동기화 시 할인 감지, ② 관리자 수동 캠페인 발송으로 완화 중 택일 | 2차 마케팅 발송 구현 전 |

(구 미결 1 "배송 정책"은 확정으로 이동 — 아래 참조)

### 확정된 사항
- **배송 정책 (2026-07-14 확정)**: 배송비 **전 주문 정액 3,000원** — 단일 원본 `src/data/shipping.ts`(클라이언트 표시·서버 재계산 공유). 배송 상태 단계는 스키마 그대로(PAID→SHIPPING→DELIVERED), 운송장은 관리자가 /manage에서 수동 입력(택배사+운송장 번호, 배송 시작 시 필수)
- **구매 동선 (2026-07-14 확정)**: 제품 페이지를 자체 결제로 교체 — 네이버 스마트스토어 링크 제거, 구매하기(주문서 직행)·장바구니·찜 버튼. 결제는 토스 결제위젯 v2(`PUBLIC_TOSS_CLIENT_KEY`), customerKey는 user_id(/users/me 응답의 userId)
- **Hono 통합 방식**: Astro catch-all(`src/pages/api/[...path].ts`)에 마운트, 앱 본체는 `src/server/`에 배치. 기존 contact·quote-download 포함 전 API를 Hono로 통합 (§1 참조)
- **Users 테이블 제거**: public 스키마는 profiles만 사용, `auth.users`를 원본으로 FK 참조. 이메일은 profiles.user_email에 복사 (§2 참조)
- **확정 ERD**: [roboseasy-erd.sql](roboseasy-erd.sql) — Payments 테이블·배송 스냅샷·FK/UNIQUE 보강 반영 (§2 참조)
- **products 데이터**: A안 — JSON(Sveltia CMS)이 원본 유지, 빌드 시 DB upsert 동기화. 재고 관리 없음, 삭제는 is_active=false (§2 "products 동기화" 참조. Sveltia는 Git 백엔드만 지원해 DB 직접 관리 불가)
- **비회원 구매 불허**: 주문·장바구니·찜은 회원 전용 — 명세(회원 전제) 그대로. 게스트 주문 경로 없음
- **관리자 로그인**: 별도 엔드포인트 없이 일반 로그인 + role 검사 — `/api/v1/admin/*`은 `requireAuth → requireAdmin` 미들웨어 체인으로 보호. 감사 로그 등 관리자 전용 강화가 필요해지면 이 미들웨어 레벨에서 처리. **rate limit은 관리자 API에 걸지 않음** — 세션 필수 API는 대상 아님(§7 적용 기준 참조)
- **회원탈퇴 정책**: 탈퇴 전 게이트 — **배송 미완료(PAID·SHIPPING) 주문이 있으면 409로 보류**(약관 제7조, 거래 완료 후 처리. PENDING·CANCELLED·DELIVERED는 차단 대상 아님). 주문 이력 없는 회원은 즉시 hard delete(`auth.admin.deleteUser()` → profiles·cart_items·dibs CASCADE 삭제, contacts.user_id는 SET NULL이라 문의 이력이 삭제를 막지 않음). 주문 이력 있는 회원은 **익명화 방식** — auth 계정을 삭제하지 않고(삭제하면 profiles CASCADE가 orders FK에 막혀 실패) `updateUserById`로 이메일을 `deleted-{user_id}@removed.invalid`로 스크램블 + 영구 ban, profiles의 이름·전화·주소·이메일도 동일하게 익명화(행 유지) + **withdrawn_at 기록**(논리적 분리 보관 — 관리자 활성 목록·마케팅 발송 대상에서 제외), 익명화 경로는 CASCADE가 없으므로 cart_items·dibs를 명시 파기. 거래기록(orders/order_items/payments)은 5년 분리 보관 — 개인정보보호법 제21조 이행. 원본 이메일이 시스템에서 사라지므로 **같은 이메일 재가입 가능**. 이메일 익명화는 2-1 트리거의 예외 패턴으로 허용됨
- **탈퇴 시 문의 기록 처리**: 탈퇴 유형과 무관하게 본인 contacts 행의 개인정보(name/email/phone)를 처리 — 일반 문의는 익명화, **분쟁 기록(is_dispute=true)은 전자상거래법 3년 보존 근거로 원본 유지**
- **마케팅 수신 동의 UI**: 가입 폼 + 회원정보 수정 페이지의 선택 체크박스(사전 체크 금지) — profiles.marketing_consent + marketing_consent_at(2년 재확인 기준점)에 저장. 광고 이메일은 동의 회원에게만, 제목 "(광고)" 표기 + 수신거부 링크(`GET /api/v1/marketing/unsubscribe`, 서명 토큰·로그인 불필요) 필수
- **마케팅 수신동의 2년 재확인**: 정보통신망법 시행령 제62조의3 — 매월 1일 pg_cron→pg_net→`POST /api/v1/cron/marketing-reconfirm`(§3 스케줄러)이 2년 경과 동의 회원에게 안내 발송, marketing_reconfirmed_at으로 발송 주기 관리. 재확인 안내는 광고가 아닌 법정 고지라 "(광고)" 미표기, 수신거부 안내는 마이페이지 링크(서명 토큰 링크는 광고 메일용 — 미구현 상태와 무관)
- **문의 기록 DB 저장**: 1차부터 contacts 테이블에 기록(메일 발송과 병행) — 법정 보유기간 관리(일반 1년/불만·분쟁 3년, is_dispute 구분). 첨부파일은 DB 미저장, 메일 첨부로만 전달
- **문의 이원화(B2B/B2C)**: 입구 2개 + 테이블 1개(channel 구분) — B2B는 기존 `/contact` 폼(비로그인 허용, 견적·첨부), B2C는 판매 사이트 개인 문의(`/api/v1/inquiries`, 로그인 전용, 이름·연락처 자동). B2C 문의는 마이페이지에서 본인 것만 조회 가능(RLS `contacts_select_own_b2c`) (§3 참조)
- **결제수단**: 카드·간편결제만 지원 — 가상계좌 미지원(입금 대기 상태·웹훅 필수화 등 복잡도 회피, 이용약관 제11조에서 제외). 기관 계좌이체 구매는 B2B 견적 문의 경로로 처리
- **미결제 주문 정리**: 주문서 이탈 시 클라이언트가 즉시 `cancel?mode=abandon` 호출(pagehide는 sendBeacon) + pg_cron 15분 간격 안전망 — 2시간 경과 PENDING 중 payments 없으면 DELETE, ABORTED만 있으면 CANCELLED. confirm은 PENDING 가드 + 멱등 처리 (§4 참조)
- **주문 취소·배달 관리 경로**: `POST /api/v1/orders/{id}/cancel`, `PATCH /api/v1/admin/orders/{id}/delivery` — 취소는 리소스 삭제가 아닌 상태 전이(+토스 취소 API 호출)이므로 DELETE 대신 액션 POST, 배달 관리는 특정 주문에 속한 정보이므로 주문 하위 경로 (§3 참조)

### 법무 문서 (초안 — 법률 검토 후 게시)
- [이용약관 초안](terms-of-service-draft.md) — 전자상거래 표준약관 기반, 회원제 판매 반영
- [개인정보처리방침 초안](privacy-policy-draft.md) — 국외 이전(Supabase 서울 리전/Netlify/Resend) 조항 포함, 보호책임자 김성관 대표
- 게시 위치: 회원가입 폼 동의 체크(약관·개인정보 각각 분리 동의 + 국외 이전 고지 문구) + footer 링크. 동의 일시는 profiles.terms_agreed_at / privacy_agreed_at에 저장(확정)
- 문의 첨부(사업자등록증 사본): 서버 미저장 — Resend 메일 첨부로만 전달(pass-through), 수신 메일함에서 관리·파기

---