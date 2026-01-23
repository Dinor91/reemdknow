import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCw, Link2, Download, Check, Copy, ExternalLink, Globe, Search, Sparkles, MessageSquareText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
  detectedCategory?: string;
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

// Auto-detect category from product name using keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "רכב": [
    "car", "auto", "vehicle", "tire", "wheel", "motor", "engine", "dashboard", 
    "gps", "driving", "parking", "seat cover", "steering", "headlight", "brake",
    "motorcycle", "bike holder", "trunk", "windshield", "charger car", "obd",
    "fuel", "rearview", "mirror car", "bumper", "wiper", "car seat"
  ],
  "גאדג׳טים": [
    "gadget", "electronic", "usb", "bluetooth", "wireless", "speaker", "headphone",
    "earphone", "power bank", "cable", "charger", "adapter", "mouse", "keyboard",
    "webcam", "microphone", "led", "light strip", "drone", "camera", "tripod",
    "phone holder", "tablet", "smart watch", "fitness tracker", "vr", "gaming",
    "earbuds", "tws", "headset", "portable", "hub", "dock", "stand phone"
  ],
  "ילדים": [
    "kid", "child", "baby", "toy", "game", "puzzle", "doll", "lego", "educational",
    "stroller", "diaper", "bottle", "pacifier", "infant", "toddler", "children",
    "school", "backpack kid", "lunch box", "playmat", "breast pump", "breastfeeding",
    "nursing", "newborn", "balloon", "party kids", "birthday"
  ],
  "בית": [
    "home", "kitchen", "bathroom", "bedroom", "living room", "furniture", "decor",
    "storage", "organizer", "shelf", "hook", "hanger", "towel", "curtain", "rug",
    "mat", "pillow", "blanket", "bedding", "lamp", "vase", "plant", "garden",
    "cleaning", "trash", "laundry", "iron", "vacuum", "pot", "pan", "bowl", 
    "container", "lid", "utensil", "knife", "cutting board", "spoon", "fork",
    "plate", "cup", "mug", "glass", "blender", "mixer", "oven", "microwave",
    "coffee", "tea", "bbq", "grill", "cover pot", "silicone", "strap", "fixing",
    "ice cream", "creami", "ninja", "opener", "can opener", "beverage"
  ],
  "בית חכם": [
    "smart home", "wifi", "alexa", "google home", "automation", "sensor", "switch",
    "socket", "plug smart", "bulb smart", "camera security", "doorbell", "lock smart",
    "thermostat", "remote control", "zigbee", "tuya", "robot vacuum", "dreame",
    "xiaomi robot", "roborock", "roomba", "ecovacs"
  ],
  "אופנה": [
    "fashion", "clothing", "shirt", "dress", "pants", "jeans", "jacket", "coat",
    "shoes", "sneakers", "boots", "sandals", "bag", "handbag", "wallet", "belt",
    "watch", "jewelry", "necklace", "bracelet", "ring", "earring", "sunglasses",
    "hat", "scarf", "gloves", "underwear", "socks", "swimwear", "bikini",
    "shorts", "cotton", "men", "women", "summer", "winter", "t-shirt"
  ],
  "נסיעות": [
    "travel", "luggage", "suitcase", "backpack", "passport", "neck pillow", 
    "travel adapter", "packing", "organizer bag", "camping", "hiking", "outdoor",
    "tent", "sleeping bag", "flashlight", "compass", "water bottle travel"
  ],
  "בריאות": [
    "health", "medical", "massage", "fitness", "exercise", "yoga", "gym", "weight",
    "scale", "blood pressure", "thermometer", "first aid", "vitamin", "supplement",
    "posture", "back support", "knee", "wrist", "ankle", "pain relief", "sleep",
    "trimmer", "clipper", "shaver", "beard", "hair cut", "barber", "razor",
    "essential oil", "aromatherapy", "fragrance oil", "diffuser"
  ],
  "כלי עבודה": [
    "tool", "drill", "screwdriver", "wrench", "hammer", "plier", "saw", "measure",
    "tape", "level", "multimeter", "soldering", "welding", "cutting", "grinding",
    "toolbox", "work light", "gloves work", "safety", "ladder", "pump inflat"
  ]
};

// Detect category from product name
function detectCategory(productName: string): string {
  if (!productName) return "כללי";
  
  const lowerName = productName.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  
  return "כללי";
}

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

