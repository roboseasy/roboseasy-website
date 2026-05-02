# Tasks

진행 중이거나 완료된 작업 단위 메모를 보관합니다.

## 사용법

큰 작업(여러 파일 수정, 며칠 걸리는 기능)에 한해 파일 하나를 만듭니다.

- 파일명: `YYYY-MM-DD-<slug>.md` (예: `2026-05-02-add-xlerobot-docs.md`)
- 상단에 상태 표시: `Status: in-progress` / `done` / `blocked`

## 템플릿

```markdown
# <작업 제목>

- Status: in-progress
- Started: 2026-05-02
- Owner: khw

## 목표 (Why)
무엇을 왜 하려는가.

## 범위 (Scope)
- 포함: ...
- 제외: ...

## 진행 메모 (Log)
- 2026-05-02: 초기 분석 완료
- 2026-05-03: ...

## 결정 사항 (Decisions)
- A 대신 B를 선택한 이유: ...

## 후속 작업 (Follow-ups)
- [ ] ...
```

작은 작업(한두 커밋)이면 굳이 만들지 말고 바로 커밋 메시지에 의도를 담으세요.
