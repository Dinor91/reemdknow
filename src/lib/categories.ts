export const DEAL_CATEGORIES = [
  "גאדג׳טים ובית חכם",
  "משחקים ופתרונות לילדים",
  "מוצרי חשמל קטנים",
  "ציוד לנסיעות וטיולים",
  "אביזרים לרכב ולאופנוע",
  "חיות מחמד",
  "כללי",
] as const;

export type DealCategory = typeof DEAL_CATEGORIES[number];
