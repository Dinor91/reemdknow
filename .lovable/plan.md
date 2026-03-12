

## Analysis: Lazada batch-links API Response Fields

### What the API returns (from live logs)

The Lazada `/marketing/getlink` (batch-links) endpoint returns **exactly these fields** per product:

```text
urlBatchGetLinkInfoList[0]:
├── productId          → "2484982730"
├── productName        → "Free Delivery!! Carpet, Upholstery..."
├── regularCommission  → "8%"
├── regularPromotionLink → "https://c.lazada.co.th/t/c.2qZHBN"
├── originalUrl        → "https://www.lazada.co.th/products/pdp-i..."
└── class              → "com.lazada.affiliate.openapi.resp..."
```

### Key finding: No image field

The `batch-links` API does **not** return any image URL. The only fields are: `productId`, `productName`, `regularCommission`, `regularPromotionLink`, `originalUrl`, `class`.

### How the system currently gets images

Looking at `decode-external-link/index.ts` (line 69-91), the existing code only extracts `name`, `commission`, `affiliateLink`, and `productId` from this API -- it knows there's no image.

For images, the system uses a **separate scraping step**: it fetches the product HTML page and looks for `og:image` meta tag (visible in logs: "No og:image found"). This often fails for Lazada.

### Contrast with AliExpress API

The AliExpress API (`product-details`) returns rich data including:
- `product_main_image_url` -- full image
- `product_small_image_urls` -- multiple images
- `app_sale_price`, `original_price` -- prices
- `product_title` -- name
- `second_level_category_name` -- category

### Contrast with Lazada Product Feed API

The `/marketing/product/feed` API (used in `sync-feed-products`) returns much more data per product: `pictures[]`, `discountPrice`, `originalPrice`, `ratingScore`, `categoryL1`, `brandName`, etc. But this is a feed-browse API, not a lookup-by-ID API.

### Summary for Tasks 5+6

| Field | AliExpress API | Lazada batch-links |
|-------|---------------|-------------------|
| Product name | Yes (`product_title`) | Yes (`productName`) |
| Image | Yes (`product_main_image_url`) | **No** |
| Price | Yes (`app_sale_price`) | **No** |
| Category | Yes (`second_level_category_name`) | **No** |
| Affiliate link | Yes (`promotion_link`) | Yes (`regularPromotionLink`) |

**For Task 5 implementation**: Lazada's batch-links API provides only `productName` and affiliate link. For image, the existing og:image scraping fallback would need to be used. Price is unavailable from this API endpoint.

