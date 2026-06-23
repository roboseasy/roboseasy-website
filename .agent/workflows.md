# Workflows

자주 반복되는 작업 절차 모음.

## 0. 로컬 개발 시작

```bash
npm install                  # 최초 1회
npm run dev                  # http://localhost:4321
```

수정 시 자동 리로드. 끝낼 땐 Ctrl+C.

## 1. 새 페이지 추가

예: `events.astro` 추가 → `/events`

1. `src/pages/events.astro` 생성:
   ```astro
   ---
   import BaseLayout from '../layouts/BaseLayout.astro';
   import '../styles/pages/events.css';
   ---
   <BaseLayout title="Events - RoboSEasy" description="..." path="/events">
     <section class="events">...</section>
   </BaseLayout>
   ```
2. `src/styles/pages/events.css` 생성 후 페이지 고유 스타일 작성
3. (필요 시) 헤더 네비 수정: `src/components/MainHeader.astro`의 `<ul class="header__nav-list">`에 `<li>` 추가/제거 — 모바일 메뉴 동작은 동일 파일 하단 `<script>`가 처리하므로 마크업만 바꾸면 됨
4. `npm run dev`로 확인

## 2. 새 프로그램 카드 추가

`src/content/programs/<slug>.json` 한 파일로 끝남.

1. 썸네일 이미지를 `public/img/programs_img/<slug>.webp`에 추가 (png/jpg는 webp로 변환)
2. `src/content/programs/<slug>.json` 작성:
   ```json
   {
     "slug": "my-program",
     "order": 4,
     "title": "My Program",
     "description": "한 줄 설명\n두 번째 줄",
     "thumbnail": "/img/programs_img/my-program.webp",
     "downloadUrl": "https://drive.google.com/..."
   }
   ```
3. **상세 페이지 본문**(탭/아코디언/섹션 등)이 필요하면:
   - `src/components/programs/MyProgramDetail.astro` 작성 (기존 `Sts3215Detail.astro` 참고)
   - `src/pages/programs/[slug].astro`의 `detailBySlug` 매핑에 추가
4. `npm run dev` → `/programs` 카드 자동 추가, `/programs/my-program` 라우트 자동 생성

## 3. 새 제품 (SHOP) 추가

제품은 `src/data/products.json`의 `products` 배열로 관리되며, `/products` 목록 + `/products/<id>` 상세가 자동 생성된다.

1. **권장**: `/admin`(Sveltia CMS)에서 GitHub 로그인 → "제품 (SHOP)" 컬렉션에 항목 추가
   - 저장 시 `main`에 **바로 커밋**되어 즉시 반영됨 (PR 검수 단계 없음)
   - 이미지는 CMS 업로드 위젯 사용 (자동으로 `public/img/uploads`에 저장)
2. **직접 편집**: `src/data/products.json`의 `products` 배열에 객체 추가
   - 이미지는 `public/img/uploads`에 두고 `/img/uploads/...` 경로 지정
3. `git push origin main` → `/products` 목록·`/products/<id>` 상세 자동 반영

## 4. 새 docs 페이지 추가

예: `lerobot-so-arm` 카테고리에 새 페이지 추가

1. `src/content/docs/lerobot-so-arm/<slug>.md` 생성:
   ```markdown
   ---
   title: "새 가이드"
   category: "lerobot-so-arm"
   group: "Setup"
   order: 35
   ---

   # 새 가이드 본문…
   ```
2. `order` 값으로 사이드바 정렬, `group`이 같은 항목끼리 묶임
3. 이미지 참조: `/img/...` 절대경로 (docs 이미지는 `assembly/`·`so_arm/` 등 docs용 폴더 사용, webp 권장). 비디오는 `/videos/...`
4. docsify 콜아웃은 표준 blockquote 사용:
   ```
   > ℹ️ **정보**: ...
   > ⚠️ **주의**: ...
   ```

## 5. 새 docs 카테고리 추가

예: `xlerobot` 가이드를 본격 작성

1. `src/content/docs/xlerobot/index.md`의 placeholder를 실제 콘텐츠로 교체
2. 추가 페이지: `src/content/docs/xlerobot/<slug>.md` (frontmatter category: 'xlerobot')
3. **새 카테고리를 만들 때** (예: 'mycat')는 `src/content/config.ts`의 `category` enum에 추가
4. `src/pages/docs/[...slug].astro`의 `heroByCategory` 매핑에도 추가 (heading + description)
5. `src/pages/documents.astro`에 카드 추가 (선택)

## 6. 메타 태그 / OpenGraph 업데이트

페이지마다 따로 손볼 필요 없음. `BaseLayout`에 props로 전달:

```astro
<BaseLayout
  title="페이지 제목"
  description="설명"
  path="/현재-경로"
  image="/img/og-banner.png"   {/* 선택, 기본값 /img/common_img/banner.png */}
>
```

`SeoMeta.astro`가 `astro.config.mjs`의 `site` URL과 합성하여 절대 URL로 출력.

## 7. 배포

`main` 브랜치에 푸시하면 Netlify가 자동으로 `npm run build`를 실행하고 `dist/`를 배포.

```bash
git push origin main
```

빌드 시간: 보통 30초~1분. Netlify 대시보드에서 로그 확인 가능.

## 8. 옛 URL 호환

옛 `docs-*.html`이나 `*.html` 형태로 외부에서 들어오는 링크는 `public/_redirects`에서 301로 새 라우트에 매핑.
새 옛 URL 매핑이 필요하면 같은 파일에 한 줄 추가.

```
/old-path     /new-path     301
```
