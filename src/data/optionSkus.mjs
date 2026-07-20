// 추가 옵션(optionSkus) 검증 규칙 — 빌드 게이트(scripts/sync-products.mjs)와
// 개발 경고(src/data/products.ts)가 공유한다. 규칙을 한 곳에서만 관리해 두 검사가 어긋나지 않게 한다.
// 없는 id·자기 자신·중복을 잡는다(없는 id면 상세 페이지에서 옵션이 조용히 사라진다).
/**
 * @param {Array<{ id: string; optionSkus?: string[] }>} products
 * @returns {string[]} 사람이 읽는 오류 메시지 목록 (비어 있으면 통과)
 */
export function optionSkuErrors(products) {
  const known = new Set(products.map((p) => p.id));
  /** @type {string[]} */
  const errors = [];
  for (const p of products) {
    if (p.optionSkus !== undefined && !Array.isArray(p.optionSkus)) {
      errors.push(`${p.id}: optionSkus가 배열이 아님`);
      continue;
    }
    const picked = new Set();
    for (const sku of p.optionSkus ?? []) {
      if (!known.has(sku)) errors.push(`${p.id}: 추가 옵션 "${sku}" — 등록된 제품이 아님`);
      if (sku === p.id) errors.push(`${p.id}: 자기 자신을 추가 옵션으로 지정할 수 없음`);
      if (picked.has(sku)) errors.push(`${p.id}: 추가 옵션 중복 — ${sku}`);
      picked.add(sku);
    }
  }
  return errors;
}
