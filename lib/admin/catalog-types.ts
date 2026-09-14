export type CatalogTrim = { id: string; name: string };
export type CatalogModel = { id: string; name: string; trims: CatalogTrim[] };
export type CatalogMake = { id: string; name: string; models: CatalogModel[] };
export type PendingCatalogArchive =
  | { kind: "make"; id: string; name: string; modelCount: number }
  | { kind: "model"; id: string; name: string; trimCount: number }
  | { kind: "trim"; id: string; name: string };
