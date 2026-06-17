# Sveltia CMS 도입 기획서

비개발자(운영자)가 **이미지·뉴스·제품(SHOP) 목록**을 코드 수정 없이 관리할 수 있도록
[Sveltia CMS](https://github.com/sveltia/sveltia-cms)를 도입한다.

- 작성일: 2026-06-16
- 대상 브랜치: `feature/design02` (작업) → 검토 후 `main` 병합
- 상태: **코드 구현 완료**, 운영자 인증(OAuth) 설정만 남음 (아래 8장)

---

## 1. 목표와 범위

### 목표
- 운영자가 GitHub/코드를 몰라도 웹 UI(`/admin`)에서 콘텐츠를 추가·수정·삭제
- 저장하면 GitHub PR 생성 → 승인 → `main` 병합 → Netlify 자동 재빌드 → 사이트 반영
- 개발자는 데이터 스키마·레이아웃만 관리, 콘텐츠 입력에서 손 뗌

### 범위 (관리 대상)
| 콘텐츠 | 데이터 위치 | 처리 |
| --- | --- | --- |
| **제품 (SHOP)** | `src/data/products.json` (← `products.ts`에서 분리) | ✅ 구현 완료 |
| **뉴스** (Instagram/Reels/YouTube ID) | `src/data/news.json` (← `news.astro`에서 분리) | ✅ 구현 완료 |
| **이미지** | `public/img/uploads/` 업로드 | ✅ 미디어 위젯 연동 |

> ⚠️ **용어 주의**: "제품(products, SHOP 판매 상품)"과 "프로그램(programs, GUI 다운로드)"은 다른 기능이다.
> 이번 CMS 대상은 **SHOP 제품**(`src/data/products.json`)이며, `programs` 컬렉션은 범위 밖이다.

### 범위 밖 (추후 확장)
- `programs` (GUI 다운로드 카드), docs 마크다운
- 제품 상세 페이지의 "제원" 탭 등 레이아웃성 콘텐츠

### 결정 사항 (확정)
- **인증**: Netlify 내장 OAuth (추가 인프라 없음)
- **커밋 방식**: PR 검수 워크플로우 (`publish_mode: editorial_workflow`)

---

## 2. 왜 Sveltia CMS인가
- **Decap CMS(구 Netlify CMS) 호환** — `config.yml` 문법 그대로, 단일 JS 파일 CDN 로드
- Decap 대비 빠르고 가벼우며 한국어 UI·이미지 처리·로컬 편집 우수
- Netlify Identity 불필요 (GitHub OAuth 직접 사용). 별도 서버·DB 없음

## 3. 동작 구조
```
운영자 ─(GitHub 로그인)→ /admin (Sveltia CMS, 정적 HTML+JS)
                              │ 저장
                       PR(검수) 생성 → 승인/병합 → main
                              │
                     Netlify 자동 빌드(npm run build)
                              ▼
                      roboseasy.netlify.app 반영
```
- CMS 핵심 파일: `public/admin/index.html` + `public/admin/config.yml`
- `public/` → `dist/` 복사되므로 `https://roboseasy.netlify.app/admin/`에서 접속
- 콘텐츠 저장 = Git 커밋 → 모든 변경 이력이 Git에 남음 (롤백 용이)

---

## 4. 핵심 설계: `products.ts` 단일 교체 지점 유지

`src/data/products.ts` 주석에 *"추후 CMS 연결 시 이 파일만 교체한다"* 는 원설계 의도가 있었다.
이를 따라 **데이터만 JSON으로 분리하고 export 인터페이스는 그대로 유지**했다.

```ts
// src/data/products.ts (요지)
import productsData from './products.json';
export type ProductCategory = ...;
export interface Product { ... };
export const CATEGORY_LABELS = ...;
export const products = productsData.products as Product[];  // ← 데이터만 JSON에서
```

→ **페이지/컴포넌트는 한 줄도 수정하지 않음** (`products.astro`, `products/[id].astro`, `ProductCard.astro` 그대로).
JSON 배열 순서 = 표시 순서이므로 별도 정렬 필드도 불필요.

뉴스도 동일 원칙: `news.astro`가 하드코딩 배열 대신 `src/data/news.json`을 import.

---

## 5. 구현 결과 (완료)

| 파일 | 변경 |
| --- | --- |
| `src/data/products.json` | 신규 — 제품 9종 데이터 (CMS가 쓰는 파일) |
| `src/data/products.ts` | 수정 — 하드코딩 배열 → `products.json` import (타입·상수 유지) |
| `src/data/news.json` | 신규 — 뉴스 임베드 ID 목록 |
| `src/pages/news.astro` | 수정 — 하드코딩 배열 → `news.json` import |
| `public/admin/index.html` | 신규 — Sveltia CMS 로더 |
| `public/admin/config.yml` | 신규 — 백엔드(github)·editorial_workflow·컬렉션 정의 |

검증: `npm run build`(Node 20) 통과 — 제품 9개 라우트·뉴스 페이지 정상 생성, 렌더 결과 회귀 없음.
`astro.config.mjs`, `netlify.toml`, 페이지/컴포넌트 코드는 변경 불필요했음.

---

## 6. config.yml 요약
- `backend: github`, `repo: roboseasy/roboseasy-website`, `branch: main`
- `publish_mode: editorial_workflow` (PR 검수)
- `local_backend: true` (로컬 편집 지원)
- `media_folder: public/img/uploads`, `public_folder: /img/uploads`
- 컬렉션 2개:
  - **제품(SHOP)**: `src/data/products.json`의 `products` 리스트 (id/name/category/price/tags/summary/image/gallery/detailImages/naverUrl/featured/hero/representative/comingSoon)
  - **뉴스**: `src/data/news.json`의 3개 ID 리스트 (instagramPosts/instagramReels/youtubeVideos)

---

## 7. 로컬에서 미리 써보기 (인증 설정 전에도 가능)
```bash
nvm use 20
npx decap-server                   # 별도 터미널에서 실행 (로컬 편집 프록시, Decap 호환)
npm run dev                        # http://localhost:4321
# 브라우저에서 http://localhost:4321/admin/index.html 접속 → 로그인 없이 로컬 파일 편집
```
> `local_backend: true` 덕에 로컬에서는 GitHub 인증 없이 `src/data/*.json`을 직접 편집·저장해 볼 수 있다.
> ⚠️ dev 모드에서는 `/admin/`(끝 슬래시)가 404 → **`/admin/index.html`** 전체 경로로 접속해야 함.
> Astro dev가 public 하위 폴더의 디렉터리 인덱스를 자동 매핑하지 않기 때문이며, 프로덕션(Netlify)에서는 `/admin/`이 정상 동작한다.

---

## 8. 남은 작업 — 운영자 인증 설정 (사용자/운영 몫, 1회성)

코드 구현은 끝났고, 프로덕션 `/admin`에서 **GitHub 로그인이 되려면** 아래 설정이 필요하다.
(개발자가 코드로 처리 불가 — GitHub/Netlify 대시보드 작업)

1. **GitHub OAuth App 생성**
   - GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
   - Homepage URL: `https://roboseasy.netlify.app`
   - **Authorization callback URL**: `https://api.netlify.com/auth/done`
   - 생성 후 **Client ID**와 **Client Secret** 확보
2. **Netlify에 OAuth 등록**
   - Netlify 사이트 → Site configuration → Access control → OAuth → Install provider → **GitHub**
   - 위 Client ID / Secret 입력
3. **운영자 GitHub 권한 부여**
   - 운영자 GitHub 계정을 `roboseasy/roboseasy-website` 저장소 **쓰기(Write) Collaborator**로 초대
4. **검증**
   - `https://roboseasy.netlify.app/admin/` 접속 → "Login with GitHub" → 제품/뉴스 편집 → 저장 시 PR 생성 확인

---

## 9. 리스크 & 주의사항
- **인증 설정이 진입장벽**: 8장은 1회성이지만 대시보드 작업 필요. 완료 전까지 프로덕션 `/admin` 로그인 불가(로컬 편집은 가능).
- **잘못된 입력 → 빌드 실패 가능**: 필수값(id/name/category/price) 누락 시 빌드가 깨질 수 있음. CMS 필드 `required`로 1차 방어. PR 검수 단계에서 Netlify Deploy Preview로 재확인 권장.
- **`id` 변경 = URL 변경**: 제품 id를 바꾸면 `/products/<id>` URL이 바뀜 → 외부 링크 깨질 수 있으니 가급적 고정.
- **스키마 이중 관리**: `products.ts`의 `Product` 타입과 `config.yml` 필드를 함께 맞춰야 함. 한쪽만 바꾸면 입력 누락/타입 불일치 발생.
- **이미지 용량**: 업로드 누적 시 저장소·빌드 비대화. 대용량 PNG는 WebP 권장(기존 known-issue 연계).
- **제품 상세 본문은 일부 고정**: "제원" 탭과 placeholder는 코드. CMS는 이미지·텍스트 필드까지만 관리.

## 10. 다음 액션
1. (운영) 8장 OAuth 설정 진행
2. (개발) `feature/design02` → `main` 병합 후 프로덕션 `/admin` 최종 확인
3. (운영) 간단 사용 매뉴얼 작성 (로그인 → 편집 → PR 승인 흐름)
