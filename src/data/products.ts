// 판매 제품 데이터. 목록 자체는 Sveltia CMS가 관리하는 products.json에 저장되고,
// 이 파일은 타입 정의·상수·정렬된 export 인터페이스만 제공한다 (페이지는 이 모듈만 import).
// 실제 상품 사진은 카탈로그 작성 중이라 image를 비워두면 "?" placeholder로 렌더된다.
import productsData from './products.json';
import { optionSkuErrors } from './optionSkus.mjs';

// 'addon' = 부품·액세서리. 정식 제품이라 단독 구매도 되지만, 제품 목록(/products)에는
// 노출하지 않고 본품 상세의 추가 옵션과 직접 링크로만 판매한다 (CATEGORY_ORDER에서 제외).
export type ProductCategory = 'a-ba' | 'a-go' | 'etc' | 'addon';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  /** 가격(원). toLocaleString으로 표시 */
  price: number;
  /** 대표 이미지 경로. 없으면 placeholder */
  image?: string;
  /** 한 줄 제품 정보 요약 (상세 페이지) */
  summary?: string;
  /** 구매 링크(네이버 스마트스토어). 없으면 스토어 메인 */
  naverUrl?: string;
  /** 갤러리 썸네일 이미지들 (상세 페이지). 없으면 placeholder */
  gallery?: string[];
  /** 상세 설명 이미지들 (세로 스택). 없으면 placeholder */
  detailImages?: string[];
  /** 제원 탭 이미지들 (세로 스택). 없으면 placeholder */
  specImages?: string[];
  /** 상품정보 표 — 상품번호 */
  productNumber?: string;
  /** 상품정보 표 — 브랜드 */
  brand?: string;
  /** 상품정보 표 — 원산지 */
  origin?: string;
  /** PRODUCTS 카테고리 섹션의 대표 상품(큰 이미지). 카테고리당 1개 */
  representative?: boolean;
  /** '곧 출시' 배지 */
  comingSoon?: boolean;
  /**
   * 상세 페이지에 추가 옵션으로 붙일 다른 제품의 id 목록 (보통 category='addon'인 부품).
   * 옵션도 정식 제품이라 단독 구매도 가능하다.
   */
  optionSkus?: string[];
}

/** 구매 링크 기본값 — 제품별 naverUrl이 없을 때 스토어 메인 */
export const NAVER_STORE_URL = 'https://smartstore.naver.com/roboseasy';

/** PRODUCTS 사이드바 카테고리 라벨 (표시용) */
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  'a-ba': 'A-Ba(SO-ARM101)',
  'a-go': 'A-Go(LeKiwi)',
  etc: '기타',
  addon: '부품·액세서리',
};

// products.json은 CMS가 쓰는 데이터 파일. JSON 배열 순서가 곧 표시 순서.
export const products = productsData.products as Product[];

// optionSkus 오류(없는 id·자기 자신·중복)를 개발 중에 경고로 알린다 — 옵션이 조용히 사라져
// 원인을 찾기 어려운 것을 막는다. 규칙은 optionSkus.mjs에 있다.
if (import.meta.env.DEV) {
  for (const e of optionSkuErrors(products)) console.warn(`[products] ${e}`);
}
