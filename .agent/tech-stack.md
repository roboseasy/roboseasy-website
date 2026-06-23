# Tech Stack

## 프론트엔드

- **[Astro](https://astro.build/) 4.16** — `.astro` 컴포넌트 + 파일 기반 라우팅 + content collections. `output: 'hybrid'` — 페이지는 정적 프리렌더, `src/pages/api/*`만 SSR
- **HTML5 / CSS3** — BEM 클래스 네이밍, `:root` CSS 변수 토큰
- **Vanilla JavaScript / TypeScript** — 페이지 인터랙션은 Astro `<script>` (모듈) 또는 `<script is:inline>` (전역 함수 노출, onclick 호환)
- **astro-icon** — 아이콘. 빌드 타임에 **인라인 SVG**로 렌더(런타임 JS·CDN 없음). 세트: `@iconify-json/{fa6-solid, fa6-brands, fa6-regular, solar, simple-icons}`
- **Pretendard** — 한글 웹폰트 (CDN, `tokens.css`에서 import)

## Astro 통합

- **[@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/) 3.2.1** — 빌드 시 `dist/sitemap-index.xml` 자동 생성
- **[@astrojs/netlify](https://docs.astro.build/en/guides/integrations-guide/netlify/) 5.5.4** — SSR 어댑터. `api/*` 엔드포인트를 Netlify Functions로 배포
- **[astro-icon](https://github.com/natemoo-re/astro-icon) 1.1.5** — `<Icon name="set:name" />`로 아이콘을 빌드 타임 인라인 SVG로 렌더 (Iconify 세트 로컬 사용, 런타임 fetch 없음)

## 마크다운

- Astro 내장 markdown 렌더러 (remark/rehype 기반)
- 코드 하이라이팅: 내장 Shiki (빌드 타임)
- docsify에서 마이그레이션된 콜아웃: `?> **info**` → `> ℹ️ **info**` (표준 blockquote + 이모지)

## 서버 / API

`output: 'hybrid'`로 아래 엔드포인트만 서버에서 실행 (Netlify Functions).

- **POST `/api/contact`** — 문의 폼 처리. **[Resend](https://resend.com/) 6.12.3**로 이메일 발송 (`RESEND_API_KEY` 환경변수 필요)
- **`/api/quote-download`** — 견적서 엑셀 생성·다운로드. **[ExcelJS](https://github.com/exceljs/exceljs) 4.4.0** (로직 `src/lib/buildQuoteExcel.ts`, 템플릿 `src/excel/견적서_양식_자동화.xlsx`)

## CMS (콘텐츠 관리)

- **[Sveltia CMS](https://github.com/sveltia/sveltia-cms)** (Decap / 구 Netlify CMS 호환) — `/admin`에서 CDN(unpkg `@sveltia/cms`)으로 로드, 설정은 `public/admin/config.yml`
- **백엔드**: GitHub (`roboseasy/roboseasy-website`, `main` 브랜치). GitHub OAuth  로그인 (Netlify OAuth 프록시 경유, site_domain으로 사이트 식별)
- **워크플로**: 저장 시 `main` 브랜치에 **바로 커밋** (PR 검수 워크플로 미사용)
- **미디어 업로드**: `public/img/uploads` (사이트 참조 경로 `/img/uploads`)
- **관리 대상** (컬렉션 3개): 제품(Products), 랜딩 뉴스(News 섹션), 뉴스(Instagram 게시물 ID)

## 빌드/배포

- **빌드 명령**: `npm run build` (Astro 하이브리드 빌드 — 정적 페이지 + SSR Functions)
- **호스팅**: Netlify (`@astrojs/netlify` 어댑터가 SSR 엔드포인트를 Netlify Functions로 배포)
  - `netlify.toml`이 build/publish/Node 버전 지정
  - `public/_redirects`로 옛 URL의 SEO 리다이렉트
- **도메인**: https://roboseasy.netlify.app

## 로컬 개발

```bash
npm install            # 의존성 설치 (최초 1회)
npm run dev            # http://localhost:4321
npm run build          # dist/ 생성
npm run preview        # 프로덕션 번들 미리보기
```

> Node 20 LTS 필요 (`.nvmrc`). 시스템에 nvm이 있다면 `nvm use`로 자동 적용.
> 시스템 Node가 18.20.8 이상이면 Astro 4도 동작하지만, Netlify 빌드는 Node 20을 사용.

## 외부 통합

- **Instagram embed**: 뉴스 페이지에서 `https://www.instagram.com/embed.js`
- **Blogger JSON 피드**: 뉴스 페이지 Blog 탭 — 빌드 시 `https://roboseasy.blogspot.com/feeds/posts/default?alt=json&max-results=6`로 최신 글 수집
- **YouTube RSS**: 뉴스 페이지 YouTube 탭 — 빌드 시 `https://www.youtube.com/feeds/videos.xml?channel_id=...`로 채널 영상 목록 수집
- **Resend**: 문의 폼 이메일 발송 (`/api/contact`) — 위 "서버 / API" 참고
- **GitHub + Netlify OAuth**: Sveltia CMS 백엔드 인증 — 위 "CMS" 참고
- **검증 파일**: `public/googlef0b1a1e39ee27640.html`, `public/naver*.html` (사이트 소유 인증)
