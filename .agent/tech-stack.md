# Tech Stack

## 프론트엔드

- **[Astro](https://astro.build/) 4.16** — 정적 사이트 생성기. `.astro` 컴포넌트 + 파일 기반 라우팅 + content collections. 빌드 결과는 정적 HTML
- **HTML5 / CSS3** — BEM 클래스 네이밍, `:root` CSS 변수 토큰
- **Vanilla JavaScript / TypeScript** — 페이지 인터랙션은 Astro `<script>` (모듈) 또는 `<script is:inline>` (전역 함수 노출, onclick 호환)
- **Font Awesome 6.5.1** — 아이콘 (CDN)
- **Pretendard** — 한글 웹폰트 (CDN, `tokens.css`에서 import)

## Astro 통합

- **[@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/) 3.2.1** — 빌드 시 `dist/sitemap-index.xml` 자동 생성

## 마크다운

- Astro 내장 markdown 렌더러 (remark/rehype 기반)
- 코드 하이라이팅: 내장 Shiki (빌드 타임)
- docsify에서 마이그레이션된 콜아웃: `?> **info**` → `> ℹ️ **info**` (표준 blockquote + 이모지)

## 빌드/배포

- **빌드 명령**: `npm run build` (Astro 정적 빌드, 약 1-2초)
- **호스팅**: Netlify
  - `netlify.toml`이 build/publish/Node 버전 지정
  - `public/_redirects`로 옛 URL의 SEO 리다이렉트
- **도메인**: https://roboseasy.netlify.app

## 로컬 개발

```bash
npm install            # 의존성 설치 (최초 1회)
npm run dev            # http://localhost:4321
npm run build          # dist/ 생성
npm run preview        # 프로덕션 번들 미리보기
```

> Node 20 LTS 필요 (`.nvmrc`). 시스템에 nvm이 있다면 `nvm use`로 자동 적용.
> 시스템 Node가 18.20.8 이상이면 Astro 4도 동작하지만, Netlify 빌드는 Node 20을 사용.

## 외부 통합

- **네이버 스마트스토어** (Shop 메뉴): https://smartstore.naver.com/roboseasy
- **Google Forms** (Education 신청): https://forms.gle/r1A5JYj4dYZQJNoq8
- **Instagram embed**: 홈/뉴스 페이지에서 `https://www.instagram.com/embed.js`
- **YouTube oEmbed**: 뉴스 페이지에서 `https://www.youtube.com/oembed?...`로 비디오 제목 fetch
- **검증 파일**: `public/googlef0b1a1e39ee27640.html`, `public/naver*.html` (사이트 소유 인증)
