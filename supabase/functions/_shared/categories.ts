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
