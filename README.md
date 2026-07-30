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
├── public/            # 빌드 시 dist/로 그대로 복사되는 정적 자산
│   ├── admin/         # Sveltia CMS (/admin 콘텐츠 편집 화면)
│   ├── img/           # 페이지별 이미지 — common_img, index_img, products_img,
│   │                  #   programs_img, documents_img,
│   │                  #   assembly, so_arm, uploads
│   └── videos/        # 조립 가이드 영상
├── src/
│   ├── layouts/       # 공통 레이아웃 (head/header/footer)
│   ├── components/    # 공용 컴포넌트 — docs/, programs/, shop/ 하위 그룹
│   ├── pages/         # 파일 기반 라우팅 — products/, programs/, docs/ 하위 라우트와
│   │                  #   api/ SSR 엔드포인트
│   ├── content/       # Content Collections — programs/, docs/, legal/
│   ├── data/          # 컬렉션 밖 데이터 (뉴스, 제품)
│   ├── lib/           # 서버·공용 로직
│   ├── excel/         # 견적서 xlsx 템플릿
│   └── styles/        # 전역 토큰·리셋과 pages/ 페이지별 CSS
├── .agent/            # 개발 가이드 문서 — archive/ 완료 기록
└── dist/ · .astro/ · .netlify/    # 빌드·배포 산출물 (git 미추적)
```

루트에 `astro.config.mjs`(Astro 설정)와 `netlify.toml`(배포 설정)이 있습니다.
라우트 목록과 파일 단위 설명은 [.agent/frontend.md](.agent/frontend.md)를 참고하세요.

## 새 콘텐츠 추가

- **새 프로그램**: `src/content/programs/<slug>.json` 추가 (썸네일은 `public/img/`)
- **새 docs 페이지**: `src/content/docs/<category>/<slug>.md` 작성, frontmatter에 title/category/group/order
- 자세한 절차: [.agent/frontend.md](.agent/frontend.md)의 "작업 절차"

## 배포

`main` 브랜치 푸시 시 Netlify가 자동으로 `npm run build` 실행 후 `dist/` 배포.

```bash
git push origin main
```

## 개발 가이드

- [CLAUDE.md](CLAUDE.md) — Claude Code(또는 새 컨트리뷰터)를 위한 진입점
- [.agent/frontend.md](.agent/frontend.md) — 프론트엔드: 폴더/라우팅/컨벤션/작업 절차
- [.agent/system-architecture.md](.agent/system-architecture.md) — 시스템 아키텍처 / 기술 스택
- [.agent/operations.md](.agent/operations.md) — 배포·테스트·운영
- [.agent/issues.md](.agent/issues.md) — 알려진 이슈, 함정
