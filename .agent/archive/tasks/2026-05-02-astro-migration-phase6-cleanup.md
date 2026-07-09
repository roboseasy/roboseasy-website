# Astro Migration — Phase 6 (정리 + 배포 전환)

- Status: done (로컬 빌드 통과, 머지 대기)
- Started: 2026-05-02
- Owner: khw
- Plan: [.agent/refactor-astro-plan.md](../refactor-astro-plan.md)

## 목표
Astro 마이그레이션 마무리. 라이브 사이트가 Astro 빌드 산출물을 서빙하도록 전환하고,
모든 레거시 코드(루트 HTML, jQuery, docsify, Jekyll, 옛 CSS/JS)를 제거.

## Netlify 배포 전환

- `netlify.toml` 신규: `command = "npm run build"`, `publish = "dist"`, `NODE_VERSION = "20"`
- `@astrojs/sitemap` 통합 (3.2.1 핀, Astro 4 호환). 빌드 시 `dist/sitemap-index.xml` 자동 생성
- `_redirects`를 루트에서 `public/`으로 이동하면서 SEO 호환 매핑 추가:
  - `/docs-lerobot-library.html` → `/docs/lerobot-library` (301)
  - `/docs-lerobot-so-arm.html` → `/docs/lerobot-so-arm` (301)
  - `/docs-xlerobot.html`, `/docs-lekiwi.html` 동일
  - `/index.html`, `/programs.html` 등 옛 .html 진입 URL도 redirect

## 자산 이동
- `img/` → `public/img/` (심볼릭 링크 제거 후 실제 파일 이동)
- `videos/` → `public/videos/`
- `googlef0b1a1e39ee27640.html`, `naver*.html` 인증 파일 → `public/`

## 레거시 삭제

### 루트 HTML (9)
- `index.html`, `programs.html`, `news.html`, `documents.html`, `hackathon-2026.html`
- `docs-lerobot-library.html`, `docs-lerobot-so-arm.html`, `docs-lekiwi.html`, `docs-xlerobot.html`

### Jekyll 템플릿
- `feed.xml`, `site.xml` (Liquid 문법, 사실상 미작동했던 반쪽 SSG)

### 옛 CSS/JS
- `css/` 폴더 전체 (8 파일 — reset, style, home, programs, news, documents, hackaton-2026, docsify)
  → 페이지별 CSS는 `src/styles/pages/`로, 토큰/리셋/글로벌은 `src/styles/`로 모두 이전 완료
- `js/` 폴더 전체 (6 파일)
  - `js/jquery-3.7.1.min.js` — Astro 마이그레이션 후 사용처 0
  - `js/components/main-header.js`, `main-footer.js`, `main-banner.js` — `.astro` 컴포넌트로 포팅 완료
  - `js/main.js` — 스크롤 애니메이션은 index.astro 인라인, 뉴스 탭/YouTube oEmbed는 news.astro 인라인
  - `js/sidebar-toggle.js` — docs `[...slug].astro`의 모바일 사이드바 토글로 대체

### 옛 docs
- `docs/` 폴더 전체 — 콘텐츠는 `src/content/docs/`로 이전 완료, `_sidebar.md`는 frontmatter 기반 사이드바로 대체
- `docs/LeRobot SO-ARM101 Assembly Guide.pdf` — 어떤 페이지에서도 참조 없음 확인 후 삭제

### 임시 파일
- `src/pages/phase0-check.astro` (Phase 1 검증용)
- `endeffector-teleop-gui.md` (루트 고아 마크다운, 어떤 페이지에서도 참조 없음)

## 콘텐츠 경로 정리
`src/content/docs/lerobot-so-arm/setup-hardware-assembly.md`의 `../../videos/` 상대경로 → `/videos/` 절대경로로 변환 (sed). 다른 마크다운들은 이미 Phase 4에서 처리 완료.

## 문서 갱신
- `README.md`: Astro 빌드/구조/콘텐츠 추가 절차로 재작성
- `CLAUDE.md`: 스택을 Astro로, Web Components 언급 제거, 새 작업 시작 가이드
- `.agent/architecture.md`: 새 폴더 구조 (public/, src/{layouts,components,pages,content,styles}/), 라우팅, 컬렉션
- `.agent/tech-stack.md`: Astro 4, sitemap 통합, Pretendard, Node 20
- `.agent/workflows.md`: 새 페이지/프로그램/docs 추가 절차
- `.agent/conventions.md`: Astro 컴포넌트 컨벤션, jQuery 제거, 자산 위치
- `.agent/known-issues.md`: 모바일 UX, hackaton 오타, LeKiwi/XLeRobot placeholder TODO

## 빌드 결과

```
npm run build → 27 page(s) + 1 redirect, 1.22s
@astrojs/sitemap → dist/sitemap-index.xml 생성
```

`dist/` 검증:
- 인증 파일 `googlef0b1a1e39ee27640.html`, `naver*.html` 정상 복사
- `dist/img/`, `dist/videos/` 자산 복사
- `dist/_redirects` 옛 URL 매핑 포함
- `dist/sitemap-index.xml` + `dist/sitemap-0.xml` 자동 생성

## 머지 / 배포 절차

1. develop 브랜치 push
2. Netlify deploy preview에서 모든 라우트 동작 확인 (특히 옛 URL 리다이렉트)
3. 다음 항목 시각 확인:
   - `/`, `/programs`, `/programs/sts3215-motor-test`, `/news`, `/documents`
   - `/docs/lerobot-so-arm/setup-hardware-assembly` (이미지·비디오 로드, 사이드바 활성)
   - `/hackathon-2026`
   - 옛 `/docs-lerobot-so-arm.html` 입력 시 → `/docs/lerobot-so-arm`로 301
4. develop → main 머지
5. Netlify 자동 배포 (Node 20 + npm run build + dist 발행)

## 마이그레이션 통계

| 지표 | 마이그레이션 전 | 후 |
| --- | --- | --- |
| 루트 HTML 파일 | 11개 (페이지 9 + 인증 3) | 0 (인증 3개는 public/) |
| 빌드 단계 | 없음 (Jekyll 템플릿만 절반) | Astro 정적 빌드 (1.2초, 27 pages) |
| 페이지마다 메타 태그 동기화 | 수동 | BaseLayout 단일 정의 |
| programs.html | 1,230줄 단일 파일 | 38줄 + 컴포넌트화 + 라우트 |
| docsify | 클라이언트 사이드 fetch | 빌드 타임 정적 HTML |
| jQuery | 로드되나 미사용 | 제거 |
| sitemap | Jekyll Liquid (로컬 미작동) | Astro 통합 자동 생성 |

## Out of scope (후속 작업)
- LeKiwi, XLeRobot docs 실제 콘텐츠 작성
- 모바일 반응형 보강 (`/programs/<slug>` 등)
- Pagefind 검색 통합
- 큰 PNG 이미지 WebP 압축
- `hackaton-2026.css` 파일명 오타 수정
