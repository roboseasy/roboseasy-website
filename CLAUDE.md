# RoboSEasy Website

로보시지(RoboSEasy) 공식 웹사이트. 로봇 교육·제품·기술 콘텐츠를 제공.

- **배포**: Netlify (https://roboseasy.ai)
- **스택**: [Astro](https://astro.build/) 4 + Vanilla CSS/JS — 빌드 타임 정적 HTML
- **언어**: 한국어 우선, 영어 보조

## 작업 시 먼저 읽을 문서

- [.agent/architecture.md](.agent/architecture.md) — 폴더 구조, 라우팅, 컴포넌트
- [.agent/tech-stack.md](.agent/tech-stack.md) — Astro, 의존성, 외부 통합
- [.agent/conventions.md](.agent/conventions.md) — 코딩·네이밍·커밋 규칙
- [.agent/workflows.md](.agent/workflows.md) — 페이지/프로그램/docs 추가 절차
- [.agent/known-issues.md](.agent/known-issues.md) — 알려진 이슈, 주의사항
- [.agent/tasks/](.agent/tasks/) — 진행/완료 작업 단위 메모
- [.agent/refactor-astro-plan.md](.agent/refactor-astro-plan.md) — Astro 마이그레이션 기획서

## 기본 원칙

- **빌드 단계 있음**: `npm run dev` / `npm run build`. Node 20 LTS (.nvmrc)
- **공통 레이아웃**: 모든 페이지가 `BaseLayout`을 상속 — head/header/footer 한 곳에서만 관리
- **콘텐츠 = 데이터/마크다운**: 프로그램은 `src/content/programs/*.json`, 문서는 `src/content/docs/<cat>/*.md`
- **자산 절대경로**: `/img/...`, `/videos/...` 형식. 파일은 `public/`에 위치
- **새 페이지 추가** 시 `_redirects` 수정 불필요 (Astro 라우팅이 처리). 옛 URL 호환만 `public/_redirects`에 추가
- 커밋 메시지: `FEAT:`, `UPDATE:`, `ADD:`, `FIX:`, `REFACTOR:`, `DOCS:`, `CHORE:` prefix
