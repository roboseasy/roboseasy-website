# Conventions

## 파일/폴더 네이밍

- HTML 페이지: `kebab-case.html` (예: `hackathon-2026.html`)
- 문서 뷰어 페이지: `docs-<topic>.html` 형태로 통일
- CSS: 페이지명과 매칭되는 파일 (`programs.html` ↔ `css/programs.css`)
- 이미지: `kebab-case.png` (예: `endeffector-teleop-gui.png`)
- JS 컴포넌트: `js/components/<component-name>.js` → 태그명도 같은 이름 (`<main-header>`)

## CSS 클래스 네이밍

BEM 컨벤션을 사용합니다.

```
.block__element--modifier
.header__nav-link
.program-card__title--featured
```

신규 컴포넌트 작성 시 페이지명을 prefix로 두면 충돌을 피하기 좋습니다.

## JavaScript

- 신규 코드는 **Vanilla JS / Web Components** 우선
- jQuery는 기존 코드 유지보수 한정
- Custom Element 클래스는 PascalCase, 태그는 kebab-case 두 단어 이상 (`MainHeader` → `<main-header>`)
- `connectedCallback` 안에서 `innerHTML` 템플릿을 정의하고, 그 뒤에 이벤트 바인딩

## 다국어/문자열

- 사용자 노출 텍스트는 **한국어**가 기본
- 영문 병기는 가독성·SEO에 도움될 때만 (예: 메뉴 항목)
- meta 태그(`og:title`, `og:description`)는 한국어로 작성

## 커밋 메시지

기존 히스토리에서 사용 중인 prefix를 따릅니다.

| Prefix | 용도 |
| --- | --- |
| `FEAT:` | 새 기능 / 새 페이지 |
| `ADD:` | 콘텐츠/리소스 추가 (이미지, 문서, 팁 등) |
| `UPDATE:` | 기존 기능/UI 개선 |
| `FIX:` | 버그 수정 |
| `REFACTOR:` | 동작 변경 없는 코드 정리 |
| `DOCS:` | 문서/주석 변경 |
| `CHORE:` | 설정·메타데이터 변경 |

제목은 영어로 간결하게 (예: `UPDATE: Redesign Program Detail Modal with Tab Navigation`).

## 이미지/미디어

- `img/` 루트에 직접 두거나 주제별 하위 폴더 (`img/lerobot_library/`, `img/so_arm/`, `img/assembly/`)
- OpenGraph 배너는 `img/banner.png` 사용 (1200×630 권장)
- 큰 동영상은 `videos/`에 두되, 필요 시 외부 호스팅 고려

## 새 페이지를 만들 때 체크리스트

1. HTML 파일 생성 (기존 페이지를 복제해 헤더/푸터 임포트 유지)
2. 전용 CSS 분리 (`css/<page>.css`)
3. `<main-header>`, `<main-footer>` 포함
4. OpenGraph / Twitter 메타 태그 채우기
5. `_redirects`에 pretty URL 매핑 추가
6. (필요 시) `main-header.js`의 네비게이션 메뉴에 항목 추가
