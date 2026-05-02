# Astro Migration — Phase 2 / hackathon (남은 페이지) + 완료

- Status: done (Phase 2 전체 종료)
- Started: 2026-05-02
- Owner: khw

## 추가 파일
- `src/pages/hackathon-2026.astro`
- `src/styles/pages/hackaton-2026.css` (오타 그대로 유지: hackaTon)
- `astro.config.mjs` 수정 — `/hackathon` → `/hackathon-2026` redirect 추가

## BaseLayout 변경
`chrome?: boolean` prop 추가. `chrome={false}`이면 `MainHeader`/`MainFooter`를
렌더하지 않음. hackathon 페이지처럼 자체 hero `<header>` + 자체 `<footer>`를
가진 랜딩 페이지에서 사용.

## 결정 사항

### 자체 chrome 유지
- 원본은 메인 네비게이션 없이 독립 랜딩 페이지로 디자인됨
- 컴포넌트 통일을 위해 강제로 `<MainHeader>` 추가 시 시각적 회귀 발생
- 1:1 충실도 우선, BaseLayout `chrome={false}`로 우회
- 후속 작업(별도 PR)에서 디자인 결정 후 통일 여부 검토

### `/hackathon` 리다이렉트
- 홈의 모바일 CTA 버튼이 `/hackathon`을 가리킴
- `astro.config.mjs`의 `redirects`에 매핑 추가 → 빌드 시 meta refresh HTML 생성
- 옛 Netlify `_redirects` 처리는 Phase 6에서 통합

### CSS 파일명 오타 유지
- `hackaton-2026.css`(T 빠짐). 원본 그대로 가져옴
- 수정하면 옛 라이브 사이트의 `_redirects`/캐시와 무관하지만, 일관성을 위해
  Phase 6 정리 시 한 번에 변경 예정

## Phase 2 전체 요약

| 페이지 | 새 경로 | 비고 |
| --- | --- | --- |
| `index.html` | `src/pages/index.astro` | 6 sections + 모바일 해커톤/스토어 버튼 |
| `documents.html` | `src/pages/documents.astro` | XLeRobot 카드 링크 버그 수정 |
| `news.html` | `src/pages/news.astro` | 임베드 데이터를 frontmatter 배열화 |
| `programs.html` | `src/pages/programs.astro` | 1:1 직접 이전 (Phase 3에서 콘텐츠 컬렉션 분해) |
| `hackathon-2026.html` | `src/pages/hackathon-2026.astro` | 자체 chrome 유지 (chrome={false}) |
| — | `/hackathon` redirect | astro.config.mjs |

빌드 결과: **6 page(s) + 1 redirect**, 850ms.

## 다음 (Phase 3)
- programs 모달 4개 → `src/content/programs/*.mdx` 분해
- `programs/index.astro` 카드 그리드 + `[slug].astro` 동적 라우트 또는 모달 데이터화

## Follow-ups
- [ ] `chrome={false}` 페이지에서도 `<MainHeader>` 표시할지 디자인 검토
- [ ] CSS 파일명 `hackaton` → `hackathon` 통일 (Phase 6)
