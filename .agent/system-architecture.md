# System Architecture / Tech Stack

현재 운영 중인 시스템의 전체 그림과 기술 스택. (구 tech-stack.md 개편)

- 프론트 구조·작업 절차: [frontend.md](frontend.md)
- 로컬 개발·빌드·배포·CMS 운영: [operations.md](operations.md)

> 회원·주문·결제 백엔드는 이 브랜치 범위가 아니다 — 별도 브랜치에서 관리한다.

## 시스템 구성 (현재)

```
User ──HTTPS──▶ Netlify
                 ├─ 정적 페이지 (빌드 타임 프리렌더 ◀── GitHub main ◀── Sveltia CMS)
                 └─ /api/* (Netlify Functions — output: 'hybrid')
                      └─ 문의·견적 ────▶ Resend (메일) / ExcelJS (견적서)
```

콘텐츠(제품·뉴스·docs)는 저장소가 원본(git-based) — CMS 저장 = main 커밋 = 자동 재배포.
서버 호출은 문의 메일 발송과 견적서 다운로드 두 건뿐이고, 데이터베이스는 쓰지 않는다.

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

## 서버 / API

각 엔드포인트는 `src/pages/api/` 아래 개별 Astro API 라우트다 (`export const prerender = false`).

- **POST /api/contact** — 문의 폼. [Resend](https://resend.com/) 메일 발송(`RESEND_API_KEY`). 답장이 문의자에게 가도록 `replyTo`에 문의자 이메일 지정
- **POST /api/quote-download** — 견적서 엑셀 생성. [ExcelJS](https://github.com/exceljs/exceljs) (로직 `src/lib/buildQuoteExcel.ts`, 템플릿 `src/excel/`, netlify.toml `included_files`로 번들 포함)

## CMS (콘텐츠 관리)

- **[Sveltia CMS](https://github.com/sveltia/sveltia-cms)** — `/admin`에서 CDN(unpkg `@sveltia/cms`) 로드, 설정 `public/admin/config.yml`
- **백엔드**: GitHub (`roboseasy/roboseasy-website`, main) — GitHub OAuth 로그인 (Netlify OAuth 프록시 경유)
- **워크플로**: 저장 시 main에 바로 커밋 (PR 검수 없음 — 운영 주의사항은 [operations.md](operations.md))
- **관리 대상**: 제품(products.json), 랜딩 뉴스, 뉴스(Instagram 게시물)

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
