# Tech Stack

## 프론트엔드

- **HTML5** — 페이지마다 단일 파일 (`index.html`, `programs.html` ...)
- **CSS3** — 페이지별 분리. BEM 스타일 클래스 네이밍 사용 (`.header__nav-item` 등)
- **Vanilla JavaScript (ES6+)** — Custom Elements / Web Components
- **jQuery 3.7.1** — 일부 레거시 인터랙션에서만 사용. 신규 코드에는 가급적 vanilla 사용 권장
- **Font Awesome 6.5.1** — CDN

## 외부 라이브러리

- **docsify** — `docs-*.html` 페이지에서 마크다운 문서 렌더링 (CDN 로드)

## 빌드/배포

- **빌드 단계 없음** — 정적 파일을 그대로 서빙
- **Jekyll** — `feed.xml`, `site.xml`만 Jekyll 템플릿 문법으로 작성됨. 사이트 자체는 Jekyll 의존 아님
- **Netlify** — 자동 배포. `_redirects`로 라우팅 처리
- **도메인** — https://roboseasy.netlify.app

## 로컬 실행

빌드 없이 정적 서버만 띄우면 됩니다. **권장은 `npx serve`** — `_redirects`의 pretty URL이 그대로 동작합니다.

```bash
# 권장: Node serve (pretty URL 정상 동작) → http://localhost:3000
npx serve .

# 배포 환경과 가장 비슷 → http://localhost:8888
netlify dev

# 간단하지만 pretty URL 미지원 (/programs.html 처럼 확장자 직접 입력 필요)
python3 -m http.server 8000
```

> `python3 -m http.server`나 VSCode Live Server는 `_redirects`를 처리하지 못합니다.
> `/programs`, `/documents` 같은 경로 테스트가 필요하면 `npx serve` 또는 `netlify dev`를 사용하세요.

## 외부 통합

- **네이버 스마트스토어** (Shop): https://smartstore.naver.com/roboseasy
- **Google Forms** (Education 신청): https://forms.gle/r1A5JYj4dYZQJNoq8
- **검증 파일**: `googlef0b1a1e39ee27640.html`, `naver*.html` (사이트 소유 인증용 — 건드리지 말 것)
