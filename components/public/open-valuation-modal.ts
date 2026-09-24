export const VALUATION_MODAL_EVENT = "carvibe:open-valuation";
export type ValuationModalMode = "valuation" | "scrap";

function dispatchModal(mode: ValuationModalMode) {
  window.dispatchEvent(new CustomEvent(VALUATION_MODAL_EVENT, { detail: { mode } }));
}

export function openValuationModal() {
  dispatchModal("valuation");
}

export function openScrapModal() {
  dispatchModal("scrap");
}
