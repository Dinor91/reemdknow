// Single source of truth for product category detection
// Priority order: בריאות → ילדים → גאדג׳טים → כלי עבודה → אופנה → בית → רכב → כללי

export const DEAL_CATEGORIES = [
  "בריאות וספורט",
  "ילדים ומשחקים",
  "גאדג׳טים ובית חכם",
  "כלי עבודה וציוד",
  "אופנה וסטייל",
  "בית ומטבח",
  "רכב ותחבורה",
  "כללי",
] as const;

export type DealCategory = typeof DEAL_CATEGORIES[number];

/**
 * Priority-based regex category detection.
 * Merges English keywords (from feed sync) + Hebrew keywords (from bot).
 * Order matters — first match wins.
 */
export function detectCategory(productName: string): DealCategory {
  const name = productName.toLowerCase();

  // 1. בריאות וספורט
  if (/toothpaste|oral\s?care|dental|vitamin|supplement|protein|cpap|oxygen|medical|health|fitness|gym|yoga|sport|exercise|treadmill|massage|בריאות|ספורט|רפואי|חמצן|מזרן טיפולי|שעון ספורט|כושר|תוסף/.test(name))
    return "בריאות וספורט";

  // 2. ילדים ומשחקים
  if (/\btoy\b|baby|diaper|nappy|infant|lego|\bkids\b|children|stroller|puzzle|doll|ילד|תינוק|משחק|קארטינג|קסדת ילד|לגו|בובה|מתקן טיפוס/.test(name))
    return "ילדים ומשחקים";

  // 3. גאדג׳טים ובית חכם
  if (/smart\s?watch|smartwatch|earphone|earbud|bluetooth|power\s?bank|led\s?strip|smart\s?home|router|\blaptop\b|drone|projector|network\s?card|airtag|gps\s?tracker|toner|printer|tripod|טלפון|סמארטפון|מחשב|אוזניות|רמקול|מסך|מצלמה|טאבלט|ראוטר|רשת|חכם|wireless|speaker|camera|tablet|headphone|usb|charger/.test(name))
    return "גאדג׳טים ובית חכם";

  // 4. כלי עבודה וציוד
  if (/lawn\s?mower|lawnmower|\bdrill\b|wrench|screwdriver|\btool\b|garden|\bpump\b|ladder|generator|compressor|cabinet|כלי עבודה|מברג|מקדחה|מפתח|מדידה|מנקה|תעשייתי|ממיר|משקל|industrial|cleaning/.test(name))
    return "כלי עבודה וציוד";

  // 5. אופנה וסטייל
  if (/\bshirt\b|\bdress\b|\bpants\b|\bshoe\b|sneaker|\bbag\b|wallet|jewelry|necklace|bracelet|\bring\b|\bwatch\b|fashion|eyelash|makeup|lipstick|\bjacket\b(?!.*moto)|שמלה|חולצה|מכנסיים|נעל|תיק|תכשיט|שעון יד|טבעת|שרשרת|אופנה|women|men/.test(name))
    return "אופנה וסטייל";

  // 6. בית ומטבח
  if (/kitchen|cookware|\bpot\b|\bpan\b|\bknife\b|furniture|pillow|bedding|curtain|storage|organizer|vacuum|blender|coffee\s?maker|air\s?fryer|מטבח|בית|כיסא|שולחן|מזרן|מיטה|כריות|וילון|מדף|אחסון|קפה|סיר|מחבת/.test(name))
    return "בית ומטבח";

  // 7. רכב ותחבורה (last — broad keywords)
  if (/\bcar\b|automotive|motorcycle|dash\s?cam|dashcam|\btire\b|\btyre\b|brake|steering|carplay|body\s?kit|roof\s?box|car\s?charger|car\s?mount|car\s?cover|car\s?seat|car\s?wash|\bhelmet\b(?=.*moto|\bhelmet\b)|רכב|אופנוע|טנדר|גג|גלגל|מנוע|שמן|בלם|פנס|מראה|קסדה/.test(name))
    return "רכב ותחבורה";

  return "כללי";
}

/**
 * Check if a product belongs to a specific category.
 * Versatile — works on any product from any table/platform.
 */
export function isProductRelevantForCategory(productName: string, category: string): boolean {
  return detectCategory(productName) === category;
}

const STOPWORDS = new Set([
  "with", "from", "that", "this", "your", "have", "more", "will", "been",
  "each", "make", "like", "long", "very", "when", "what", "were", "there",
  "their", "about", "would", "which", "could", "other", "than", "then",
  "them", "into", "over", "also", "back", "after", "only", "come", "made",
  "find", "here", "thing", "many", "well", "anti", "multi", "super", "ultra",
  "mini", "free", "high", "quality", "portable", "original", "style", "type",
  "size", "color", "pack", "piece", "sets",
]);

/**
 * Extract the "main keyword" from a product name.
 * Returns the longest word (≥4 chars) that isn't a stopword.
 */
function extractMainKeyword(name: string): string {
  const words = name.toLowerCase().replace(/[^a-zא-ת0-9\s]/g, "").split(/\s+/);
  let best = "";
  for (const w of words) {
    if (w.length >= 4 && !STOPWORDS.has(w) && w.length > best.length) {
      best = w;
    }
  }
  return best;
}

/**
 * Diversify a product list — max `maxSimilar` products sharing the same main keyword.
 * Preserves original order. Works on any product array with a `name` field.
 */
export function diversifyProducts<T extends { name: string }>(
  products: T[],
  maxSimilar: number = 2
): T[] {
  const keywordCount = new Map<string, number>();
  return products.filter(p => {
    const kw = extractMainKeyword(p.name);
    if (!kw) return true; // no keyword detected — keep
    const count = keywordCount.get(kw) || 0;
    if (count >= maxSimilar) return false;
    keywordCount.set(kw, count + 1);
    return true;
  });
}
