# Frontend 개발 가이드

Astro 기반 프론트엔드의 구조·규칙·작업 절차. (구 architecture.md + conventions.md + workflows.md 통합)

- 기술 스택·외부 통합: [system-architecture.md](system-architecture.md)
- 로컬 개발·빌드·배포·CMS 운영: [operations.md](operations.md)

## 폴더 구조

```
roboseasy-website/
├── astro.config.mjs            # output: hybrid, netlify 어댑터, sitemap·astro-icon, /hackathon 리다이렉트
├── netlify.toml                # 빌드 설정 + functions included_files (견적서 엑셀 템플릿)
├── public/                     # 그대로 dist로 복사되는 정적 자산
│   ├── admin/                  # Sveltia CMS (config.yml) — /admin 콘텐츠 편집
│   ├── img/                    # 페이지별 폴더: common_img/, index_img/, products_img/, ...
│   │   └── uploads/            # Sveltia CMS 업로드 (media_folder)
│   ├── videos/                 # mp4 (조립 가이드)
│   ├── _redirects              # 옛 URL SEO 리다이렉트 (추가만, 기존 라인 유지)
│   ├── robots.txt              # 수동 관리 — sitemap-index.xml 가리킴
│   └── google*.html, naver*.html  # 사이트 소유 인증 (건드리지 말 것)
├── src/
│   ├── layouts/BaseLayout.astro   # 모든 페이지 공통 head/header/slot/footer
│   ├── components/
│   │   ├── MainHeader/Footer/Banner.astro, SeoMeta.astro
│   │   ├── docs/Sidebar.astro
│   │   ├── programs/           # ProgramCard + 프로그램별 Detail 컴포넌트
│   │   └── shop/               # ProductCard, BrandPlaceholder
│   ├── pages/                  # 파일 기반 라우팅 (아래 "라우팅")
│   │   └── api/                # SSR 엔드포인트 (contact.ts, quote-download.ts)
│   ├── content/                # 콘텐츠 컬렉션 (config.ts에 zod 스키마)
│   │   ├── programs/           # JSON (카드 메타데이터)
│   │   └── docs/               # 마크다운 (lerobot-library, lerobot-so-arm, lekiwi, xlerobot)
│   ├── data/                   # 컬렉션 외 정적 데이터 (products.json·ts, news.json, landing-news.json)
│   ├── lib/                    # 공용 서버 로직 (buildQuoteExcel.ts)
│   ├── excel/                  # 견적서 엑셀 템플릿
│   └── styles/
│       ├── tokens.css          # :root 색·폰트 변수 + Pretendard
│       ├── reset.css, global.css
│       └── pages/              # 페이지별 CSS
└── dist/                       # 빌드 결과 (gitignore)
```

## 라우팅

`src/pages/*.astro` 경로가 곧 URL.