// Extract AliExpress links from free text (messages)
function extractLinksFromText(text: string): string[] {
  // Regex patterns for different AliExpress URL formats
  const patterns = [
    /https?:\/\/(?:www\.|he\.|m\.)?aliexpress\.com\/item\/\d+\.html[^\s]*/gi,
    /https?:\/\/(?:www\.|he\.|m\.)?aliexpress\.com\/i\/\d+\.html[^\s]*/gi,
    /https?:\/\/s\.click\.aliexpress\.com\/e\/[^\s]+/gi,
    /https?:\/\/a\.aliexpress\.com\/[^\s]+/gi,
    /https?:\/\/aliexpress\.com\/[^\s]*item[^\s]*/gi,
  ];
  
  const foundLinks = new Set<string>();
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Clean up the URL (remove trailing punctuation that might have been captured)
        const cleanUrl = match.replace(/[,.\s!?)]+$/, '');
        foundLinks.add(cleanUrl);
      });
    }
  }
  
  return Array.from(foundLinks);
}

export const LinkConverter = () => {
  const [inputLinks, setInputLinks] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [freeText, setFreeText] = useState("");
  const [convertedLinks, setConvertedLinks] = useState<ConvertedLink[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRecategorizing, setIsRecategorizing] = useState(false);
  const [isExtractingLinks, setIsExtractingLinks] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("כללי");
  const [selectedForImport, setSelectedForImport] = useState<Set<string>>(new Set());
  
  // Progress tracking
  const [conversionProgress, setConversionProgress] = useState({ current: 0, total: 0 });
  const [scrapeProgress, setScrapeProgress] = useState<string | null>(null);
  const [extractedLinksCount, setExtractedLinksCount] = useState(0);

  // Extract links from pasted free text
  const handleExtractFromText = () => {
    if (!freeText.trim()) {
      toast.error("הדבק טקסט עם הודעות");
      return;
    }

    setIsExtractingLinks(true);
    
    try {
      const links = extractLinksFromText(freeText);
      
      if (links.length === 0) {
        toast.warning("לא נמצאו קישורי AliExpress בטקסט");
        setIsExtractingLinks(false);
        return;
      }
      
      // Add extracted links to inputLinks
      setInputLinks(prev => {
        const existingLinks = prev.split('\n').filter(l => l.trim());
        const newLinks = links.filter(l => !existingLinks.includes(l));
        return [...existingLinks, ...newLinks].join('\n');
      });
      
      setExtractedLinksCount(links.length);
      toast.success(`נמצאו ${links.length} קישורי AliExpress!`);
      setFreeText(''); // Clear the text area after extraction
    } catch (err) {
      console.error('Error extracting links:', err);
      toast.error("שגיאה בחילוץ קישורים");
    } finally {
      setIsExtractingLinks(false);
    }
  };

  // Re-categorize existing "כללי" products
  const handleRecategorize = async () => {
    setIsRecategorizing(true);
    try {
      // Fetch products with "כללי" category
      const { data: products, error } = await supabase
        .from('israel_editor_products')
        .select('id, product_name_hebrew, product_name_english, category_name_hebrew')
        .eq('category_name_hebrew', 'כללי');

      if (error) throw error;

      if (!products || products.length === 0) {
        toast.info("אין מוצרים בקטגוריית 'כללי' לסיווג");
        return;
      }

      let updated = 0;
      for (const product of products) {
        const productName = product.product_name_english || product.product_name_hebrew;
        const newCategory = detectCategory(productName);
        
        if (newCategory !== 'כללי') {
          const { error: updateError } = await supabase
            .from('israel_editor_products')
            .update({ category_name_hebrew: newCategory })
            .eq('id', product.id);
          
          if (!updateError) updated++;
        }
      }

      toast.success(`סווגו מחדש ${updated} מתוך ${products.length} מוצרים`);
    } catch (err) {
      console.error('Error recategorizing:', err);
      toast.error("שגיאה בסיווג מחדש");
    } finally {
      setIsRecategorizing(false);
    }
  };

  // Scrape external website for AliExpress links
  const handleScrapeWebsite = async () => {
    if (!websiteUrl.trim()) {
      toast.error("הכנס כתובת אתר");
      return;
    }

    setIsScraping(true);
    setScrapeProgress("מתחבר לאתר...");
    try {
      setScrapeProgress("סורק דף וחילוץ קישורים...");
      const { data, error } = await supabase.functions.invoke('scrape-external-links', {
        body: { url: websiteUrl.trim() }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'שגיאה בסריקת האתר');
      }

      setScrapeProgress("מעבד תוצאות...");

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
      setScrapeProgress(null);
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
    setConversionProgress({ current: 0, total: links.length });

    const results: ConvertedLink[] = [];

    for (let i = 0; i < links.length; i++) {
      const url = links[i];
      setConversionProgress({ current: i + 1, total: links.length });
      
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

        const commissionRate = productDetails?.commission_rate ? parseFloat(productDetails.commission_rate) : 0;
        
        // Parse rating from evaluate_rate (comes as percentage string like "95.2%")
        const evaluateRate = productDetails?.evaluate_rate;
        let rating = 0;
        if (evaluateRate) {
          // Convert percentage to 5-star scale (e.g., 95% = 4.75 stars)
          const percentage = parseFloat(evaluateRate.replace('%', ''));
          rating = (percentage / 100) * 5;
        }
        
        // Filter: Only include products with rating >= 4 stars
        if (rating < 4 && rating > 0) {
          results.push({
            originalUrl: url,
            productId,
            newTrackingLink: null,
            productName: productDetails?.product_title || undefined,
            commissionRate: commissionRate,
            error: `דירוג נמוך מ-4 כוכבים (${rating.toFixed(1)}⭐)`
          });
          continue;
        }

        const productTitle = productDetails?.product_title || undefined;
        const detectedCategory = detectCategory(productTitle || '');

        results.push({
          originalUrl: url,
          productId,
          newTrackingLink: newLink,
          productName: productTitle,
          priceUsd: productDetails?.target_sale_price ? parseFloat(productDetails.target_sale_price) : undefined,
          originalPriceUsd: productDetails?.target_original_price ? parseFloat(productDetails.target_original_price) : undefined,
          commissionRate: commissionRate,
          inStock: productDetails ? productDetails.product_main_image_url !== undefined : undefined,
          imageUrl: productDetails?.product_main_image_url || undefined,
          detectedCategory: detectedCategory,
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
    setConversionProgress({ current: 0, total: 0 });

    const successCount = results.filter(r => r.newTrackingLink).length;
    const filteredCount = results.filter(r => r.error?.includes('דירוג נמוך')).length;
    
    if (filteredCount > 0) {
      toast.success(`הומרו ${successCount} מתוך ${results.length} קישורים (${filteredCount} סוננו - דירוג מתחת ל-4⭐)`);
    } else {
      toast.success(`הומרו ${successCount} מתוך ${results.length} קישורים`);
    }
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
      // Deduplicate by productId - keep the one with higher commission rate
      const uniqueProducts = new Map<string, typeof linksToImport[0]>();
      linksToImport.forEach(link => {
        const existing = uniqueProducts.get(link.productId);
        if (!existing || (link.commissionRate || 0) > (existing.commissionRate || 0)) {
          uniqueProducts.set(link.productId, link);
        }
      });
      
      const duplicatesCount = linksToImport.length - uniqueProducts.size;
      
      const productsToInsert = Array.from(uniqueProducts.values()).map(link => ({
        aliexpress_product_id: link.productId,
        product_name_hebrew: link.productName || `מוצר ${link.productId}`,
        product_name_english: link.productName || null,
        tracking_link: link.newTrackingLink!,
        category_name_hebrew: link.detectedCategory || selectedCategory,
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

      const duplicateMsg = duplicatesCount > 0 ? ` (${duplicatesCount} כפילויות סוננו)` : '';
      toast.success(`יובאו ${uniqueProducts.size} מוצרים לטבלה${duplicateMsg}`);
      
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

  // Auto-import all successful conversions with detected categories
  const handleAutoImportAll = async () => {
    const linksToImport = convertedLinks.filter(l => l.newTrackingLink);

    if (linksToImport.length === 0) {
      toast.error("אין מוצרים לייבוא");
      return;
    }

    setIsImporting(true);

    try {
      // Deduplicate by productId - keep the one with higher commission rate
      const uniqueProducts = new Map<string, typeof linksToImport[0]>();
      linksToImport.forEach(link => {
        const existing = uniqueProducts.get(link.productId);
        if (!existing || (link.commissionRate || 0) > (existing.commissionRate || 0)) {
          uniqueProducts.set(link.productId, link);
        }
      });
      
      const productsToInsert = Array.from(uniqueProducts.values()).map(link => ({
        aliexpress_product_id: link.productId,
        product_name_hebrew: link.productName || `מוצר ${link.productId}`,
        product_name_english: link.productName || null,
        tracking_link: link.newTrackingLink!,
        category_name_hebrew: link.detectedCategory || 'כללי',
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

      // Count categories for summary
      const categoryCounts: Record<string, number> = {};
      linksToImport.forEach(l => {
        const cat = l.detectedCategory || 'כללי';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });

      const categoryList = Object.entries(categoryCounts)
        .map(([cat, count]) => `${cat}: ${count}`)
        .join(', ');

      toast.success(`✅ יובאו ${linksToImport.length} מוצרים! מתרגם לעברית...`);
      
      // Trigger translation for Israel products
      try {
        const { data: translateResult } = await supabase.functions.invoke('translate-products', {
          body: { platform: 'israel' }
        });
        
        if (translateResult?.results?.israelProducts?.translated > 0) {
          toast.success(`🌐 תורגמו ${translateResult.results.israelProducts.translated} מוצרים לעברית!`);
        }
      } catch (e) {
        console.log('Translation triggered:', e);
      }
      
      // Trigger image scraping for new products
      try {
        await supabase.functions.invoke('scrape-product-images');
      } catch (e) {
        console.log('Image scraping triggered');
      }

      // Clear the converted links after successful auto-import
      setConvertedLinks([]);
      setInputLinks('');
    } catch (err) {
      console.error('Error auto-importing:', err);
      toast.error("שגיאה בייבוא אוטומטי");
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
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2">🔄 המרת קישורי AliExpress</h2>
            <p className="text-sm text-muted-foreground mb-4">
              סרוק אתר חיצוני או הדבק קישורים - הכלי יחלץ את מזהה המוצר ויצור קישורי אפיליאציה חדשים עם ה-Tracking ID שלך
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRecategorize}
            disabled={isRecategorizing}
            className="shrink-0"
          >
            {isRecategorizing ? (
              <>
                <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                מסווג...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 ml-2" />
                סווג מחדש "כללי"
              </>
            )}
          </Button>
        </div>

        <Tabs defaultValue="freetext" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="freetext" className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4" />
              טקסט חופשי
            </TabsTrigger>
            <TabsTrigger value="scrape" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              סריקת אתר
            </TabsTrigger>
            <TabsTrigger value="paste" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              קישורים ישירים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="freetext" className="space-y-3">
            <label className="text-sm font-medium">הדבק הודעות מהקבוצה (טקסט חופשי):</label>
            <Textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder={`הדבק כאן את כל ההודעות מהקבוצה...
למשל:

היי! מצאתי משהו מדהים 🔥
https://s.click.aliexpress.com/e/_ABC123

עוד מוצר מעולה:
https://aliexpress.com/item/1234567890.html

הכלי יחלץ את כל הלינקים אוטומטית!`}
              className="min-h-[200px] font-sans text-sm"
              dir="rtl"
            />
            
            <Button 
              onClick={handleExtractFromText} 
              disabled={isExtractingLinks || !freeText.trim()}
              variant="secondary"
              className="w-full"
            >
              {isExtractingLinks ? (
                <>
                  <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                  מחלץ קישורים...
                </>
              ) : (
                <>
                  <MessageSquareText className="h-4 w-4 ml-2" />
                  חלץ קישורים מהטקסט
                </>
              )}
            </Button>
            
            {extractedLinksCount > 0 && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✅ נמצאו {extractedLinksCount} קישורים! לחץ על "המר לקישורים שלי" להמשיך
                </p>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              פשוט תעתיק את כל ההודעות מהקבוצה - הכלי יזהה ויחלץ את כל לינקי AliExpress אוטומטית
            </p>
          </TabsContent>

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
            
            {/* Scrape Progress */}
            {isScraping && scrapeProgress && (
              <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{scrapeProgress}</span>
                </div>
                <Progress value={undefined} className="h-2" />
              </div>
            )}
            
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
        
        {/* Conversion Progress */}
        {isConverting && conversionProgress.total > 0 && (
          <div className="space-y-2 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                ממיר מוצר {conversionProgress.current} מתוך {conversionProgress.total}
              </span>
              <span className="text-lg font-bold text-orange-600">
                {Math.round((conversionProgress.current / conversionProgress.total) * 100)}%
              </span>
            </div>
            <Progress 
              value={(conversionProgress.current / conversionProgress.total) * 100} 
              className="h-3"
            />
            <p className="text-xs text-orange-600 dark:text-orange-400">
              זמן משוער: ~{Math.ceil((conversionProgress.total - conversionProgress.current) * 0.8 / 60)} דקות
            </p>
          </div>
        )}
        
        {/* Results Section */}
        {convertedLinks.length > 0 && (
          <div className="space-y-4">
            {/* Auto Import Banner */}
            {convertedLinks.some(l => l.newTrackingLink) && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      ייבוא אוטומטי לקטגוריות
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      הכלי יזהה את הקטגוריות אוטומטית ויייבא את כל {convertedLinks.filter(l => l.newTrackingLink).length} המוצרים
                    </p>
                  </div>
                  <Button
                    onClick={handleAutoImportAll}
                    disabled={isImporting}
                    className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                    size="lg"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                        מייבא...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 ml-2" />
                        ייבא הכל אוטומטית
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

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
                        
                        {/* Detected Category */}
                        {link.detectedCategory && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            link.detectedCategory === 'כללי'
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            📁 {link.detectedCategory}
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
