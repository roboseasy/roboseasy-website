# Architecture

Astro 기반 하이브리드 사이트(정적 프리렌더 + 일부 SSR 엔드포인트)의 폴더 구조와 구성 요소.

## 루트 레이아웃

```
roboseasy-website/
├── astro.config.mjs            # Astro 설정 (output: hybrid, netlify 어댑터, sitemap·astro-icon 통합, /hackathon 리다이렉트)
├── netlify.toml                # Netlify 빌드 (npm run build → dist/, Node 20)
├── package.json
├── tsconfig.json
├── .nvmrc                      # Node 20
├── .agent/                     # 개발 가이드 문서 (이 폴더)
├── public/                     # 그대로 dist로 복사되는 정적 자산
│   ├── admin/                  # Sveltia CMS (config.yml) — /admin 콘텐츠 편집
│   ├── img/                    # 이미지 (페이지별 폴더로 정리)
│   │   ├── common_img/         # 로고/파비콘/파트너 로고/OG banner 등 공용
│   │   ├── index_img/          # 홈
│   │   ├── documents_img/      # documents
│   │   ├── programs_img/       # programs
│   │   ├── products_img/       # products
│   │   ├── hackathon-2026_img/ # hackathon
│   │   ├── assembly/           # docs 조립 가이드 사진
│   │   ├── so_arm/             # docs SO-ARM 이미지
│   │   └── uploads/            # Sveltia CMS 업로드 (config.yml media_folder)
│   ├── videos/                 # mp4 (조립 가이드용 6개)
│   ├── _redirects              # Netlify 리다이렉트 — 옛 docsify URL/.html → 새 라우트
│   ├── robots.txt              # 수동 관리 (Astro 미생성) — sitemap-index.xml 가리킴
│   ├── googlef0b1a1e39ee27640.html  # Google Search Console 인증
│   └── naver*.html             # 네이버 웹마스터 인증
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro    # 모든 페이지 공통 head/header/slot/footer
│   ├── components/
│   │   ├── MainHeader.astro    # 상단 네비 + 모바일 메뉴 토글
│   │   ├── MainFooter.astro
│   │   ├── MainBanner.astro
│   │   ├── SeoMeta.astro       # OG/Twitter/canonical 단일 정의
│   │   ├── docs/Sidebar.astro  # 카테고리별 docs 사이드바
│   │   ├── programs/
│   │   │   ├── ProgramCard.astro
│   │   │   ├── Sts3215Detail.astro
│   │   │   ├── KeyboardTeleopDetail.astro
│   │   │   ├── EndeffectorTeleopDetail.astro
│   │   │   ├── InstallGuideSection.astro
│   │   │   └── StudioDownloadSection.astro
│   │   └── shop/
│   │       ├── ProductCard.astro
│   │       └── BrandPlaceholder.astro
│   ├── pages/
│   │   ├── index.astro                  → /
│   │   ├── documents.astro              → /documents
│   │   ├── news.astro                   → /news
│   │   ├── contact.astro                → /contact
│   │   ├── hackathon-2026.astro         → /hackathon-2026 (+ /hackathon 별칭)
│   │   ├── programs.astro               → /programs (카드 그리드)
│   │   ├── programs/[slug].astro        → /programs/sts3215-motor-test 등
│   │   ├── products.astro               → /products (상품 목록)
│   │   ├── products/[id].astro          → /products/<id> 상세
│   │   ├── docs/[...slug].astro         → /docs/lerobot-so-arm/setup-hardware-assembly 등
│   │   └── api/                         # SSR 엔드포인트 (output: hybrid)
│   │       ├── contact.ts               → POST /api/contact (문의 폼 처리)
│   │       └── quote-download.ts        → /api/quote-download (견적서 엑셀 생성·다운로드)
│   ├── content/
│   │   ├── config.ts                    # programs / docs 컬렉션 zod 스키마
│   │   ├── programs/                    # JSON 3개 (카드 메타데이터)
│   │   └── docs/                        # 마크다운 (frontmatter: title, category, group, order)
│   │       ├── lerobot-library/         # 3 md
│   │       ├── lerobot-so-arm/          # 14 md
│   │       ├── lekiwi/index.md          # placeholder
│   │       └── xlerobot/index.md        # placeholder
│   ├── data/                            # 컬렉션 외 정적 데이터
│   │   ├── landing-news.json            # 홈 뉴스 섹션
│   │   ├── news.json                    # news 페이지
│   │   ├── products.json                # 상품 데이터
│   │   └── products.ts                  # 상품 데이터 로더/타입
│   ├── lib/
│   │   └── buildQuoteExcel.ts           # 견적서 엑셀 생성 (api/quote-download에서 사용)
│   ├── excel/
│   │   └── 견적서_양식_자동화.xlsx        # 견적서 템플릿
│   └── styles/
│       ├── tokens.css                   # :root 색·폰트 변수 + Pretendard
│       ├── reset.css
│       ├── global.css                   # 헤더/푸터/배너 + 반응형
│       └── pages/                       # 페이지별 CSS
│           ├── home.css, programs.css, documents.css
│           ├── news.css, hackathon-2026.css
│           ├── products.css, product-detail.css
│           └── docs.css
└── dist/                                # 빌드 결과 (gitignore)
```

