# Architecture

정적 웹사이트의 파일 구조와 구성 요소.

## 루트 레이아웃

```
roboseasy-website/
├── index.html              # 메인 홈
├── programs.html           # 프로그램 목록 + 상세 모달
├── documents.html          # 문서 허브
├── news.html               # 뉴스
├── hackathon-2026.html     # 해커톤 랜딩
├── docs-*.html             # 개별 문서 뷰어 페이지 (lekiwi, lerobot-library, lerobot-so-arm, xlerobot)
├── _redirects              # Netlify pretty URL 라우팅
├── feed.xml / site.xml     # Jekyll 생성 RSS / sitemap
├── css/                    # 페이지별 스타일시트
├── js/                     # 메인 스크립트 + 컴포넌트
├── docs/                   # docsify 기반 문서 콘텐츠 (md + 이미지)
├── img/                    # 이미지 리소스
└── videos/                 # 비디오 리소스
```

## 페이지 ↔ 스타일 ↔ 스크립트 매핑

| 페이지 | CSS | 비고 |
| --- | --- | --- |
| `index.html` | `style.css`, `reset.css`, `home.css` | 메인 |
| `programs.html` | `programs.css` | 프로그램 카드 + 모달 |
| `documents.html` | `documents.css` | 문서 카테고리 |
| `news.html` | `news.css` | 뉴스 목록 |
| `hackathon-2026.html` | `hackaton-2026.css` | 단발성 이벤트 (오타 주의: hackaTon) |
| `docs-*.html` | `docsify.css` | docsify 런타임 사용 |

공통 JS:
- `js/jquery-3.7.1.min.js` — 일부 레거시 인터랙션
- `js/main.js` — 글로벌 동작
- `js/sidebar-toggle.js` — 모바일 사이드바

## 컴포넌트 시스템

`js/components/` 안에 Web Components(Custom Elements) 형태로 공통 영역을 정의합니다.

- `main-header.js` → `<main-header>` : 상단 네비게이션
- `main-footer.js` → `<main-footer>` : 하단 푸터
- `main-banner.js` → `<main-banner>` : 메인 배너 슬라이드

각 페이지 HTML에서 해당 스크립트를 로드하고 커스텀 태그를 삽입하면 됩니다.

```html
<main-header></main-header>
<script src="js/components/main-header.js"></script>
```

## 라우팅

Netlify `_redirects`에서 `.html` 확장자를 제거한 pretty URL을 200 리다이렉트로 매핑합니다.
새 페이지를 추가할 때는 반드시 이 파일에 한 줄 추가하세요.

```
/{path}   /{path}.html   200
```

## 문서(docs) 시스템

`docs-*.html` 파일은 [docsify](https://docsify.js.org/)를 사용해 `docs/<topic>/` 하위의 마크다운을 렌더링합니다.
새 문서 카테고리를 만들 때는:

1. `docs/<topic>/` 폴더에 `_sidebar.md`, `README.md` 등 docsify 구조로 콘텐츠 작성
2. `docs-<topic>.html` 진입 페이지 생성 (기존 파일을 복제하여 `basePath`만 수정)
3. `documents.html`에 카드 추가
4. `_redirects`에 매핑 추가
