# Astro Migration — Phase 2 / index (홈 페이지 이전)

- Status: done (로컬 빌드 통과)
- Started: 2026-05-02
- Owner: khw
- Plan: [.agent/refactor-astro-plan.md](../refactor-astro-plan.md)

## 목표
`index.html` (244줄)을 `src/pages/index.astro`로 이전. 라이브 사이트는 그대로
`index.html`을 서빙(Netlify 설정 미변경) — 새 페이지는 로컬 빌드에서만 활성화.

## 추가/수정된 파일
- `src/pages/index.astro` (신규) — BaseLayout + MainBanner + 6개 content-section
- `src/styles/pages/home.css` (신규) — `css/home.css` 복제

## 결정 사항

### 스크롤 애니메이션 스크립트
- 기존 `js/main.js`의 `.content-section` 인터섹션 옵저버 부분만 추출해 `index.astro`의 인라인 `<script>`로 이동
- 뉴스 탭/유튜브 oEmbed 로직은 news.html 전용이라 본 페이지에서 제외 (`news.astro`로 이전 시 함께 이동 예정)

### Instagram embed
- 기존 `<script async src="//www.instagram.com/embed.js">`를 `is:inline` + `https:` 절대 URL로 변경
- Astro가 빌드 시 처리하지 않고 그대로 출력하도록 `is:inline`

### 이미지 경로
- `img/...` (상대) → `/img/...` (절대)
- `public/img → ../img` 심볼릭 링크 덕분에 빌드 시 `dist/img/`로 자동 복사됨

## 검증 결과
```
npm run build
→ 2 page(s) built (index + phase0-check)
```

빌드 산출물 `dist/index.html` 확인:
- ✓ og:title, og:url 등 메타 태그 정상
- ✓ trusted-by / what-we-do / who-we-are / community 섹션 마크업 출력
- ✓ /img/* 절대경로로 이미지 참조

## 남은 Phase 2 작업
- [ ] `documents.html` → `src/pages/documents.astro`
- [ ] `news.html` → `src/pages/news.astro` (탭 + YouTube oEmbed 스크립트 함께 이전)
- [ ] `hackathon-2026.html` → `src/pages/hackathon-2026.astro` (인라인 CSS/JS 정리 필요)

## Follow-ups
- [ ] 콘텐츠 섹션 마크업 반복(decorators 3개 span)을 `<ContentSection>` 컴포넌트로 추출 검토
- [ ] About/Who We Are/What We Do 카드 데이터를 frontmatter로 분리 (선택)
