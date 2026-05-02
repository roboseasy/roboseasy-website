# RoboSEasy Website 리팩터링 기획서

> **방향 결정 (사용자 확정):**
> 1. **Astro**로 마이그레이션
> 2. 기술 문서는 사이트와 **통합** (docsify 제거)
> 3. **빌드 단계 도입** (Node + npm)

---

## 1. Context — 왜 하는가

현재 `roboseasy-website/`는 정적 HTML/CSS/JS 사이트로, 빌드 단계 없이 Netlify에 배포된다. 가볍지만 다음 한계가 누적되고 있다.

- **루트 디렉토리 평면화**: HTML 11개(메인 7 + docsify 4) + 인증 3 + 마크다운 등이 루트에 섞여 탐색이 어렵다.
- **수동 동기화 부담**: 모든 페이지가 OG/Twitter 메타 태그, CSS link 순서, `<main-header>`/`<main-footer>` 호출을 손으로 맞추고 있고 실제로 페이지마다 미세하게 어긋나 있다 (예: `index.html`은 `style.css → reset.css`, `programs.html`은 반대 순서).
- **컴포넌트 재사용 한계**: Web Components가 있지만 `hackathon-2026.html`은 사용조차 하지 않고 자체 헤더/푸터를 가진다. FOUC 위험도 존재.
- **거대 단일 파일**: `programs.html` 1,230줄 (모달 4개 인라인). 카드 추가 = 동일 파일 거대 편집.
- **반쪽 SSG**: `feed.xml`/`site.xml`만 Jekyll Liquid를 쓰는데 로컬에선 동작 안 함. Jekyll 의존도 사이트 자체엔 없어 사실상 죽은 코드.
- **콘텐츠 시스템 이원화**: 본 사이트(HTML)와 기술 문서(docsify가 클라이언트에서 마크다운 fetch). SEO·디자인 일관성·검색 모두 불리.
- **자산 비정리**: `img/` 42개 중 22개가 루트에 산재, `videos/`는 카테고리 없음, 8MB짜리 PNG가 압축 없이 들어가 있음.
- **죽은 의존성**: jQuery 3.7.1 로드되지만 실 사용 0건.
- **누락**: `docs-lekiwi.html`/`docs-xlerobot.html` 페이지는 있으나 `docs/lekiwi`, `docs/xlerobot` 폴더가 없어 깨짐.

**원하는 결과물**: 페이지·콘텐츠·자산이 명확한 폴더에 정리되고, 공통 영역(헤더/푸터/메타)은 한 곳에서만 정의하며, 새 프로그램·뉴스·문서를 마크다운/데이터로 추가하면 자동으로 반영되는 구조.

---

## 2. Goals & Non-Goals

### Goals
- 루트 정리 → `src/`, `public/`, 명시적 진입점만 노출
- **DRY 메타데이터**: 모든 페이지가 한 레이아웃을 상속, OG/Twitter는 한 군데에서 제어
- **콘텐츠 = 데이터/마크다운**: 프로그램·뉴스·docs를 콘텐츠 컬렉션으로
- docsify 제거하고 docs도 같은 시스템으로 렌더 (SEO·검색·다국어 일관)
- 이미지 자동 최적화 (WebP/AVIF)
- Netlify 배포는 그대로 유지 (build 명령만 추가)

### Non-Goals (이번 리팩터링 범위 밖)
- 디자인 전면 개편: 기존 CSS·BEM 클래스 그대로 가져옴 (마이그레이션 후 별도 작업)
- React/Vue 도입: Astro의 zero-JS-by-default 활용, 기존 Web Components 그대로 호환
- 다국어(i18n): 한국어 단일 유지
- CMS 도입: 마크다운/JSON 파일 기반

---

## 3. Target Stack

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| SSG | **Astro 5+** | 컴포넌트(`.astro`) + 파일 라우팅 + content collections. zero-JS 출력 → 가벼움 유지 |
| 스타일 | **기존 CSS 유지 + 토큰 정리** | reset/style/페이지별 CSS를 그대로 옮기고, `:root` 변수로 색·섀도우만 정리 |
| 마크다운 | **MDX (Astro 내장)** | 문서에 컴포넌트 삽입 가능 (콜아웃, 탭) |
| 코드 하이라이트 | **Shiki (Astro 내장)** | docsify의 Prism 대체, 빌드 타임 |
| 검색 (docs) | **Pagefind** | 정적 검색 인덱스, docsify search 대체 |
| 이미지 | **`astro:assets`** | 자동 최적화 + 반응형 |
| 패키지 매니저 | **npm** | 표준, Netlify 친화적 |
| 노드 버전 | **Node 20 LTS** | `.nvmrc` 명시 |
| 배포 | **Netlify (그대로)** | `_redirects`는 Astro 라우팅으로 흡수, 외부 URL만 남김 |

