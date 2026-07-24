# Astro Migration — Phase 3a (programs 분해)

- Status: done (로컬 빌드 통과)
- Started: 2026-05-02
- Owner: khw
- Plan: [.agent/refactor-astro-plan.md](../refactor-astro-plan.md)

## 목표
Phase 2의 1:1 직접 이전으로 만들어진 `programs.astro` (1,191줄)을 분해.
카드 메타데이터를 content collection으로, 모달 본체를 컴포넌트 파일로 분리.
모달 UX는 유지 (Phase 3b에서 라우트 전환 여부 결정).

## 추가/수정된 파일
- `src/content/config.ts` (신규) — `programs` 컬렉션 zod 스키마 (slug, title, description, thumbnail, downloadUrl, order)
- `src/content/programs/sts3215-motor-test.json` (신규)
- `src/content/programs/keyboard-teleop.json` (신규)
- `src/content/programs/endeffector-teleop.json` (신규)
- `src/components/programs/ProgramCard.astro` (신규) — 데이터 props 받는 카드
- `src/components/programs/Sts3215Modal.astro` (신규, 추출) — 326줄
- `src/components/programs/KeyboardTeleopModal.astro` (신규, 추출) — 202줄
- `src/components/programs/EndeffectorTeleopModal.astro` (신규, 추출) — 250줄
- `src/pages/programs.astro` (재작성) — 1,191 → 110줄

## 결정 사항

### 모달 UX 유지
원래 기획서는 모달 → 별도 라우트 전환 권장이었으나, 시각적 회귀 없는 분해를
먼저 진행. 라우트 전환은 별도 PR(Phase 3b)에서 사용자 확인 후 결정.

### 고아 motor-control 모달 제거
`programs.html`에 정의되어 있던 motor-control 모달은 어떤 카드에서도
호출하지 않는 dead code였음 (233줄). 분해 시 함께 제거.

### 모달 ID와 슬러그 매핑
모달 overlay HTML id (sts3215ModalOverlay 등)는 그대로 유지하고,
스크립트에 `modalOverlayIdBySlug` 매핑 객체 추가하여 카드의 슬러그로
모달을 열도록 통일. 기존 onclick 어트리뷰트와 호환.

### 컴포넌트 파일 형식
플랜은 MDX 권장이었으나, 모달 본체가 산문이 아니라 구조적 HTML
(modal-tab, modal-accordion, switchModalTab 호출 등)이라 .astro 파일이 적합.
MDX는 docs(Phase 4)에서 사용.

## 파일 크기 비교

| 파일 | Before | After |
| --- | --- | --- |
| `src/pages/programs.astro` | 1,191줄 | 110줄 |
| 모달 컴포넌트 3개 | (인라인) | 778줄 (분리) |
| 카드 데이터 | (HTML 마크업) | JSON 3개 |
| 고아 모달 | 233줄 | 0줄 (제거) |

## 검증
```
npm run build → 6 pages + 1 redirect, 1.06s
```
- `/programs` 카드 그리드는 컬렉션 데이터로 렌더
- 카드 클릭 → 슬러그 매핑 → 해당 모달 오픈
- ESC, 오버레이 클릭, X 버튼 닫기 모두 동작 (위임 핸들러)
- 탭 전환, 아코디언 토글 변동 없음

## 다음
- **Phase 3b (선택)**: 모달 → `/programs/[slug]` 라우트 전환
- **Phase 4**: docsify(`docs-*.html`) → 통합 docs 시스템
