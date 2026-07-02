export const VALUATION_MODAL_EVENT = "carvibe:open-valuation";

export function openValuationModal() {
  window.dispatchEvent(new CustomEvent(VALUATION_MODAL_EVENT));
}