---

## 4. Target Folder Structure

```
roboseasy-website/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── .nvmrc
├── .agent/                      # 기존 가이드 문서 유지
├── public/                      # 그대로 서빙되는 정적 파일
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── googlef0b1a1e39ee27640.html      # 검증 파일
│   ├── naver*.html                       # 검증 파일
│   ├── _redirects                        # 외부 리다이렉트만 (내부 라우팅은 Astro)
│   └── videos/
│       └── joints/Joint1_v2.mp4 ...
├── src/
│   ├── layouts/
│   │   ├── BaseLayout.astro             # <html>, head, OG/Twitter, header, footer
│   │   ├── PageLayout.astro             # 일반 페이지 (배너 옵션)
│   │   └── DocsLayout.astro             # 좌측 사이드바 + 본문
│   ├── components/
│   │   ├── header/MainHeader.astro
│   │   ├── header/MainBanner.astro
│   │   ├── footer/MainFooter.astro
│   │   ├── meta/SeoMeta.astro           # OG/Twitter 태그 단일 정의
│   │   ├── programs/ProgramCard.astro
│   │   ├── programs/ProgramModal.astro  # 슬롯으로 콘텐츠 받음
│   │   ├── docs/Sidebar.astro
│   │   └── ui/{Tabs,Accordion,Callout}.astro
│   ├── pages/
│   │   ├── index.astro                  → /
│   │   ├── programs/
│   │   │   ├── index.astro              → /programs (카드 리스트)
│   │   │   └── [slug].astro             → /programs/sts3215 등 (모달 → 라우트로)
│   │   ├── documents.astro              → /documents
│   │   ├── news.astro                   → /news
│   │   ├── hackathon-2026.astro         → /hackathon-2026 (+ /hackathon 별칭)
│   │   └── docs/
│   │       └── [...slug].astro          → /docs/lerobot-so-arm/setup-hardware
│   ├── content/                         # Content Collections
│   │   ├── config.ts                    # 스키마 정의 (zod)
│   │   ├── programs/
│   │   │   ├── motor-control.mdx
│   │   │   ├── sts3215.mdx
│   │   │   ├── keyboard-teleop.mdx
│   │   │   └── endeffector-teleop.mdx
│   │   ├── news/
│   │   │   └── 2026-04-...mdx
│   │   └── docs/
│   │       ├── lerobot-library/...md
│   │       ├── lerobot-so-arm/...md
│   │       ├── lekiwi/...md             # 신규
│   │       └── xlerobot/...md           # 신규
│   ├── styles/
│   │   ├── tokens.css                   # :root 변수 (색, 섀도우, 폰트)
│   │   ├── reset.css
│   │   ├── global.css                   # 기존 style.css의 글로벌 부분
│   │   └── pages/{home,programs,...}.css
│   ├── scripts/                         # 페이지별 인터랙션 (modals, tabs)
│   │   └── programs-modal.ts
│   └── assets/                          # 빌드 타임 최적화 대상
│       └── img/
│           ├── branding/{logo,banner}.png
│           ├── products/{lekiwi,lerobot-so-arm,xlerobot,...}.png
│           ├── business/{contents,education,product,tech}.png
│           ├── partners/{hyundai,hansung}.png
│           ├── programs/{motor-control,sts3215,...}.png
│           └── docs/lerobot_library/..., docs/so_arm/..., docs/assembly/...
└── netlify.toml                          # build 명령, Node 버전, headers
```

### 핵심 변화 요약
- **루트는 설정/메타만**. HTML 진입점은 `src/pages/`로 이동
- 모든 페이지는 `BaseLayout` 한 곳에서 메타·헤더·푸터 상속 → 동기화 부담 제거
- `programs.html` 단일 파일 → 프로그램별 MDX + `[slug].astro` 동적 라우트 (모달 대신 라우트, 또는 모달 유지하되 데이터 기반)
- `docs/` HTML 4개 → `[...slug].astro` 1개로 통합, docsify 제거
- 이미지는 `src/assets/`(최적화) vs `public/`(원본 유지) 명확히 분리

---

## 5. Migration Phases

각 단계는 독립 PR로, 끝나면 사이트는 정상 동작하는 상태를 유지한다.

### Phase 0 — 준비 (0.5d)
- `.nvmrc` (Node 20), `package.json`, `astro.config.mjs`, `tsconfig.json` 추가
- `npm create astro@latest` 결과를 빈 디렉토리에 생성 후 본 저장소로 머지
- `netlify.toml` 작성: `command = "npm run build"`, `publish = "dist"`, `NODE_VERSION = "20"`
- 기존 파일은 그대로 두고 빌드만 통과시키는 hello-world `index.astro` 추가
- Netlify 프리뷰 배포로 빌드 파이프라인 검증

