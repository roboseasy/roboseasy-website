# RoboSEasy Website

로보시지(RoboSEasy) 공식 웹사이트.

- 배포: https://roboseasy.ai
- 스택: [Astro](https://astro.build/) (정적 사이트 생성기) + Netlify

## 로컬에서 실행하기

Node 20 LTS가 필요합니다. (시스템에 nvm이 있다면 `nvm use`로 자동 적용)

```bash
npm install        # 의존성 설치 (최초 1회)
npm run dev        # http://localhost:4321 에서 핫 리로드
npm run build      # dist/ 정적 빌드
npm run preview    # 프로덕션 번들 미리보기
```

## 프로젝트 구조

```
roboseasy-website/
├── astro.config.mjs            # Astro 설정 (output: hybrid, netlify 어댑터, sitemap·astro-icon 통합)
├── netlify.toml                # Netlify 빌드 (dist 배포, Node 20)
├── public/                     # 그대로 dist로 복사되는 정적 자산
│   ├── admin/                  # Sveltia CMS (/admin 콘텐츠 편집)
│   ├── img/                    # 페이지별 이미지 폴더 (common_img/, index_img/, ...)
│   ├── videos/                 # 조립 가이드 mp4
│   ├── _redirects              # 옛 docsify/.html URL → 새 라우트 (SEO)
│   ├── robots.txt              # sitemap-index.xml 가리킴
│   └── google*.html, naver*.html  # 검증 파일
├── src/
│   ├── layouts/BaseLayout.astro       # 공통 head/header/footer
│   ├── components/                    # 헤더/푸터/배너, docs/, programs/, shop/
│   ├── pages/                         # 파일 기반 라우팅 (+ SSR API)
│   │   ├── index.astro               → /
│   │   ├── products.astro            → /products
│   │   ├── products/[id].astro       → /products/<id> 상세
│   │   ├── programs.astro            → /programs (카드 그리드)
│   │   ├── programs/[slug].astro     → /programs/sts3215-motor-test 등
│   │   ├── contact.astro             → /contact
│   │   ├── docs/[...slug].astro      → /docs/lerobot-so-arm/setup-... 등
│   │   └── api/                      # SSR 엔드포인트 (contact, quote-download)
│   ├── content/                       # Content Collections
│   │   ├── programs/*.json           # 카드 메타데이터
│   │   └── docs/<category>/*.md      # 마크다운 + frontmatter
│   ├── data/                          # 컬렉션 외 데이터 (news, products)
│   ├── lib/                           # 서버 로직 (견적서 엑셀 생성)
│   ├── excel/                         # 견적서 템플릿(xlsx)
│   └── styles/                        # 토큰/리셋/페이지별 CSS
└── .agent/                            # 개발 가이드 (아래 참고)
```

## 새 콘텐츠 추가

- **새 프로그램**: `src/content/programs/<slug>.json` 추가 (썸네일은 `public/img/`)
- **새 docs 페이지**: `src/content/docs/<category>/<slug>.md` 작성, frontmatter에 title/category/group/order
- 자세한 절차: [.agent/workflows.md](.agent/workflows.md)

## 배포

`main` 브랜치 푸시 시 Netlify가 자동으로 `npm run build` 실행 후 `dist/` 배포.

```bash
git push origin main
```

## 개발 가이드

- [CLAUDE.md](CLAUDE.md) — Claude Code(또는 새 컨트리뷰터)를 위한 진입점
- [.agent/architecture.md](.agent/architecture.md) — 폴더 / 라우팅 / 컴포넌트
- [.agent/tech-stack.md](.agent/tech-stack.md) — Astro / 의존성 / 외부 통합
- [.agent/conventions.md](.agent/conventions.md) — 네이밍 / CSS / 커밋 규칙
- [.agent/workflows.md](.agent/workflows.md) — 페이지·프로그램·docs 추가 절차
- [.agent/known-issues.md](.agent/known-issues.md) — 알려진 이슈, 함정
