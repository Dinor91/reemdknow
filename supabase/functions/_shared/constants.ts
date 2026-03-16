// Single source of truth for Lazada category mapping
// Maps Hebrew category names to Lazada categoryL1 IDs

export const LAZADA_CATEGORY_MAP: Record<string, number[]> = {
  'גאדג׳טים ובית חכם': [42062201, 3835, 3836, 10100245],
  'רכב ותחבורה':       [8428],
  'בית ומטבח':         [3833, 11829, 62541004],
  'אופנה וסטייל':      [3008, 5955],
  'ילדים ומשחקים':     [5095, 5090],
  'בריאות וספורט':     [10100869, 5761],
  'כלי עבודה וציוד':   [11830],
};

// Keywords to check for unwanted products after sync
export const UNWANTED_PRODUCT_KEYWORDS = [
  'amulet', 'bangle', 'jade', 'cinnabar', 'tea leaves',
  'buddha', 'talisman', 'charm pendant', 'holy',
];