### Phase 1 — 레이아웃 & 공통 컴포넌트 (1d)
- `BaseLayout.astro` 작성: `<html lang="ko">`, head, `SeoMeta` props, `<MainHeader>`, `<slot />`, `<MainFooter>`
- `MainHeader`/`MainFooter`/`MainBanner`를 기존 `js/components/*.js` 마크업/이벤트 그대로 `.astro`로 포팅
- 모바일 메뉴 토글은 인라인 `<script>` 또는 `client:load` 디렉티브
- `tokens.css` + `reset.css` + `global.css`를 `BaseLayout`에서 한 번만 로드 (페이지별 CSS는 페이지 컴포넌트에서 import)

### Phase 2 — 단순 페이지 이전 (1.5d)
- `index.html` → `src/pages/index.astro`
- `documents.html` → `src/pages/documents.astro`
- `news.html` → `src/pages/news.astro`
- `hackathon-2026.html` → `src/pages/hackathon-2026.astro` (+ `hackathon.astro`에서 redirect)
- 각 페이지는 `BaseLayout` 사용, 페이지 고유 CSS만 `<style>` 블록 또는 `import`로 로드
- 이미지를 `src/assets/img/...`로 이동하면서 `<Image>` 컴포넌트로 교체

### Phase 3 — Content Collections: programs (1.5d)
- `src/content/config.ts`에 `programs` 컬렉션 스키마 정의
  ```ts
  programs: defineCollection({
    type: 'content',
    schema: z.object({
      title: z.string(),
      slug: z.string(),
      thumbnail: z.string(),       // src/assets/... 경로
      tagline: z.string(),
      tabs: z.array(z.object({ id: z.string(), label: z.string() })).optional(),
    })
  })
  ```
- `programs.html`의 4개 모달을 4개 MDX 파일로 분해
- `src/pages/programs/index.astro`: 카드 그리드 (컬렉션 쿼리)
- `src/pages/programs/[slug].astro`: 상세 페이지. 기존 모달 UX를 라우트로 승격 (뒤로가기/공유 가능)
- 모달 형태를 유지하고 싶다면 `index.astro`에 `<ProgramModal>`을 4개 렌더하고 `client:idle`로 인터랙션 hydrate

### Phase 4 — Content Collections: docs (1d)
- `docs/lerobot-library/`, `docs/lerobot-so-arm/`의 마크다운을 `src/content/docs/`로 이동
- `_sidebar.md` → frontmatter `order` + `category` 필드로 변환, `Sidebar.astro`가 컬렉션을 그룹핑
- `src/pages/docs/[...slug].astro` 단일 동적 라우트
- docsify 4개 HTML, docsify CSS, `sidebar-toggle.js` 삭제
- Pagefind 빌드 후 통합 (`npx pagefind --site dist`를 build:post에 연결)
- 누락된 `lekiwi`, `xlerobot` 카테고리는 빈 placeholder 페이지 한 장씩 + TODO 메모

### Phase 5 — News (선택, 0.5d)
- 현재 `news.html`은 Instagram/YouTube embed 위주라 콘텐츠 컬렉션화는 선택
- 향후 자체 포스트가 생기면 `content/news/` 추가 예정으로만 남기고 이번엔 정적 페이지 유지

### Phase 6 — 정리 (1d)
- jQuery 제거 (전체 grep 후 안전 확인)
- 기존 `index.html`, `programs.html`, `*.html` 등 루트 HTML 삭제
- `_redirects`는 외부/레거시 URL만 남기고 `public/`로 이동 (대부분 Astro 라우트가 흡수)
- 이미지 폴더 재정리 (위 구조), 큰 이미지 압축 (squoosh CLI / sharp 스크립트)
- `.agent/architecture.md`, `.agent/workflows.md`, `.agent/tech-stack.md` 새 구조에 맞게 갱신
- `README.md` 갱신: `npm install`, `npm run dev`, `npm run build`

**총 예상 작업량**: 6~7일 (1인 풀타임 기준, 콘텐츠 검증 포함)

---

## 6. URL 호환성 보장

기존 외부 링크가 깨지지 않게 다음을 매핑한다.

| 현재 URL | 새 라우트 |
| --- | --- |
| `/` | `src/pages/index.astro` |
| `/programs` | `src/pages/programs/index.astro` |
| `/documents` | `src/pages/documents.astro` |
| `/news` | `src/pages/news.astro` |
| `/hackathon` | redirect → `/hackathon-2026` |
| `/docs-lerobot-library.html#/` | `/docs/lerobot-library` (`_redirects`로 강제 매핑) |
| `/docs-lerobot-so-arm.html#/...` | `/docs/lerobot-so-arm/...` |
| `/docs-lekiwi.html#/` | `/docs/lekiwi` |
| `/docs-xlerobot.html#/` | `/docs/xlerobot` |