## 라우팅

Astro의 파일 기반 라우팅. `src/pages/*.astro`의 경로가 곧 URL.
- 단일 페이지: `pages/foo.astro` → `/foo`
- 동적 라우트: `pages/programs/[slug].astro`, `pages/products/[id].astro` + `getStaticPaths` → 다중 URL 생성
- Catch-all: `pages/docs/[...slug].astro` → `/docs/<여러 segment>` 처리
- SSR 엔드포인트: `pages/api/*.ts` → 서버에서 실행되는 API (`output: 'hybrid'` 덕분에 페이지는 정적, API만 SSR)

`astro.config.mjs`의 `redirects`로 별칭 처리 (`/hackathon` → `/hackathon-2026`).
SEO 호환을 위한 영구 리다이렉트(옛 `docs-*.html`, `.html`, `/shop` 등)는 `public/_redirects`에서 Netlify가 처리.

## 공통 레이아웃: `BaseLayout`

모든 페이지가 `BaseLayout`을 상속하여 head/header/footer를 한 곳에서만 관리.
- `title`, `description`, `path`, `image` props로 SEO 메타 자동 합성 (`SeoMeta` 컴포넌트가 절대 URL로 변환)
- `chrome={false}` props로 헤더/푸터를 끄는 옵션 (hackathon 같은 자체 chrome 페이지용)
- 글로벌 CSS(`tokens` → `reset` → `global`) 로드. 아이콘은 **astro-icon**이 빌드 타임에 인라인 SVG로 처리(런타임 CDN/JS 없음)

## 컨텐츠 컬렉션 & 데이터

### `programs` (`type: 'data'`, JSON)
카드 메타데이터. 스키마: slug, title, description, thumbnail, downloadUrl, order.
3개 항목 → `/programs` 카드 그리드 + `/programs/[slug]` 상세 라우트 자동 생성.

### `docs` (`type: 'content'`, Markdown)
프론트매터: title, category, group, order, description?
- `category`: `lerobot-library` / `lerobot-so-arm` / `lekiwi` / `xlerobot`
- `group`: 사이드바 그룹 라벨 (예: 'Setup', 'Dataset')
- `order`: 카테고리 내 정렬 순서
- 파일명 `index.md`는 카테고리 루트 URL로 매핑 (`docs/lerobot-so-arm/index.md` → `/docs/lerobot-so-arm`)

`Sidebar.astro`가 카테고리로 필터링하고 `group`으로 묶어 렌더, 활성 항목 하이라이트.

### `src/data/` (컬렉션 외)
products/news 등 콘텐츠 컬렉션 스키마를 쓰지 않는 정적 데이터는 `src/data/`의 JSON/TS로 관리. `products.astro`·`products/[id].astro`는 `products.ts`/`products.json`을, 홈·news는 `landing-news.json`/`news.json`을 import.

## 빌드 / 배포

- 로컬: `npm install` → `npm run dev` (http://localhost:4321) / `npm run build` (dist/) / `npm run preview`
- 출력 모드: `output: 'hybrid'` — 페이지는 빌드 타임 프리렌더(정적), `api/*` 엔드포인트만 SSR
- 어댑터: `@astrojs/netlify` — SSR 엔드포인트를 Netlify Functions로 배포
- Netlify: `netlify.toml`에 `command = "npm run build"`, `publish = "dist"`, `NODE_VERSION = "20"`
- Sitemap: `@astrojs/sitemap` 통합이 빌드 시 `dist/sitemap-index.xml`(+ `sitemap-0.xml`) 자동 생성. `robots.txt`는 자동 생성되지 않으므로 `public/robots.txt`에서 수동 관리하며 `sitemap-index.xml`을 가리킴
