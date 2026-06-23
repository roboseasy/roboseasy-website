# Conventions

## 파일/폴더 네이밍

- 페이지: `src/pages/<kebab-case>.astro` (URL = 파일명)
- 컴포넌트: `src/components/<도메인>/<PascalCase>.astro` (예: `programs/Sts3215Detail.astro`)
- CSS: `src/styles/pages/<페이지명>.css`
- 콘텐츠: `src/content/<collection>/<slug>.<json|md>`
- 이미지: `public/img/<page>_img/<kebab-case>.webp` (페이지별 폴더). 공용 자산은 `common_img/`, docs/CMS는 기존 폴더(`assembly/`, `so_arm/`, `uploads/`)
- 비디오: `public/videos/<name>.mp4`

## CSS 클래스 네이밍

BEM 컨벤션 — `.block__element--modifier`

```
.header__nav-link
.program-card__title
.docs-sidebar__link--active
```

페이지/도메인명을 prefix로 두면 충돌 방지에 좋음 (`.programs__`, `.docs-`).

## JavaScript / TypeScript

- 페이지 인터랙션은 Astro `<script>` (모듈 스코프) 또는 `<script is:inline>` (전역 함수, 옛 onclick 호환용)
- 새 코드는 가능하면 모듈 `<script>`. 외부 onclick 어트리뷰트와 호환이 필요할 때만 `is:inline`
- jQuery 미사용 (Phase 6에서 제거 완료)
- 서버 코드: SSR 엔드포인트는 `src/pages/api/*.ts`, 공용 로직은 `src/lib/`, 컬렉션 외 데이터는 `src/data/`(JSON/TS)

## Astro 컴포넌트

- frontmatter에 TypeScript `interface Props` 정의 + `Astro.props` 구조 분해
- 슬롯 활용으로 재사용성 ↑ (`<slot />`, named slots)
- 페이지 고유 CSS는 `import '../styles/pages/<page>.css'`로 frontmatter에서 로드
- 컴포넌트 단위 스타일은 `<style>` 또는 `<style is:global>`

## 다국어 / 문자열

- 사용자 노출 텍스트는 **한국어**가 기본
- 영문 병기는 가독성·SEO에 도움될 때만 (메뉴 항목 등)
- meta 태그(`title`, `description`)는 한국어로 작성

## 커밋 메시지

| Prefix | 용도 |
| --- | --- |
| `FEAT:` | 새 기능 / 새 페이지 |
| `ADD:` | 콘텐츠·리소스 추가 (이미지, docs 페이지 등) |
| `UPDATE:` | 기존 기능/UI 개선 |
| `FIX:` | 버그 수정 |
| `REFACTOR:` | 동작 변경 없는 코드 정리 |
| `DOCS:` | 문서/주석 변경 |
| `CHORE:` | 설정·메타데이터 변경 |

제목은 영어로 간결하게 (예: `FEAT: Add LeKiwi assembly guide`).

## 이미지 / 미디어

- 자산은 `public/img/`, `public/videos/`에 위치 — URL은 `/img/...`, `/videos/...` 절대경로
- 이미지는 페이지별 폴더(`{page}_img/`)로 관리, 공용 자산(로고·파비콘·OG·파트너 로고)은 `common_img/`
- 포맷: 콘텐츠 이미지는 **webp 권장**. favicon/OG/CMS 업로드는 원본 유지 (소셜 미리보기·CMS 호환 때문)
- OpenGraph 배너: `public/img/common_img/banner.png` (1200×630)
- 큰 비디오는 외부 호스팅(YouTube/Vimeo) 고려

## 새 페이지를 만들 때 체크리스트

1. `src/pages/<page>.astro` 생성, `BaseLayout` 사용
2. `title`, `description`, `path` props 채우기 (SEO 자동 처리)
3. (필요 시) `src/styles/pages/<page>.css` 생성 후 frontmatter에서 import
4. (필요 시) `src/components/MainHeader.astro` 네비에 항목 추가
5. `npm run dev`로 확인

## 새 콘텐츠를 추가할 때

- 프로그램: `src/content/programs/<slug>.json` (썸네일은 `public/img/programs_img/`)
- docs: `src/content/docs/<category>/<slug>.md` (frontmatter에 title/category/group/order 필수)
- 컬렉션 외 데이터(news·products 등): `src/data/`의 JSON/TS에 추가
- 자세한 절차: [workflows.md](workflows.md)