`public/_redirects`에 위 매핑을 추가하여 SEO/인바운드 링크 보존.

---

## 7. 핵심 변경 파일 (참조)

- 신규: `astro.config.mjs`, `package.json`, `netlify.toml`, `src/layouts/BaseLayout.astro`
- 마이그레이션: `index.html` → `src/pages/index.astro` 외 페이지 6개
- 분해: `programs.html` (1,230줄) → `src/content/programs/*.mdx` 4개 + `src/pages/programs/[slug].astro`
- 통합 삭제: `docs-*.html` 4개 + `js/sidebar-toggle.js` + `css/docsify.css` + jQuery
- 재사용: 기존 `js/components/main-header.js`의 마크업과 모바일 메뉴 토글 로직은 `MainHeader.astro`로 1:1 포팅 (Web Component 등록은 그대로 두거나 인라인 스크립트로 변환)

---

## 8. Verification (단계별 검증)

각 Phase 끝에 다음을 수행하고 통과해야 다음 단계로 진행.

### 로컬
```bash
npm install
npm run dev          # http://localhost:4321 에서 모든 라우트 클릭 테스트
npm run build        # dist/ 생성, 콘솔 경고 0
npm run preview      # 프로덕션 번들 미리보기
```
- 체크리스트: 헤더/푸터/배너 렌더, 모바일 메뉴 토글, 프로그램 모달/탭/아코디언, docs 사이드바 + 검색, OG 메타 태그 (DevTools에서 확인)

### Netlify Deploy Preview
- 각 PR마다 자동 프리뷰 URL 생성
- Lighthouse 모바일 점수 확인 (Performance 90+ 목표, 현재 측정 후 비교)
- 외부 링크 검증: `documents.html`의 LeRobot/SO-ARM/XLeRobot/LeKiwi 카드 → 새 docs 라우트로 정상 진입

### SEO / 호환성
- `curl -I https://<preview>/programs` → 200
- `/docs-lerobot-so-arm.html#/setup-hardware` 형태 옛 URL이 새 라우트로 redirect되는지 (Netlify 로그)
- `og:image`, `twitter:image`가 절대 URL로 출력되는지 페이지 소스에서 확인

### 회귀 방지
- Playwright 스모크 테스트 5개 (선택, Phase 6에 추가):
  1. `/`에서 헤더 메뉴 클릭 → `/programs` 진입
  2. `/programs`에서 카드 클릭 → 상세/모달 오픈
  3. `/docs/lerobot-so-arm`에서 사이드바 항목 클릭 → 본문 변경
  4. 모바일 뷰포트에서 햄버거 메뉴 토글
  5. 404 페이지 렌더

---

## 9. Risks & Mitigations

| 리스크 | 완화 |
| --- | --- |
| Netlify 빌드 실패로 배포 중단 | Phase 0에서 `astro build` 통과만 시키고 콘텐츠는 점진 이전. main 머지 전 deploy preview 필수 |
| 외부에서 걸어둔 `docs-*.html#/...` 링크 깨짐 | `_redirects`에 명시적 매핑, 한 달 모니터링 |
| 모달 → 라우트 전환에 따른 UX 변화 | Phase 3에서 사용자 결정. 모달 유지 옵션도 기획에 포함 |
| 큰 이미지로 빌드 시간 증가 | `astro:assets`가 캐시 사용. 필요 시 `public/`에 두고 최적화 스킵 |
| 작업 중 main 브랜치 동결 | 별도 `refactor/astro-migration` 브랜치에서 작업, Phase별 머지 |

---

## 10. Rollback

각 Phase가 별도 PR이므로 문제 발생 시 해당 PR만 revert. Phase 6(루트 HTML 삭제) 직전까지는 옛 파일이 남아 있어 1분 내 복구 가능. Phase 6 머지 후엔 git 히스토리에서 복구.

---

## 11. 결정 필요 사항 (작업 시작 시 재확인)

1. **모달 vs 라우트**: 프로그램 상세를 모달 그대로 둘지, `/programs/<slug>` 별도 페이지로 승격할지 (이 기획서는 라우트 권장)
2. **CSS 토큰 범위**: 색·섀도우만 토큰화할지, 폰트 크기·간격까지 디자인 시스템화할지 (이번 범위는 색·섀도우만 권장)
3. **Pagefind 도입 시점**: Phase 4에 포함할지, 별도 작업으로 미룰지

---

## 12. Out of Scope (후속 별도 작업)

- 디자인 리뉴얼
- i18n (영문 페이지)
- 분석/태그 매니저 통합
- 자체 뉴스/블로그 작성 시스템
- 비디오 외부 호스팅(Vimeo/Cloudflare Stream)
