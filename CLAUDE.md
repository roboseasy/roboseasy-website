# RoboSEasy Website

로보시지(RoboSEasy) 공식 웹사이트. 로봇 교육·제품·기술 콘텐츠를 제공하는 정적 웹사이트.

- **배포**: Netlify (https://roboseasy.netlify.app)
- **스택**: 순수 HTML / CSS / Vanilla JS + Jekyll(템플릿/사이트맵용)
- **언어**: 한국어 우선, 영어 보조

## 작업 시 먼저 읽을 문서

새 작업을 시작하기 전 아래 문서를 컨텍스트로 사용하세요.

- [.agent/architecture.md](.agent/architecture.md) — 폴더 구조, 페이지 구성, 컴포넌트 시스템
- [.agent/tech-stack.md](.agent/tech-stack.md) — 사용 기술, 로컬 실행/배포 방법
- [.agent/conventions.md](.agent/conventions.md) — 코딩/네이밍/커밋 규칙
- [.agent/workflows.md](.agent/workflows.md) — 자주 하는 작업 절차 (페이지 추가, 프로그램 추가 등)
- [.agent/known-issues.md](.agent/known-issues.md) — 알려진 이슈, 주의사항
- [.agent/tasks/](.agent/tasks/) — 진행/완료된 작업 단위 메모

## 기본 원칙

- 정적 사이트이므로 빌드 단계 없음. HTML/CSS/JS를 직접 수정하면 즉시 반영.
- `<main-header>`, `<main-footer>`, `<main-banner>` 같은 Web Components로 공통 영역을 재사용.
- 새 페이지 추가 시 `_redirects`에 pretty URL 매핑 추가 필요.
- 커밋 메시지는 `FEAT:`, `UPDATE:`, `ADD:`, `FIX:` prefix 사용 (자세한 건 conventions.md).
