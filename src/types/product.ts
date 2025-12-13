export interface Product {
  id: string;
  product_title: string;
  product_image: string;
  product_price: number;
  product_original_price?: number;
  product_discount?: number;
  product_rating: number;
  product_reviews: number;
  product_link: string;
  platform: "AliExpress" | "Lazada";
  category?: string;
}

export type AffiliateSource = "whatsapp" | "telegram" | "instagram" | "website";

export const appendAffiliateSubId = (link: string, source: AffiliateSource): string => {
  const separator = link.includes("?") ? "&" : "?";
  return `${link}${separator}aff_sub=${source}`;
};
