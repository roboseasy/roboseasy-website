# design02 — Products 페이지 벤치마킹 재설계

**브랜치**: `feature/design02`
**작성일**: 2026-06-15
**벤치마킹**: https://www.seeed.cc/product-category/products (Product Center)

## 목표

seeed.cc `product-category` 페이지를 벤치마킹하여 `products.astro`를
**히어로 + 좌측 앵커 사이드바 + 카테고리별 섹션** 구조로 재설계한다.
디자인 1안(`shop.astro` 슬라이더 + 필터 토글 그리드)은 제거한다.

## 확정된 결정 (사용자 확인 완료)

1. **카드 클릭** → 기존 `/products/[id]` 상세 페이지 연결 **유지** (재설계 안 함)
2. **적용 페이지** → `products.astro` 재설계 + `shop.astro` **삭제**
   - MainHeader 네비게이션 `Shop`(/shop) → `Products`(/products)
   - 하위 헤더(ShopHeader) **삭제**
3. **사이드바** → **앵커 스크롤** 방식 (클릭 시 해당 카테고리 섹션으로 스크롤)
4. **가격** → 목록(카드)에 **표시 안 함** (상품명만). 상세 페이지는 가격 유지.

## 페이지 구조 (products.astro)

```
BaseLayout (lockTheme="light")  ← ShopHeader 없음
├─ 히어로 "Product Center"
│   · 좌/우 장식 + 중앙 "모든 제품" 대표 이미지 1장 (현재는 placeholder)
│
└─ products-layout (그리드: 사이드바 + 메인)
   ├─ 좌측 사이드바 (sticky, 앵커 네비)
   │   · SO-ARM101 → #cat-so-arm101
   │   · LeKiwi    → #cat-lekiwi
   │   · 기타       → #cat-etc
   │
   └─ 메인 (카테고리 섹션 세로 나열)
       ├─ #cat-so-arm101
       │   · 대표 상품 큰 이미지 (edu-kit)
       │   · 하위 1×5 카드 (follower, leader …)
       ├─ #cat-lekiwi
       │   · 대표 상품 큰 이미지 (mobile-base)
       │   · 하위 1×5 카드 (full-kit …)
       └─ #cat-etc
           · 대표 없음 → 1×5 카드 (sts3215, pla, board, xlerobot)
```

- **1×5**: 데스크톱 5열, 반응형 축소(태블릿 3열 / 모바일 2열).
- **대표 상품**: `products.ts`에 `representative?: boolean` 추가.
  - so-arm101 = `so-arm101-edu-kit`, lekiwi = `lekiwi-mobile-base`.
  - 대표는 큰 이미지로, 같은 카테고리의 나머지가 하위 1×5 카드.
- **카드**: 이미지 + 상품명만 (가격·태그라인 제거).

## 변경 파일

### 신규/재작성
- `src/pages/products.astro` — 위 구조로 전면 재작성
- `src/styles/pages/products.css` — 히어로/사이드바/섹션/1×5 그리드 스타일로 재작성

### 수정
- `src/data/products.ts` — `representative?: boolean` 필드 + 대표 2건 플래그
- `src/components/shop/ProductCard.astro` — 가격 오버레이 제거(상품명만), 카드 비율 조정
- `src/components/MainHeader.astro` — 네비 `Shop`→`Products`, href `/shop`→`/products`
- `src/pages/products/[id].astro` — `ShopHeader` import/사용 제거
- `public/_redirects` — `/shop /products 301` (옛 URL 호환) ※ 파일 없으면 생성

### 삭제
- `src/pages/shop.astro`
- `src/styles/pages/shop.css` (shop.astro 전용 → orphan)
- `src/components/shop/ShopHeader.astro` (모든 사용처 제거 후 orphan)

### 영향 없음 (그대로)
- `src/components/shop/BrandPlaceholder.astro` (이미지 미확보 placeholder로 계속 사용)
- `src/pages/products/[id].astro` 가격/구매 로직 (상세는 가격 유지)
- `MainFooter` Coupang 링크 (외부, 무관)

## 검증

1. `npm run build` 성공 (orphan import 없음)
2. `/products` 진입 → 히어로 + 사이드바 3개 + 카테고리 3섹션 렌더
3. 사이드바 클릭 → 해당 섹션으로 스크롤
4. 카드에 가격 없음 / 카드 클릭 → `/products/[id]` 이동
5. MainHeader `Products` 링크 동작, `/shop` 접속 시 `/products`로 리다이렉트
6. `npm run build` 후 `shop`/`ShopHeader` 잔존 참조 없음 (grep)

## 미결 / 추후

- 실제 제품 사진·"모든 제품" 합성 이미지 미확보 → 전부 `BrandPlaceholder`
- 대표 상품 선정 기준(현재 edu-kit / mobile-base) 추후 조정 가능
