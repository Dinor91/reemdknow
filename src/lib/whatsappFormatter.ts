// Builds Hebrew WhatsApp-ready text for a Scout draft.
export interface ScoutDraftLike {
  product_name_hebrew?: string | null;
  product_name_english?: string | null;
  price_usd?: number | null;
  rating?: number | null;
  sales_count?: number | null;
  tracking_link?: string | null;
  audit_notes?: string | null;
  category_name_hebrew?: string | null;
}

export function formatForWhatsApp(p: ScoutDraftLike, platform: "aliexpress" | "amazon"): string {
  const name = p.product_name_hebrew || p.product_name_english || "מוצר מומלץ";
  const lines: string[] = [];
  lines.push(`✨ ${name}`);
  if (p.audit_notes) lines.push(`\n📝 ${p.audit_notes}`);
  const meta: string[] = [];
  if (p.price_usd && p.price_usd > 0) meta.push(`💰 $${Number(p.price_usd).toFixed(2)}`);
  if (p.rating && p.rating > 0) meta.push(`⭐ ${Number(p.rating).toFixed(1)}`);
  if (p.sales_count && p.sales_count > 0) meta.push(`🔥 ${p.sales_count} נמכרו`);
  if (meta.length) lines.push(`\n${meta.join("  •  ")}`);
  if (p.tracking_link) lines.push(`\n🔗 ${p.tracking_link}`);
  lines.push(`\n_${platform === "amazon" ? "Amazon" : "AliExpress"} • ראם ממליץ_`);
  return lines.join("\n");
}
