# RoboSEasy Website

로보시지(RoboSEasy) 공식 웹사이트.

- 배포: https://roboseasy.netlify.app
- 스택: HTML / CSS / Vanilla JS (Web Components) + Jekyll(템플릿) + Netlify(배포)

## 로컬에서 실행하기

빌드 단계가 없는 정적 사이트라 정적 서버만 띄우면 됩니다.

### 권장: `npx serve` (Node)

`_redirects`의 pretty URL(`.html` 확장자 제거)이 정상 동작하므로, 실제 배포와 가장 가깝습니다.

```bash
cd /path/to/roboseasy-website
npx serve .
```

→ http://localhost:3000 에서 접속. `/programs`, `/documents` 같은 깔끔한 경로가 그대로 동작합니다.

### 대안 1: Netlify CLI

`_redirects`를 Netlify 환경 그대로 시뮬레이션합니다.

```bash
npm install -g netlify-cli
netlify dev
```

→ http://localhost:8888

### 대안 2: Python (간단하지만 제약 있음)

```bash
python3 -m http.server 8000
```

→ http://localhost:8000

> ⚠️ 이 방법은 `_redirects`를 처리하지 못하므로 `/programs` 같은 pretty URL은 404가 납니다.
> `/programs.html` 처럼 확장자를 직접 붙여 접근해야 합니다. 빠른 단일 페이지 확인용으로만 사용하세요.

### 대안 3: VSCode Live Server 확장

저장 시 자동 새로고침을 원하면 VSCode "Live Server" 확장 설치 후
`index.html` 우클릭 → **Open with Live Server**.
(단, Python과 마찬가지로 pretty URL은 미지원)

## 프로젝트 구조

```
roboseasy-website/
├── index.html              # 메인 홈
├── programs.html           # 프로그램 목록 + 상세 모달
├── documents.html          # 문서 허브
├── news.html               # 뉴스
├── hackathon-2026.html     # 해커톤 랜딩
├── docs-*.html             # 개별 문서 뷰어 (docsify)
├── _redirects              # Netlify pretty URL 라우팅
├── css/                    # 페이지별 스타일시트
├── js/components/          # Web Components (header / footer / banner)
├── docs/                   # docsify용 마크다운 콘텐츠
├── img/ , videos/          # 정적 리소스
└── .agent/                 # 개발 가이드 문서 (아래 참고)
```

## 배포

`main` 브랜치에 푸시하면 Netlify가 자동 배포합니다. 별도 빌드 스텝은 없습니다.

```bash
git push origin main
```

## 개발 가이드

이 저장소에서 작업할 때 참고할 문서들입니다.

- [CLAUDE.md](CLAUDE.md) — Claude Code(또는 새 컨트리뷰터)를 위한 진입점
- [.agent/architecture.md](.agent/architecture.md) — 페이지 / 컴포넌트 / 라우팅 구조
- [.agent/tech-stack.md](.agent/tech-stack.md) — 기술 스택 / 외부 통합
- [.agent/conventions.md](.agent/conventions.md) — 네이밍 / CSS / JS / 커밋 규칙
- [.agent/workflows.md](.agent/workflows.md) — 페이지 추가, 프로그램 추가 등 절차
- [.agent/known-issues.md](.agent/known-issues.md) — 알려진 이슈와 함정
