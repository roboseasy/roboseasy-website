// 클라이언트 페이지 스크립트 공용 헬퍼 — 여러 쇼핑 페이지가 동일하게 쓰던 것을 통합.
// document를 참조하므로 브라우저(<script>)에서만 호출된다.
export const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** 원화 표기 — 1,234원 */
export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
