# RoboSEasy Website

로보시지(RoboSEasy) 공식 웹사이트. 로봇 교육·제품·기술 콘텐츠를 제공.

- **배포**: Netlify (https://roboseasy.ai)
- **스택**: [Astro](https://astro.build/) 4 + Vanilla CSS/JS — 빌드 타임 정적 HTML
- **언어**: 한국어 우선, 영어 보조

## 작업 시 먼저 읽을 문서

- [.agent/frontend.md](.agent/frontend.md) — 프론트엔드: 폴더 구조·라우팅·컨벤션·작업 절차
- [.agent/system-architecture.md](.agent/system-architecture.md) — 시스템 아키텍처·기술 스택·외부 통합
- [.agent/operations.md](.agent/operations.md) — 배포·테스트·운영 (로컬 개발, 환경변수, CMS 운영)
- [.agent/issues.md](.agent/issues.md) — 알려진 이슈·주의사항·TODO
- [.agent/archive/](.agent/archive/) — 완료된 역사 기록 (Astro 마이그레이션 기획·작업 메모)

> 회원·주문·결제 백엔드는 이 브랜치 범위가 아니다 — 별도 브랜치에서 관리한다. 서버 호출은 문의 메일·견적서 두 건뿐이고 데이터베이스는 쓰지 않는다.

## 기본 원칙

- **빌드 단계 있음**: `npm run dev` / `npm run build`. Node 20 LTS (.nvmrc)
- **공통 레이아웃**: 모든 페이지가 `BaseLayout`을 상속 — head/header/footer 한 곳에서만 관리
- **콘텐츠 = 데이터/마크다운**: 프로그램은 `src/content/programs/*.json`, 문서는 `src/content/docs/<cat>/*.md`
- **자산 절대경로**: `/img/...`, `/videos/...` 형식. 파일은 `public/`에 위치
- **새 페이지 추가** 시 `_redirects` 수정 불필요 (Astro 라우팅이 처리). 옛 URL 호환만 `public/_redirects`에 추가
- 커밋 메시지: `FEAT:`, `UPDATE:`, `ADD:`, `FIX:`, `REFACTOR:`, `DOCS:`, `CHORE:` prefix
