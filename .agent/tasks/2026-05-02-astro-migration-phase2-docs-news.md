# Astro Migration — Phase 2 / documents + news

- Status: done (로컬 빌드 통과)
- Started: 2026-05-02
- Owner: khw

## 추가 파일
- `src/pages/documents.astro`
- `src/pages/news.astro`
- `src/styles/pages/documents.css`
- `src/styles/pages/news.css`

## 결정 사항

### XLeRobot 카드 링크 버그 수정
원본 `documents.html` line 72/80에서 XLeRobot 카드가 `/docs-lerobot-so-arm.html#/`로
잘못 링크되어 있었음 (복붙 오류로 보임). 마이그레이션 시 `/docs-xlerobot.html#/`로 수정.

### docs- 링크는 그대로
documents 페이지의 `/docs-lerobot-library.html#/` 등 docsify 진입 링크는 유지.
Phase 4(docs 통합) 때 `/docs/lerobot-library/` 형태로 일괄 갱신.

### News 페이지 데이터 추출
원본의 반복 마크업(Instagram 포스트 8 + 릴스 2 + YouTube 8)을 frontmatter 배열로
정리하여 `.map()`으로 렌더. 추가/제거가 배열 한 줄 수정으로 처리됨.

### YouTube oEmbed 제목 로딩
기존 `js/main.js`의 비동기 fetch 로직을 페이지 인라인 스크립트로 이전.
탭 전환 로직도 함께. TypeScript 문법 사용 (`<HTMLElement>` 제네릭).

### `onerror` 폴백 제거
원본 `<img onerror="this.src='img/placeholder-robot.png'">` 폴백 제거.
`img/placeholder-robot.png`는 실제로 존재하지 않아 의미 없는 fallback이었음.

## 검증
```
npm run build → 4 page(s) built (index, documents, news, phase0-check)
```

## 남은 Phase 2
- [ ] `hackathon-2026.html` → `src/pages/hackathon-2026.astro`
