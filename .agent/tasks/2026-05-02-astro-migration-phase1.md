# Astro Migration — Phase 1 (레이아웃 & 공통 컴포넌트)

- Status: done (로컬 검증 완료)
- Started: 2026-05-02
- Owner: khw
- Plan: [.agent/refactor-astro-plan.md](../refactor-astro-plan.md)

## 목표
공통 레이아웃과 헤더/푸터/배너/SEO 메타 컴포넌트를 Astro 컴포넌트로 포팅.
페이지 마이그레이션은 Phase 2에서 시작.

## 추가/수정된 파일
- `src/layouts/BaseLayout.astro` (신규) — `<html lang="ko">`, head, SeoMeta props, MainHeader/Footer 슬롯 구조
- `src/components/SeoMeta.astro` (신규) — OG/Twitter 메타 태그 + canonical을 props로 받아 단일 정의
- `src/components/MainHeader.astro` (신규) — `js/components/main-header.js`에서 1:1 포팅, 모바일 메뉴 토글 인라인 스크립트
- `src/components/MainFooter.astro` (신규) — `js/components/main-footer.js`에서 1:1 포팅
- `src/components/MainBanner.astro` (신규) — `js/components/main-banner.js`에서 1:1 포팅
- `src/styles/tokens.css` (신규) — Pretendard 폰트 import + `:root` 색상/폰트 웨이트 변수
- `src/styles/reset.css` (신규) — `css/reset.css` 복제
- `src/styles/global.css` (신규) — `css/style.css`의 :root 제외 부분 복제, `../img/` → `/img/` 절대경로로 수정
- `public/img` (심볼릭 링크) — 기존 `img/`를 Astro `public/`에 노출
- `src/pages/phase0-check.astro` (수정) — BaseLayout 사용 검증

## 결정 사항

### 이미지 경로: 심볼릭 링크
- `img/`를 `src/assets/`로 옮기는 대신 `public/img → ../img` 심볼릭 링크 생성
- 기존 사이트와 자산 위치를 공유 → 라이브 사이트 무영향
- Phase 6에서 정식 정리 (`src/assets/` + 카테고리 폴더)

### CSS 분리
- `:root` 변수와 Pretendard import를 `tokens.css`로 분리
- 나머지(헤더/푸터/배너/반응형)는 `global.css`로
- `BaseLayout`이 tokens → reset → global 순으로 import

### 모바일 메뉴 스크립트
- 기존 Custom Element(`<main-header>`) 대신 일반 `<header>` 마크업 + 인라인 `<script>` 사용
- Astro가 페이지 이동 시 새로 로드하므로 한 번만 바인딩하면 됨
- 동작은 기존 `js/components/main-header.js`와 동일

## 검증 결과
```
npm run build
→ 1 page(s) built in 537ms
```

빌드된 `dist/phase0-check/index.html` 검사:
- ✓ canonical, og:type/title/description/image/url, twitter:card 정상
- ✓ og:image 절대 URL (`https://roboseasy.netlify.app/img/banner.png`)
- ✓ 헤더 마크업 + 모바일 메뉴 토글 스크립트 번들됨
- ✓ 배너/푸터 마크업 정상
- ✓ CSS 번들: `/_astro/phase0-check.*.css`
- ✓ `dist/img/` 심볼릭 링크 따라 자산 복사 정상

## 다음 (Phase 2)
1. `index.html` → `src/pages/index.astro` (홈)
2. `documents.html` → `src/pages/documents.astro`
3. `news.html` → `src/pages/news.astro`
4. `hackathon-2026.html` → `src/pages/hackathon-2026.astro`
5. 페이지별 CSS(`home.css`, `documents.css`, `news.css`, `hackaton-2026.css`)를 페이지 컴포넌트에서 import
6. `phase0-check.astro` 제거

## Follow-ups
- [ ] Pretendard `@import`를 `<link>`로 바꿔 FOUC 줄이기 (성능 최적화)
- [ ] `MainBanner`를 페이지별로 다른 카피를 받게 props화 (현재는 home/news/documents 모두 동일 콘텐츠)
- [ ] 모바일 메뉴 스크립트를 `src/scripts/`로 분리할지 검토 (현재는 컴포넌트 인라인)
