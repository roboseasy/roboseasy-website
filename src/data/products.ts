// 판매 제품 하드코딩 데이터.
// 백엔드/CMS 미구현 단계 — 추후 어드민/DB 연결 시 이 파일만 교체한다.
// 실제 상품 사진은 카탈로그 작성 중이라 image를 비워두면 "?" placeholder로 렌더된다.

export type ProductCategory = 'so-arm101' | 'lekiwi' | 'etc';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  /** 가격(원). toLocaleString으로 표시 */
  price: number;
  /** 해시태그 (예: '#SO-ARM101') */
  tags?: string[];
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
  /** SHOP 주요 제품(1x5)에 노출 */
  featured?: boolean;
  /** SHOP 히어로 슬라이드에 노출 */
  hero?: boolean;
  /** '곧 출시' 배지 */
  comingSoon?: boolean;
}

/** 구매 링크 기본값 — 제품별 naverUrl이 없을 때 스토어 메인 */
export const NAVER_STORE_URL = 'https://smartstore.naver.com/roboseasy';

/** PRODUCTS 사이드바 카테고리 라벨 (표시용) */
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  'so-arm101': 'SO-ARM101',
  lekiwi: 'LeKiwi',
  etc: '기타',
};

export const products: Product[] = [
  {
    id: 'so-arm101-edu-kit',
    name: 'AI Robot ARM Edu Kit (SO-ARM101)',
    category: 'so-arm101',
    price: 680000,
    tags: ['#SO-ARM101', '#LeRobot'],
    summary: 'SO-ARM101 리더+팔로워 풀세트. LeRobot 학습을 바로 시작할 수 있는 교육용 로봇 암 키트입니다.',
    featured: true,
    hero: true,
  },
  {
    id: 'so-arm101-follower',
    name: 'SO-ARM101 Follower 단품',
    category: 'so-arm101',
    price: 390000,
    tags: ['#SO-ARM101', '#Follower'],
    summary: '동작을 수행하는 SO-ARM101 팔로워 6축 로봇 암 단품입니다.',
    featured: true,
  },
  {
    id: 'so-arm101-leader',
    name: 'SO-ARM101 Leader 단품',
    category: 'so-arm101',
    price: 330000,
    tags: ['#SO-ARM101', '#Leader'],
    summary: '텔레오퍼레이션용 SO-ARM101 리더(마스터) 암 단품입니다.',
    featured: true,
  },
  {
    id: 'lekiwi-mobile-base',
    name: 'LeKiwi 모바일 베이스 키트',
    category: 'lekiwi',
    price: 590000,
    tags: ['#LeKiwi', '#Mobile'],
    summary: '옴니휠 기반 LeKiwi 모바일 베이스 키트. 자율주행 로봇 플랫폼의 기반입니다.',
    featured: true,
    hero: true,
  },
  {
    id: 'lekiwi-full-kit',
    name: 'LeKiwi Full Kit (Base + ARM)',
    category: 'lekiwi',
    price: 1150000,
    tags: ['#LeKiwi', '#LeRobot'],
    summary: 'LeKiwi 모바일 베이스와 로봇 암을 결합한 풀 키트입니다.',
    featured: true,
  },
  {
    id: 'sts3215-motor',
    name: 'STS3215 스마트 서보 모터',
    category: 'etc',
    price: 23000,
    tags: ['#Servo', '#STS3215'],
    summary: 'STS3215 스마트 시리얼 버스 서보 모터. SO-ARM·LeKiwi 호환.',
  },
  {
    id: 'pla-filament-bambu',
    name: '뱀부랩 정품 PLA 필라멘트 1kg',
    category: 'etc',
    price: 35000,
    tags: ['#PLA', '#BambuLab'],
    summary: '뱀부랩 정품 PLA 필라멘트 1kg. 안정적인 3D 출력 품질을 제공합니다.',
  },
  {
    id: 'control-board',
    name: '모터 컨트롤 보드',
    category: 'etc',
    price: 45000,
    tags: ['#Board'],
    summary: '로봇 구동을 위한 모터 제어용 컨트롤 보드입니다.',
  },
  {
    id: 'xlerobot-kit',
    name: 'XLeRobot 듀얼암 플랫폼',
    category: 'etc',
    price: 0,
    tags: ['#XLeRobot'],
    summary: '듀얼암 Physical AI 플랫폼 XLeRobot. 곧 출시 예정입니다.',
    comingSoon: true,
  },
];
