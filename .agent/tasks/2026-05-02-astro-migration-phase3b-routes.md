# Astro Migration — Phase 3b (programs 모달 → 라우트)

- Status: done (로컬 빌드 통과)
- Started: 2026-05-02
- Owner: khw
- Plan: [.agent/refactor-astro-plan.md](../refactor-astro-plan.md)

## 목표
Phase 3a에서 분리한 모달 본체 3개를 별도 라우트(`/programs/<slug>`)로 승격.
뒤로가기·URL 공유·SEO 가능. Phase 3 전체 종료.

## 추가/수정/이름변경 파일
- **rename + 수정**: `Sts3215Modal.astro` → `Sts3215Detail.astro` (외곽 overlay/modal/close-btn 래퍼 9줄 제거)
- **rename + 수정**: `KeyboardTeleopModal.astro` → `KeyboardTeleopDetail.astro`
- **rename + 수정**: `EndeffectorTeleopModal.astro` → `EndeffectorTeleopDetail.astro`
- **신규**: `src/pages/programs/[slug].astro` — `getStaticPaths`로 컬렉션 → 3 라우트, 슬러그→Detail 컴포넌트 매핑
- **수정**: `src/components/programs/ProgramCard.astro` — 자세히 보기 버튼을 `<a href="/programs/${slug}">` 로 변경, onclick 제거
- **수정**: `src/pages/programs.astro` — 모달 컴포넌트 임포트/렌더 제거, 모달 트리거/오버레이/ESC 스크립트 제거. `handleDownload`만 유지 (다운로드 버튼 호환)

## 결정 사항

### 모바일 가드 제거
사용자 결정: 라우트 전환과 함께 PC 전용 alert 차단 제거.
모바일도 페이지 진입 가능. CSS는 PC 기반이라 일부 어긋남 있을 수 있으나 후속 디자인 작업에서 보강.

### `program-modal__*` 클래스명 유지
대량 클래스명 재명명은 Phase 6 dead CSS 정리 시 일괄 진행. 지금은 detail 페이지가 같은 클래스를 그대로 사용하고, 페이지에서만 모달 전용 제약(max-height, overflow)을 `[slug].astro`의 `<style is:global>`로 오버라이드.

### `program-detail` 래퍼 추가
`<section class="program-detail">` + `<div class="program-detail__container">`로 감싸 페이지 컨텍스트 부여. 내부 `program-modal__content`는 모달 외곽 효과 없이 정상 페이지 박스로 렌더.

### 뒤로가기 링크
`<a href="/programs">← 프로그램 목록으로</a>` 추가하여 카드 그리드로 복귀 UX 제공.

## 빌드 결과
```
npm run build → 9 page(s) + 1 redirect, 1.16s
```

생성된 라우트:
- `/programs/sts3215-motor-test`
- `/programs/keyboard-teleop`
- `/programs/endeffector-teleop`

빌드 산출물 검증:
- `dist/programs/sts3215-motor-test/index.html`에 `program-modal-overlay` 클래스 0개 (외곽 래퍼 제거 확인)
- `program-modal__content` 4개 (탭별 panels의 modal-tab-panel--active 검색 등에서 사용됨)
- `switchModalTab`, `handleDownload` 전역 함수 정상 노출

## Phase 3 전체 종료

| Phase | 내용 | 커밋 |
| --- | --- | --- |
| 3a | 카드 메타데이터 컬렉션화 + 모달 본체 컴포넌트 분리 | c03749b |
| 3b | 모달 → `/programs/<slug>` 라우트 전환 | (이번) |

`programs.astro`: Phase 2 후 1,191줄 → Phase 3a 후 110줄 → Phase 3b 후 **38줄**.
모달 트리거 스크립트(60+줄) 완전 제거.

## 다음 (Phase 4)
docsify 4개 페이지(`docs-lerobot-library`, `docs-lerobot-so-arm`, `docs-lekiwi`, `docs-xlerobot`)를 통합 docs 시스템으로 이전. 단일 `[...slug].astro` 동적 라우트 + content collection + Pagefind 검색.

## Follow-ups
- [ ] Phase 6: `program-modal__*` 클래스명 → `program-detail__*`로 정리
- [ ] Phase 6: dead CSS (`.program-modal-overlay`, `.program-modal`, `.program-modal__close`) 제거
- [ ] (선택) detail 페이지 모바일 반응형 보강 (별도 디자인 작업)
