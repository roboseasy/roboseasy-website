# System Architecture / Tech Stack

현재 운영 중인 시스템의 전체 그림과 기술 스택. (구 tech-stack.md 개편)

- 프론트 구조·작업 절차: [frontend.md](frontend.md)
- 로컬 개발·빌드·배포·CMS 운영: [operations.md](operations.md)
- **예정된 백엔드(회원·주문·결제, Supabase + Hono)**: [backend.md](backend.md) — 시스템 다이어그램·ERD·API 명세는 그쪽이 기준

## 시스템 구성 (현재)

```
User ──HTTPS──▶ Netlify
                 ├─ 정적 페이지 (빌드 타임 프리렌더 ◀── GitHub main ◀── Sveltia CMS)
                 └─ /api/* (Netlify Functions — output: 'hybrid')
                      ├─ /api/contact ────▶ Resend (문의 메일)
                      └─ /api/quote-download (ExcelJS 견적서)
```

콘텐츠(제품·뉴스·docs)는 저장소가 원본(git-based) — CMS 저장 = main 커밋 = 자동 재배포.
백엔드 1·2차 개발이 붙으면 `/api/*`가 Hono 단일 앱으로 통합되고 Supabase(Auth+DB)가 추가된다 (backend.md §1).

## 프론트엔드

- **[Astro](https://astro.build/) 4.16** — `.astro` 컴포넌트 + 파일 기반 라우팅 + content collections. `output: 'hybrid'`
- **HTML5 / CSS3** — BEM, `:root` CSS 변수 토큰 (tokens.css)
- **Vanilla JS / TypeScript** — 페이지 인터랙션은 Astro `<script>`
- **astro-icon 1.1.5** — 빌드 타임 인라인 SVG (런타임 JS·CDN 없음). 세트: `@iconify-json/{fa6-solid, fa6-brands, fa6-regular, solar, mdi, simple-icons}`
- **Pretendard** — 한글 웹폰트 (CDN, tokens.css에서 import)

## Astro 통합

- **@astrojs/sitemap 3.2.1** — 빌드 시 `dist/sitemap-index.xml` 자동 생성 (robots.txt는 수동 관리)
- **@astrojs/netlify 5.5.4** — SSR 어댑터. `api/*`를 Netlify Functions로 배포

## 마크다운

- Astro 내장 렌더러 (remark/rehype), 코드 하이라이팅은 내장 Shiki (빌드 타임)
- docsify 시절 콜아웃은 표준 blockquote로 변환됨 (`> ℹ️`, `> ⚠️`)

## 서버 / API (현재 운영분)

`/api/*` 전체가 **Hono 단일 앱**(`src/server/app.ts`)으로 서빙됨 — Astro catch-all(`src/pages/api/[...path].ts`)이 위임. 새 API는 `src/server/routes/`에 추가.

- **POST /api/contact** — B2B 문의 폼. [Resend](https://resend.com/) 메일 발송(`RESEND_API_KEY`) + contacts 테이블 병행 기록(Supabase service role)
- **POST /api/quote-download** — 견적서 엑셀 생성. [ExcelJS](https://github.com/exceljs/exceljs) (로직 `src/lib/buildQuoteExcel.ts`, 템플릿 `src/excel/`, netlify.toml `included_files`로 번들 포함)
- 예정 API 전체 목록: backend.md §3 / `.agent/specs/API 명세서.csv`

## CMS (콘텐츠 관리)

- **[Sveltia CMS](https://github.com/sveltia/sveltia-cms)** — `/admin`에서 CDN(unpkg `@sveltia/cms`) 로드, 설정 `public/admin/config.yml`
- **백엔드**: GitHub (`roboseasy/roboseasy-website`, main) — GitHub OAuth 로그인 (Netlify OAuth 프록시 경유)
- **워크플로**: 저장 시 main에 바로 커밋 (PR 검수 없음 — 운영 주의사항은 [operations.md](operations.md))
- **관리 대상**: 제품(products.json), 랜딩 뉴스, 뉴스(Instagram 게시물)
- Git 기반 백엔드만 지원 — DB 직접 관리 불가. 판매 사이트용 products DB는 빌드 시 JSON→DB 동기화 (backend.md §2)

## 호스팅 / 도메인

- **Netlify** — main 푸시 → 자동 빌드·배포. 도메인 https://roboseasy.ai
- 빌드·배포 절차와 환경변수: [operations.md](operations.md)

## 외부 통합

- **Resend** — 문의 메일 발송 (`/api/contact`)
- **Instagram embed** — 뉴스 페이지 (`instagram.com/embed.js`)
- **Blogger JSON 피드** — 뉴스 페이지 Blog 탭, 빌드 시 수집
- **YouTube RSS** — 뉴스 페이지 YouTube 탭, 빌드 시 수집
- **GitHub + Netlify OAuth** — Sveltia CMS 인증
- **검증 파일** — `public/google*.html`, `public/naver*.html` (사이트 소유 인증 — 삭제 금지)
- (2차 예정) **토스 페이먼츠** — 결제위젯 + 승인 API (backend.md §4)