| 페이지 | URL |
|---|---|
| index.astro | / |
| documents.astro / news.astro / contact.astro | /documents, /news, /contact |
| hackathon-2026.astro | /hackathon-2026 (+ /hackathon 별칭 — astro.config redirects) |
| programs.astro + programs/[slug].astro | /programs, /programs/\<slug\> (getStaticPaths) |
| products.astro + products/[id].astro | /products, /products/\<id\> (getStaticPaths) |
| docs/[...slug].astro | /docs/\<category\>/\<slug\> (catch-all) |
| terms.astro / privacy.astro | /terms, /privacy (이용약관·개인정보처리방침) |
| api/*.ts | SSR 엔드포인트 (`output: 'hybrid'` — 페이지는 정적, API만 서버 실행) |

**`/admin`은 Sveltia CMS가 사용하므로 페이지 라우트로 쓰지 말 것.**

옛 URL(docsify `.html` 등) 호환은 `public/_redirects`에서 Netlify가 301 처리 — [operations.md](operations.md) 참고.

## 공통 레이아웃: BaseLayout

모든 페이지가 상속. head/header/footer를 한 곳에서만 관리.

- `title`, `description`, `path`, `image` props → `SeoMeta`가 canonical/OG/Twitter 절대 URL 합성
- `chrome={false}` — 헤더/푸터 끄기 (hackathon 같은 자체 chrome 페이지)
- `lockTheme` — 페이지 테마 고정: `'light'`면 라이트(shop 페이지), 그 외 기본 다크. `<html data-theme>`에 정적으로 반영 (런타임 토글 없음)
- `shopNav` — 판매 동선 페이지(/products, /products/\<id\>)용 레이아웃 플래그. `body.has-shop-nav`를 붙여 콘텐츠가 짧아도 푸터를 뷰포트 최하단에 고정 (global.css)
- 글로벌 CSS 로드 순서: `tokens` → `reset` → `global`

## 콘텐츠 컬렉션 & 데이터

- **programs** (`type: 'data'`, JSON): slug, title, description, thumbnail, downloadUrl?, order → `/programs` 카드 + 상세 라우트 자동 생성
- **docs** (`type: 'content'`, MD): frontmatter title, category(enum), group(사이드바 그룹), order, description? — `index.md`는 카테고리 루트 URL로 매핑. `Sidebar.astro`가 category 필터 + group 묶음 렌더
- **src/data/**: 컬렉션 스키마를 쓰지 않는 정적 데이터. products는 `products.json`(Sveltia CMS 관리) + `products.ts`(타입·정렬 export — **페이지는 이 모듈만 import**)

## 네이밍 컨벤션

- 페이지: `src/pages/<kebab-case>.astro` (URL = 파일명)
- 컴포넌트: `src/components/<도메인>/<PascalCase>.astro`
- CSS: `src/styles/pages/<페이지명>.css`
- 콘텐츠: `src/content/<collection>/<slug>.<json|md>`
- 이미지: `public/img/<page>_img/<kebab-case>.webp` — 공용은 `common_img/`, docs는 `assembly/`·`so_arm/`, CMS는 `uploads/`
- 비디오: `public/videos/<name>.mp4`
- 자산 URL은 항상 절대경로: `/img/...`, `/videos/...`

## CSS

BEM 컨벤션 — `.block__element--modifier`. 페이지/도메인명 prefix로 충돌 방지 (`.programs__`, `.docs-`).

```
.header__nav-link
.program-card__title
.docs-sidebar__link--active
```

## JavaScript / TypeScript

- 페이지 인터랙션: Astro `<script>` (모듈 스코프) 우선. 옛 onclick 어트리뷰트 호환이 필요할 때만 `<script is:inline>`
- **`<Icon>`(astro-icon)은 템플릿 전용** (세트는 [system-architecture.md](system-architecture.md) 참고) — 클라이언트 JS의 innerHTML에서는 렌더되지 않으므로 동적 마크업엔 인라인 SVG 사용 (contact.astro의 `ICON_*` 상수 참고)
- 서버 코드: API는 `src/pages/api/*.ts`, 공용 로직 `src/lib/`, 데이터 `src/data/`
- jQuery 미사용

## Astro 컴포넌트

- frontmatter에 `interface Props` 정의 + `Astro.props` 구조 분해
- 슬롯 활용 (`<slot />`, named slots)
- 페이지 고유 CSS는 frontmatter에서 `import '../styles/pages/<page>.css'`

## 문자열

- 사용자 노출 텍스트·meta는 **한국어** 기본, 영문 병기는 필요할 때만
- 커밋 규칙: [operations.md](operations.md) 참고

## 작업 절차

### 새 페이지 추가
1. `src/pages/<page>.astro` 생성 — BaseLayout 사용, `title`/`description`/`path` 채우기
2. (필요 시) `src/styles/pages/<page>.css` 생성 후 frontmatter에서 import
3. (필요 시) `MainHeader.astro` 네비 `<ul class="header__nav-list">`에 항목 추가 — 모바일 메뉴 동작은 자동
4. `npm run dev`로 확인. `_redirects` 수정 불필요 (Astro 라우팅이 처리)

### 새 프로그램 카드 추가
1. 썸네일을 `public/img/programs_img/<slug>.webp`에 추가
2. `src/content/programs/<slug>.json` 작성 (slug, order, title, description, thumbnail, downloadUrl?)
3. 상세 본문이 필요하면 `src/components/programs/<Name>Detail.astro` 작성 + `programs/[slug].astro`의 `detailBySlug` 매핑에 추가

### 새 제품 (SHOP) 추가
1. **권장**: `/admin`(Sveltia CMS) → "제품" 컬렉션에 항목 추가 — 저장 시 main에 바로 커밋됨 ([operations.md](operations.md)의 CMS 주의 참고)
2. 직접 편집 시 `src/data/products.json`의 배열에 추가, 이미지는 `/img/uploads/...`
3. `id`는 `^[a-z0-9-]{1,50}$` — URL(`/products/<id>`)이 되므로 **한번 정하면 변경 금지**

### 새 docs 페이지 추가
1. `src/content/docs/<category>/<slug>.md` 생성 — frontmatter: title, category, group, order
2. `order`로 사이드바 정렬, 같은 `group`끼리 묶임
3. 이미지는 `/img/...` 절대경로(webp 권장), 콜아웃은 `> ℹ️ **정보**:` / `> ⚠️ **주의**:` blockquote

### 새 docs 카테고리 추가
1. `src/content/config.ts`의 `category` enum에 추가
2. `src/pages/docs/[...slug].astro`의 `heroByCategory` 매핑에 heading/description 추가
3. `src/content/docs/<category>/index.md` 작성 (+ 필요 시 `documents.astro`에 카드)

### 메타 태그 / OG
페이지마다 손볼 필요 없음 — BaseLayout props(`title`, `description`, `path`, `image`)로 전달하면 `SeoMeta`가 `astro.config.mjs`의 `site`와 합성. 기본 OG 이미지: `/img/common_img/banner.webp`
