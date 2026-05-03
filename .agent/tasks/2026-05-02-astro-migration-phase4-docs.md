# Astro Migration — Phase 4 (docs 통합)

- Status: done (로컬 빌드 통과)
- Started: 2026-05-02
- Owner: khw
- Plan: [.agent/refactor-astro-plan.md](../refactor-astro-plan.md)

## 목표
docsify 4개 HTML(`docs-lerobot-library`, `docs-lerobot-so-arm`, `docs-lekiwi`, `docs-xlerobot`)을
Astro content collection + 단일 `[...slug].astro` 동적 라우트로 통합. 클라이언트 사이드
마크다운 fetch → 빌드 타임 정적 HTML로 전환 → SEO/속도/디자인 일관성 향상.

## 추가/수정/이동 파일

### Content Collection
- `src/content/config.ts`: `docs` 컬렉션 추가 (`type: 'content'`, schema: title/category/group/order/description)
- `src/content/docs/lerobot-library/`: README → index.md, virtual-env-setup.md, library-installation.md (각 frontmatter 추가)
- `src/content/docs/lerobot-so-arm/`: 14개 파일 (README → index.md 포함, frontmatter 추가)
- `src/content/docs/lekiwi/index.md`: 신규 placeholder (준비 중)
- `src/content/docs/xlerobot/index.md`: 신규 placeholder

### 컴포넌트/페이지
- `src/components/docs/Sidebar.astro`: 카테고리 prop으로 컬렉션 필터 → group으로 묶어 렌더, 활성 링크 하이라이트, GitHub/HuggingFace/Discord 외부 링크
- `src/pages/docs/[...slug].astro`: 단일 동적 라우트
  - `getStaticPaths`로 모든 entry → URL 생성 (index.md는 카테고리 루트로 매핑)
  - 카테고리별 hero (heading + description) 매핑
  - DocsLayout: hero + sidebar + content + 이전/다음 pager
  - 모바일 사이드바 토글 (인라인 스크립트)
- `src/styles/pages/docs.css`: hero, 2컬럼 레이아웃, sidebar, content typography, code/blockquote/table, 반응형(1024px↓ 사이드바 오버레이)

### 링크 업데이트
- `src/pages/documents.astro`: 4개 카드의 docsify 링크(`/docs-*.html#/`) → `/docs/<category>` 로 변경

## docsify 호환 처리

### 파일명: README.md → index.md
Astro 컬렉션 slug가 `lerobot-so-arm/readme`로 떨어지지 않도록 README.md 파일을 index.md로 rename.
`getStaticPaths`에서 `*/index` 슬러그를 카테고리 루트(`*`)로 매핑.

### docsify 콜아웃 변환
- `?> **info**` → `> ℹ️ **info**`  (blockquote + 이모지)
- `!> **warn**` → `> ⚠️ **warn**`
- 표준 markdown blockquote로 렌더되어 `docs.css`의 `.docs-content blockquote` 스타일 적용

### 이미지 경로
원본 마크다운의 상대경로 `../../img/...` (root 기준)는 `src/content/docs/<cat>/` 위치에서 깨짐.
일괄 sed로 절대경로 `/img/...`로 변환. `public/img → ../img` 심볼릭 링크가 빌드시 자동 처리.

## 빌드 결과

```
npm run build → 28 page(s) + 1 redirect, 1.23s
```

생성된 docs 라우트 (19):
- `/docs/lerobot-library` + virtual-env-setup, library-installation
- `/docs/lerobot-so-arm` + 13개 하위 페이지
- `/docs/lekiwi` (placeholder)
- `/docs/xlerobot` (placeholder)

검증:
- `setup-hardware-assembly/index.html`에 `docs-sidebar__link--active` 1개 (현재 페이지 하이라이트)
- `docs-pager` 9개 occurrence (이전/다음 네비)
- 사이드바에 GitHub/HuggingFace/Discord 외부 링크 정상

## 영향 범위 / 호환성

### 라이브 사이트 (현재)
- 변경 없음. 루트 `docs-*.html` + `docs/` 폴더 그대로 유지
- 새 라우트는 로컬 빌드에서만 활성

### Phase 6 정리 시 처리할 것
- 루트 `docs-*.html` 4개 삭제
- 루트 `docs/` 폴더 삭제 (콘텐츠는 `src/content/docs/`로 이동 완료)
- `js/sidebar-toggle.js` 삭제
- `css/docsify.css` 삭제
- `_redirects`에 `/docs-lerobot-library.html` 등 → `/docs/lerobot-library` 매핑 추가 (SEO 호환)
- jQuery 제거 가능 검토

## 다음 (Phase 5/6)

- **Phase 5**: News는 콘텐츠 컬렉션화 보류 (Instagram/YouTube embed 위주). Phase 5는 사실상 스킵 가능.
- **Phase 6**: 루트 HTML 일괄 삭제 + Netlify 배포 전환 + dead 자산 제거 + 문서 갱신.

## Follow-ups
- [ ] Pagefind 검색 통합 (postbuild에 `npx pagefind --site dist`)
- [ ] docsify의 docsify-tabs 플러그인 사용 부분 → Astro 컴포넌트로 대체 (현재는 그대로 통과 — 사용 빈도 낮음)
- [ ] 코드 블럭 라인 번호/복사 버튼 (docsify의 copyCode 기능)
- [ ] `_sidebar.md`는 src/content/docs로 옮기지 않음. 루트 `docs/` 폴더 정리 시 함께 삭제 예정
- [ ] Phase 6에서 hackathon CSS 파일명 오타(`hackaton`) 같이 수정
