import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCw, Link2, Download, Check, Copy, ExternalLink, Globe, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ConvertedLink {
  originalUrl: string;
  productId: string;
  newTrackingLink: string | null;
  productName?: string;
  priceUsd?: number;
  originalPriceUsd?: number;
  commissionRate?: number;
  inStock?: boolean;
  imageUrl?: string;
  error?: string;
}

const CATEGORIES_ISRAEL = [
  "רכב",
  "גאדג׳טים",
  "ילדים",
  "בית",
  "בית חכם",
  "אופנה",
  "נסיעות",
  "בריאות",
  "כלי עבודה",
  "כללי"
];

// Extract product ID from various AliExpress URL formats
function extractProductId(url: string): string | null {
  // Try different patterns
  // Pattern 1: /item/1234567890.html
  const pattern1 = /\/item\/(\d+)\.html/i;
  // Pattern 2: /i/1234567890.html
  const pattern2 = /\/i\/(\d+)\.html/i;
  // Pattern 3: productId=1234567890
  const pattern3 = /productId[=:](\d+)/i;
  // Pattern 4: /1234567890.html (just the ID)
  const pattern4 = /\/(\d{10,})\.html/i;
  // Pattern 5: item/1234567890 without .html
  const pattern5 = /item\/(\d+)/i;
  
  let match = url.match(pattern1) || 
              url.match(pattern2) || 
              url.match(pattern3) || 
              url.match(pattern4) ||
              url.match(pattern5);
  
  return match ? match[1] : null;
}

