export const DEAL_CATEGORIES = [
  "גאדג׳טים ובית חכם",
  "רכב ותחבורה",
  "בית ומטבח",
  "אופנה וסטייל",
  "ילדים ומשחקים",
  "בריאות וספורט",
  "כלי עבודה וציוד",
  "כללי",
] as const;

export type DealCategory = typeof DEAL_CATEGORIES[number];