export const LinkConverter = () => {
  const [inputLinks, setInputLinks] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [convertedLinks, setConvertedLinks] = useState<ConvertedLink[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("כללי");
  const [selectedForImport, setSelectedForImport] = useState<Set<string>>(new Set());

  // Scrape external website for AliExpress links
  const handleScrapeWebsite = async () => {
    if (!websiteUrl.trim()) {
      toast.error("הכנס כתובת אתר");
      return;
    }

    setIsScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-external-links', {
        body: { url: websiteUrl.trim() }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'שגיאה בסריקת האתר');
      }

      if (data.links && data.links.length > 0) {
        // Add scraped links to the input textarea
        const linkUrls = data.links.map((l: any) => l.originalUrl).join('\n');
        setInputLinks(prev => prev ? prev + '\n' + linkUrls : linkUrls);
        toast.success(`נמצאו ${data.validProductLinks} קישורי AliExpress!`);
      } else {
        toast.warning("לא נמצאו קישורי AliExpress באתר");
      }
    } catch (err: any) {
      console.error('Scrape error:', err);
      toast.error(err.message || "שגיאה בסריקת האתר");
    } finally {
      setIsScraping(false);
    }
  };

  const handleConvert = async () => {
    const links = inputLinks
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && (l.includes('aliexpress') || l.includes('s.click')));

    if (links.length === 0) {
      toast.error("לא נמצאו קישורי AliExpress");
      return;
    }

    setIsConverting(true);
    setConvertedLinks([]);

    const results: ConvertedLink[] = [];

    for (const url of links) {
      const productId = extractProductId(url);
      
      if (!productId) {
        results.push({
          originalUrl: url,
          productId: "",
          newTrackingLink: null,
          error: "לא ניתן לחלץ מזהה מוצר"
        });
        continue;
      }

      try {
        // Generate new affiliate link using the API
        const { data: linkData, error: linkError } = await supabase.functions.invoke('aliexpress-api', {
          body: {
            action: 'generate-link',
            sourceValues: `https://www.aliexpress.com/item/${productId}.html`
          }
        });

        if (linkError) throw linkError;

        // Parse the API response for link
        const responseData = linkData?.data?.aliexpress_affiliate_link_generate_response?.resp_result?.result;
        const promotionLinks = responseData?.promotion_links?.promotion_link;
        const newLink = promotionLinks?.[0]?.promotion_link || null;

        // Now fetch product details (commission, stock, price)
        let productDetails: any = null;
        try {
          const { data: detailsData } = await supabase.functions.invoke('aliexpress-api', {
            body: {
              action: 'product-details',
              productIds: productId
            }
          });
          
          const detailsResult = detailsData?.data?.aliexpress_affiliate_productdetail_get_response?.resp_result?.result;
          const products = detailsResult?.products?.product;
          productDetails = products?.[0] || null;
        } catch (e) {
          console.log('Could not fetch product details:', e);
        }

        results.push({
          originalUrl: url,
          productId,
          newTrackingLink: newLink,
          productName: productDetails?.product_title || undefined,
          priceUsd: productDetails?.target_sale_price ? parseFloat(productDetails.target_sale_price) : undefined,
          originalPriceUsd: productDetails?.target_original_price ? parseFloat(productDetails.target_original_price) : undefined,
          commissionRate: productDetails?.commission_rate ? parseFloat(productDetails.commission_rate) : undefined,
          inStock: productDetails ? productDetails.product_main_image_url !== undefined : undefined,
          imageUrl: productDetails?.product_main_image_url || undefined,
          error: newLink ? undefined : "לא הצלחנו ליצור קישור חדש"
        });

      } catch (err) {
        console.error('Error converting link:', err);
        results.push({
          originalUrl: url,
          productId,
          newTrackingLink: null,
          error: "שגיאה ביצירת קישור"
        });
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    setConvertedLinks(results);
    setIsConverting(false);

    const successCount = results.filter(r => r.newTrackingLink).length;
    toast.success(`הומרו ${successCount} מתוך ${results.length} קישורים`);
  };

  const handleImport = async () => {
    const linksToImport = convertedLinks.filter(
      l => l.newTrackingLink && selectedForImport.has(l.productId)
    );

    if (linksToImport.length === 0) {
      toast.error("בחר קישורים לייבוא");
      return;
    }

    setIsImporting(true);

    try {
      const productsToInsert = linksToImport.map(link => ({
        aliexpress_product_id: link.productId,
        product_name_hebrew: link.productName || `מוצר ${link.productId}`,
        product_name_english: link.productName || null,
        tracking_link: link.newTrackingLink!,
        category: selectedCategory,
        category_name_hebrew: selectedCategory,
        price_usd: link.priceUsd || null,
        original_price_usd: link.originalPriceUsd || null,
        image_url: link.imageUrl || null,
        is_active: true,
        out_of_stock: link.inStock === false
      }));

      const { error } = await supabase
        .from('israel_editor_products')
        .upsert(productsToInsert, { 
          onConflict: 'aliexpress_product_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast.success(`יובאו ${linksToImport.length} מוצרים לטבלה`);
      
      // Trigger image scraping for new products
      try {
        await supabase.functions.invoke('scrape-product-images');
      } catch (e) {
        console.log('Image scraping triggered');
      }

      setSelectedForImport(new Set());
    } catch (err) {
      console.error('Error importing:', err);
      toast.error("שגיאה בייבוא המוצרים");
    } finally {
      setIsImporting(false);
    }
  };

  const toggleSelectAll = () => {
    const validIds = convertedLinks
      .filter(l => l.newTrackingLink)
      .map(l => l.productId);
    
    if (selectedForImport.size === validIds.length) {
      setSelectedForImport(new Set());
    } else {
      setSelectedForImport(new Set(validIds));
    }
  };

  const toggleSelect = (productId: string) => {
    const newSet = new Set(selectedForImport);
    if (newSet.has(productId)) {
      newSet.delete(productId);
    } else {
      newSet.add(productId);
    }
    setSelectedForImport(newSet);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("הועתק!");
  };

  const copyAllLinks = () => {
    const links = convertedLinks
      .filter(l => l.newTrackingLink)
      .map(l => l.newTrackingLink)
      .join('\n');
    navigator.clipboard.writeText(links);
    toast.success("כל הקישורים הועתקו!");
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-2">🔄 המרת קישורי AliExpress</h2>
          <p className="text-sm text-muted-foreground mb-4">
            סרוק אתר חיצוני או הדבק קישורים - הכלי יחלץ את מזהה המוצר ויצור קישורי אפיליאציה חדשים עם ה-Tracking ID שלך
          </p>
        </div>

        <Tabs defaultValue="scrape" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="scrape" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              סריקת אתר
            </TabsTrigger>
            <TabsTrigger value="paste" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              הדבקת קישורים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scrape" className="space-y-3">
            <label className="text-sm font-medium">כתובת האתר לסריקה:</label>
            <div className="flex gap-2">
              <Input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://beacons.ai/aliexpressfinds_israel"
                className="font-mono text-sm flex-1"
                dir="ltr"
              />
              <Button 
                onClick={handleScrapeWebsite} 
                disabled={isScraping || !websiteUrl.trim()}
              >
                {isScraping ? (
                  <>
                    <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                    סורק...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 ml-2" />
                    סרוק אתר
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              הכלי יסרוק את האתר ויחלץ את כל קישורי AliExpress שנמצאים בו
            </p>
          </TabsContent>

          <TabsContent value="paste" className="space-y-3">
            <label className="text-sm font-medium">הדבק קישורים (קישור אחד בכל שורה):</label>
            <Textarea
              value={inputLinks}
              onChange={(e) => setInputLinks(e.target.value)}
              placeholder={`https://www.aliexpress.com/item/1234567890.html
https://s.click.aliexpress.com/e/_ABC123
https://he.aliexpress.com/item/9876543210.html`}
              className="min-h-[120px] font-mono text-sm"
              dir="ltr"
            />
          </TabsContent>
        </Tabs>

        {/* Links found indicator */}
        {inputLinks.trim() && (
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">קישורים שנמצאו: </span>
              {inputLinks.split('\n').filter(l => l.includes('aliexpress') || l.includes('s.click')).length}
            </p>
          </div>
        )}

        {/* Convert Button */}
        <Button 
          onClick={handleConvert} 
          disabled={isConverting || !inputLinks.trim()}
          className="w-full"
          size="lg"
        >
          {isConverting ? (
            <>
              <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
              ממיר קישורים...
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4 ml-2" />
              המר לקישורים שלי
            </>
          )}
        </Button>
        {/* Results Section */}
        {convertedLinks.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">תוצאות ({convertedLinks.filter(l => l.newTrackingLink).length} הצליחו)</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyAllLinks}>
                  <Copy className="h-4 w-4 ml-1" />
                  העתק הכל
                </Button>
                <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                  <Check className="h-4 w-4 ml-1" />
                  {selectedForImport.size === convertedLinks.filter(l => l.newTrackingLink).length ? 'בטל בחירה' : 'בחר הכל'}
                </Button>
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto space-y-3 border rounded-lg p-3">
              {convertedLinks.map((link, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-lg border ${
                    link.newTrackingLink 
                      ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
                      : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {link.newTrackingLink && (
                      <input
                        type="checkbox"
                        checked={selectedForImport.has(link.productId)}
                        onChange={() => toggleSelect(link.productId)}
                        className="mt-1"
                      />
                    )}
                    
                    {/* Product Image */}
                    {link.imageUrl && (
                      <img 
                        src={link.imageUrl} 
                        alt="" 
                        className="w-16 h-16 object-cover rounded border"
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      {/* Product Name */}
                      {link.productName && (
                        <p className="text-sm font-medium mb-1 line-clamp-2">{link.productName}</p>
                      )}
                      
                      {/* Product Details Row */}
                      <div className="flex flex-wrap gap-3 mb-2">
                        {/* Commission Rate */}
                        {link.commissionRate !== undefined && (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            link.commissionRate >= 10 
                              ? 'bg-green-200 text-green-800' 
                              : link.commissionRate >= 5 
                                ? 'bg-yellow-200 text-yellow-800' 
                                : 'bg-gray-200 text-gray-700'
                          }`}>
                            💰 {link.commissionRate}% עמלה
                          </span>
                        )}
                        
                        {/* Price */}
                        {link.priceUsd !== undefined && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                            💵 ${link.priceUsd.toFixed(2)}
                            {link.originalPriceUsd && link.originalPriceUsd > link.priceUsd && (
                              <span className="line-through mr-1 text-gray-500">
                                ${link.originalPriceUsd.toFixed(2)}
                              </span>
                            )}
                          </span>
                        )}
                        
                        {/* Stock Status */}
                        {link.inStock !== undefined && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            link.inStock 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {link.inStock ? '✅ במלאי' : '❌ אזל'}
                          </span>
                        )}
                      </div>
                      
                      {/* Tracking Link */}
                      {link.newTrackingLink ? (
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded flex-1 truncate" dir="ltr">
                            {link.newTrackingLink}
                          </code>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(link.newTrackingLink!)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <a 
                            href={link.newTrackingLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </a>
                        </div>
                      ) : (
                        <span className="text-sm text-red-600">{link.error}</span>
                      )}
                      
                      <div className="text-xs text-muted-foreground mt-1">
                        Product ID: {link.productId || 'לא זוהה'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Import Section */}
            {convertedLinks.some(l => l.newTrackingLink) && (
              <div className="border-t pt-4 space-y-3">
                <h4 className="font-medium">ייבוא לטבלת ישראל</h4>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-sm text-muted-foreground">קטגוריה:</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES_ISRAEL.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleImport}
                    disabled={isImporting || selectedForImport.size === 0}
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                        מייבא...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 ml-2" />
                        ייבא {selectedForImport.size} מוצרים
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  * המוצרים יתווספו עם שם זמני. תצטרך לערוך את השמות בעברית בטאב "המלצות העורך"
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
