import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCw, Link2, Download, Check, Copy, ExternalLink, Globe, Search, Sparkles, MessageSquareText, Upload, FileSpreadsheet } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from 'xlsx';

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
function extractAliExpressProductId(url: string): string | null {
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

// Extract product ID from Lazada URL formats
function extractLazadaProductId(url: string): string | null {
  // Pattern 1: -i123456789-s... (common format)
  const pattern1 = /-i(\d+)-s/i;
  // Pattern 2: -i123456789.html
  const pattern2 = /-i(\d+)\.html/i;
  // Pattern 3: itemId=123456789
  const pattern3 = /itemId[=:](\d+)/i;
  // Pattern 4: products/product-name-i123456789
  const pattern4 = /-i(\d+)(?:\?|$|\.)/i;
  
  let match = url.match(pattern1) || 
              url.match(pattern2) || 
              url.match(pattern3) ||
              url.match(pattern4);
  
  return match ? match[1] : null;
}

// Legacy alias for backward compatibility
function extractProductId(url: string): string | null {
  return extractAliExpressProductId(url);
}

// Check if URL is a short link that needs resolution
function isShortLink(url: string): boolean {
  const shortLinkDomains = [
    's.lazada.co.th',
    'c.lazada.co.th',
    's.click.aliexpress.com',
    'a.aliexpress.com',
  ];
  return shortLinkDomains.some(domain => url.includes(domain));
}

// Extract AliExpress links from free text (messages)
function extractAliExpressLinks(text: string): string[] {
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
        const cleanUrl = match.replace(/[,.\s!?)]+$/, '');
        foundLinks.add(cleanUrl);
      });
    }
  }
  
  return Array.from(foundLinks);
}

// Extract Lazada links from free text (messages)
function extractLazadaLinks(text: string): string[] {
  const patterns = [
    /https?:\/\/(?:www\.)?lazada\.co\.th\/products\/[^\s]+/gi,
    /https?:\/\/s\.lazada\.co\.th\/[^\s]+/gi,
    /https?:\/\/(?:www\.)?lazada\.co\.th\/[^\s]*i\d+[^\s]*/gi,
    /https?:\/\/c\.lazada\.co\.th\/[^\s]+/gi,
  ];
  
  const foundLinks = new Set<string>();
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleanUrl = match.replace(/[,.\s!?)]+$/, '');
        foundLinks.add(cleanUrl);
      });
    }
  }
  
  return Array.from(foundLinks);
}

// Combined extraction function based on platform
function extractLinksFromText(text: string, platform: 'israel' | 'thailand'): string[] {
  if (platform === 'thailand') {
    return extractLazadaLinks(text);
  }
  return extractAliExpressLinks(text);
}

export const LinkConverter = () => {
  const [inputLinks, setInputLinks] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState("");
  const [freeText, setFreeText] = useState("");
  const [convertedLinks, setConvertedLinks] = useState<ConvertedLink[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [isScrapingSheets, setIsScrapingSheets] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRecategorizing, setIsRecategorizing] = useState(false);
  const [isUpdatingProducts, setIsUpdatingProducts] = useState(false);
  const [isExtractingLinks, setIsExtractingLinks] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("כללי");
  const [selectedForImport, setSelectedForImport] = useState<Set<string>>(new Set());
  const [selectedPlatform, setSelectedPlatform] = useState<'israel' | 'thailand'>('israel');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Progress tracking
  const [conversionProgress, setConversionProgress] = useState({ current: 0, total: 0 });
  const [scrapeProgress, setScrapeProgress] = useState<string | null>(null);
  const [sheetsProgress, setSheetsProgress] = useState<string | null>(null);
  const [extractedLinksCount, setExtractedLinksCount] = useState(0);
  const [resolvingShortLinks, setResolvingShortLinks] = useState(false);
  const [uploadedLinksCount, setUploadedLinksCount] = useState(0);
  const [sheetsLinksCount, setSheetsLinksCount] = useState(0);

  // Extract hyperlinks from Excel file
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    setUploadedLinksCount(0);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellStyles: true });
      
      const foundLinks = new Set<string>();
      const platformName = selectedPlatform === 'thailand' ? 'Lazada' : 'AliExpress';
      const linkPattern = selectedPlatform === 'thailand' ? /lazada/i : /aliexpress|s\.click/i;
      
      // Go through all sheets
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        
        // Method 1: Check for hyperlinks in cell metadata
        for (const cellAddress in sheet) {
          if (cellAddress.startsWith('!')) continue; // Skip special keys
          
          const cell = sheet[cellAddress];
          
          // Check for hyperlink in cell
          if (cell.l && cell.l.Target) {
            const link = cell.l.Target;
            if (linkPattern.test(link)) {
              foundLinks.add(link);
            }
          }
          
          // Method 2: Check cell value for URLs
          if (cell.v && typeof cell.v === 'string') {
            const urlMatches = cell.v.match(/https?:\/\/[^\s"'<>]+/gi);
            if (urlMatches) {
              urlMatches.forEach(url => {
                if (linkPattern.test(url)) {
                  foundLinks.add(url.replace(/[,.\s!?)]+$/, ''));
                }
              });
            }
          }
        }
      }

      if (foundLinks.size === 0) {
        toast.warning(`לא נמצאו קישורי ${platformName} בקובץ`);
        return;
      }

      // Add to input links
      setInputLinks(prev => {
        const existingLinks = prev.split('\n').filter(l => l.trim());
        const newLinks = Array.from(foundLinks).filter(l => !existingLinks.includes(l));
        return [...existingLinks, ...newLinks].join('\n');
      });

      setUploadedLinksCount(foundLinks.size);
      toast.success(`נמצאו ${foundLinks.size} קישורי ${platformName} בקובץ!`);
      
    } catch (err) {
      console.error('Error parsing file:', err);
      toast.error("שגיאה בקריאת הקובץ");
    } finally {
      setIsUploadingFile(false);
      // Reset input so the same file can be uploaded again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Extract links from pasted free text
  const handleExtractFromText = () => {
    if (!freeText.trim()) {
      toast.error("הדבק טקסט עם הודעות");
      return;
    }

    setIsExtractingLinks(true);
    
    try {
      const links = extractLinksFromText(freeText, selectedPlatform);
      const platformName = selectedPlatform === 'thailand' ? 'Lazada' : 'AliExpress';
      
      if (links.length === 0) {
        toast.warning(`לא נמצאו קישורי ${platformName} בטקסט`);
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
      toast.success(`נמצאו ${links.length} קישורי ${platformName}!`);
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
     if (selectedPlatform === 'thailand') {
       // Thailand: Fetch from category_products
       const { data: products, error } = await supabase
         .from('category_products')
         .select('id, name_hebrew, name_english, category')
         .eq('category', 'כללי');

       if (error) throw error;

       if (!products || products.length === 0) {
         toast.info("אין מוצרים בקטגוריית 'כללי' לסיווג");
         return;
       }

       let updated = 0;
       for (const product of products) {
         const productName = product.name_english || product.name_hebrew;
         const newCategory = detectCategory(productName);
         
         if (newCategory !== 'כללי') {
           const { error: updateError } = await supabase
             .from('category_products')
             .update({ category: newCategory })
             .eq('id', product.id);
           
           if (!updateError) updated++;
         }
        }

       toast.success(`סווגו מחדש ${updated} מתוך ${products.length} מוצרים (תאילנד)`);
     } else {
       // Israel: Fetch from israel_editor_products
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

       toast.success(`סווגו מחדש ${updated} מתוך ${products.length} מוצרים (ישראל)`);
     }
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

  // Scrape Google Sheets URL for links
  const handleScrapeGoogleSheets = async () => {
    if (!googleSheetsUrl.trim()) {
      toast.error("הכנס קישור ל-Google Sheets");
      return;
    }

    // Validate it's a Google Sheets URL
    if (!googleSheetsUrl.includes('docs.google.com/spreadsheets')) {
      toast.error("הקישור לא נראה כמו Google Sheets");
      return;
    }

    setIsScrapingSheets(true);
    setSheetsProgress("מתחבר ל-Google Sheets...");
    setSheetsLinksCount(0);

    try {
      const platformName = selectedPlatform === 'thailand' ? 'Lazada' : 'AliExpress';
      const linkPattern = selectedPlatform === 'thailand' ? /lazada/i : /aliexpress|s\.click/i;

      setSheetsProgress("סורק את הגיליון...");
      
      // Use Firecrawl to scrape the Google Sheets page (it renders the HTML)
      const { data, error } = await supabase.functions.invoke('scrape-google-sheets', {
        body: { url: googleSheetsUrl.trim(), platform: selectedPlatform }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'שגיאה בסריקת הגיליון');
      }

      setSheetsProgress("מעבד תוצאות...");

      if (data.links && data.links.length > 0) {
        // Add scraped links to the input textarea
        const linkUrls = data.links.join('\n');
        setInputLinks(prev => {
          const existingLinks = prev.split('\n').filter(l => l.trim());
          const newLinks = data.links.filter((l: string) => !existingLinks.includes(l));
          return [...existingLinks, ...newLinks].join('\n');
        });
        setSheetsLinksCount(data.links.length);
        toast.success(`נמצאו ${data.links.length} קישורי ${platformName}!`);
      } else {
        toast.warning(`לא נמצאו קישורי ${platformName} בגיליון`);
      }
    } catch (err: any) {
      console.error('Google Sheets scrape error:', err);
      toast.error(err.message || "שגיאה בסריקת הגיליון");
    } finally {
      setIsScrapingSheets(false);
      setSheetsProgress(null);
    }
  };

  const handleConvert = async () => {
    const isThailand = selectedPlatform === 'thailand';
    const platformName = isThailand ? 'Lazada' : 'AliExpress';
    
    // Filter links based on platform
    let links = inputLinks
      .split('\n')
      .map(l => l.trim())
      .filter(l => {
        if (l.length === 0) return false;
        if (isThailand) {
          return l.includes('lazada');
        }
        return l.includes('aliexpress') || l.includes('s.click');
      });

    if (links.length === 0) {
      toast.error(`לא נמצאו קישורי ${platformName}`);
      return;
    }

    setIsConverting(true);
    setConvertedLinks([]);
    
    // Step 1: Identify short links that need resolution
    const extractId = isThailand ? extractLazadaProductId : extractAliExpressProductId;
    const shortLinks = links.filter(url => isShortLink(url) && !extractId(url));
    const directLinks = links.filter(url => !shortLinks.includes(url));
    
    // Step 2: Resolve short links if any
    if (shortLinks.length > 0) {
      setResolvingShortLinks(true);
      toast.info(`פותר ${shortLinks.length} קישורים קצרים...`);
      
      try {
        const { data, error } = await supabase.functions.invoke('resolve-short-links', {
          body: { urls: shortLinks }
        });
        
        if (error) throw error;
        
        if (data.success && data.resolved) {
          // Replace short links with resolved URLs
          const resolvedMap = data.resolved as Record<string, string>;
          links = links.map(url => {
            if (resolvedMap[url]) {
              console.log(`Replaced: ${url} -> ${resolvedMap[url]}`);
              return resolvedMap[url];
            }
            return url;
          });
          
          if (data.resolvedCount > 0) {
            toast.success(`נפתרו ${data.resolvedCount} קישורים קצרים`);
          }
          if (data.failedCount > 0) {
            toast.warning(`${data.failedCount} קישורים לא נפתרו`);
          }
        }
      } catch (err) {
        console.error('Error resolving short links:', err);
        toast.warning('שגיאה בפתירת קישורים קצרים, ממשיך עם הקישורים הזמינים');
      } finally {
        setResolvingShortLinks(false);
      }
    }
    
    setConversionProgress({ current: 0, total: links.length });

    const results: ConvertedLink[] = [];

    for (let i = 0; i < links.length; i++) {
      const url = links[i];
      setConversionProgress({ current: i + 1, total: links.length });
      
      // Extract product ID based on platform
      const productId = isThailand 
        ? extractLazadaProductId(url) 
        : extractAliExpressProductId(url);
      
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
        if (isThailand) {
          // Lazada: Use batch-links API to generate affiliate tracking link
          const { data: linkData, error: linkError } = await supabase.functions.invoke('lazada-api', {
            body: {
              action: 'batch-links',
              inputType: 'productId',
              inputValue: productId
            }
          });

          if (linkError) throw linkError;

          // Parse the Lazada API response - correct path based on actual API response
          // Response structure: { data: { result: { data: { productBatchGetLinkInfoList: [...] } } } }
          const responseResult = linkData?.data?.result?.data;
          const productList = responseResult?.productBatchGetLinkInfoList || [];
          const errorList = responseResult?.errorInfoList || [];
          
          // Check if we got a successful link
          const productInfo = productList[0];
          const newLink = productInfo?.regularPromotionLink || null;
          
          // Check for errors
          let errorMsg: string | undefined = undefined;
          if (!newLink) {
            const errorInfo = errorList[0];
            if (errorInfo?.errorCode === '2001') {
              errorMsg = "המוצר לא זמין בתוכנית השותפים";
            } else if (errorInfo?.errorMsg) {
              errorMsg = errorInfo.errorMsg;
            } else {
              errorMsg = "לא הצלחנו ליצור קישור חדש";
            }
          }
          
          // Parse commission rate (comes as "1%" string)
          let commissionRate: number | undefined;
          if (productInfo?.regularCommission) {
            commissionRate = parseFloat(productInfo.regularCommission.replace('%', ''));
          }

          results.push({
            originalUrl: url,
            productId,
            newTrackingLink: newLink,
            productName: productInfo?.productName || undefined,
            priceUsd: undefined, // Lazada batch-links doesn't return price
            commissionRate: commissionRate,
            inStock: !!newLink,
            imageUrl: undefined, // Lazada batch-links doesn't return image
           detectedCategory: detectCategory(productInfo?.productName || ''),
            error: errorMsg
          });

        } else {
          // AliExpress: Generate new affiliate link using the API
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
        }

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

    // Calculate detailed stats
    const successCount = results.filter(r => r.newTrackingLink).length;
    const lowRatingCount = results.filter(r => r.error?.includes('דירוג נמוך')).length;
    const errorCount = results.filter(r => r.error && !r.error.includes('דירוג נמוך')).length;
    const duplicatesRemoved = links.length - results.length;
    
    // Build detailed summary message
    const summaryParts: string[] = [];
    summaryParts.push(`✅ ${successCount} מוצרים מוכנים לייבוא`);
    
    if (lowRatingCount > 0) {
      summaryParts.push(`⭐ ${lowRatingCount} סוננו (דירוג < 4)`);
    }
    if (errorCount > 0) {
      summaryParts.push(`❌ ${errorCount} שגיאות`);
    }
    if (duplicatesRemoved > 0) {
      summaryParts.push(`🔄 ${duplicatesRemoved} כפילויות הוסרו`);
    }
    
    toast.success(summaryParts.join(' | '), { duration: 6000 });
  };

  const handleImport = async () => {
    // First check if there are any converted links at all
    if (convertedLinks.length === 0) {
      toast.error("אין מוצרים שהומרו - סרוק קישורים קודם ולחץ על 'המר'");
      return;
    }

    const successfulLinks = convertedLinks.filter(l => l.newTrackingLink);
    if (successfulLinks.length === 0) {
      const errorCount = convertedLinks.filter(l => l.error).length;
      toast.error(`כל ${convertedLinks.length} המוצרים נכשלו בהמרה (${errorCount} שגיאות)`);
      return;
    }

    const linksToImport = successfulLinks.filter(l => selectedForImport.has(l.productId));

    if (linksToImport.length === 0) {
      toast.error(`בחר מוצרים לייבוא (${successfulLinks.length} זמינים)`);
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
      
      if (selectedPlatform === 'thailand') {
        // Thailand: Insert into category_products table
        const productsToInsert = Array.from(uniqueProducts.values()).map(link => ({
          lazada_product_id: link.productId,
          name_hebrew: link.productName || `מוצר ${link.productId}`,
          name_english: link.productName || null,
          affiliate_link: link.newTrackingLink!,
          category: link.detectedCategory || selectedCategory,
          price_thb: link.priceUsd || null, // Note: for Lazada this comes as THB
          image_url: link.imageUrl || null,
          is_active: true,
          out_of_stock: link.inStock === false
        }));

        const { error } = await supabase
          .from('category_products')
          .upsert(productsToInsert, { 
            onConflict: 'lazada_product_id',
            ignoreDuplicates: false 
          });

        if (error) throw error;

        // Trigger Lazada image scraping
        try {
          await supabase.functions.invoke('scrape-lazada-images');
        } catch (e) {
          console.log('Lazada image scraping triggered');
        }
      } else {
        // Israel: Insert into israel_editor_products table
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

        // Trigger image scraping for new products
        try {
          await supabase.functions.invoke('scrape-product-images');
        } catch (e) {
          console.log('Image scraping triggered');
        }
      }

      const duplicateMsg = duplicatesCount > 0 ? ` (${duplicatesCount} כפילויות סוננו)` : '';
      toast.success(`יובאו ${uniqueProducts.size} מוצרים לטבלה${duplicateMsg}`);

      setSelectedForImport(new Set());
    } catch (err) {
      console.error('Error importing:', err);
      toast.error("שגיאה בייבוא המוצרים");
    } finally {
      setIsImporting(false);
    }
  };

  // Progress state for batch import
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  // Update product details from API (prices, images)
  const handleUpdateProductDetails = async () => {
    setIsUpdatingProducts(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error("יש להתחבר כאדמין");
        return;
      }

      if (selectedPlatform === 'thailand') {
        // Thailand: Update from Lazada feed
        toast.info("🔄 מעדכן מחירים ותמונות מ-Lazada...");
        const { data, error } = await supabase.functions.invoke('update-category-products', {
          headers: {
            Authorization: `Bearer ${session.session.access_token}`
          }
        });

        if (error) throw error;

        if (data?.updated > 0) {
          toast.success(`✅ עודכנו ${data.updated} מוצרים (${data.foundInFeed} נמצאו בפיד)`);
        } else {
          toast.info("כל המוצרים כבר מעודכנים");
        }
      } else {
        // Israel: Trigger translation and image scraping
        toast.info("🔄 מעדכן תרגום ותמונות...");
        await supabase.functions.invoke('translate-products', {
          body: { platform: 'israel' }
        });
        await supabase.functions.invoke('scrape-product-images');
        toast.success("✅ עדכון הושלם");
      }
    } catch (err) {
      console.error('Error updating products:', err);
      toast.error("שגיאה בעדכון המוצרים");
    } finally {
      setIsUpdatingProducts(false);
    }
  };

  // Auto-import all successful conversions with detected categories - BATCH PROCESSING
  const handleAutoImportAll = async () => {
    // First check if there are any converted links at all
    if (convertedLinks.length === 0) {
      toast.error("אין מוצרים שהומרו - סרוק קישורים קודם ולחץ על 'המר'");
      return;
    }

    const linksToImport = convertedLinks.filter(l => l.newTrackingLink);

    if (linksToImport.length === 0) {
      const errorCount = convertedLinks.filter(l => l.error).length;
      const filteredCount = convertedLinks.filter(l => l.error?.includes('דירוג נמוך')).length;
      if (filteredCount > 0) {
        toast.error(`כל ${convertedLinks.length} המוצרים סוננו - ${filteredCount} בדירוג נמוך מ-4⭐`);
      } else {
        toast.error(`כל ${convertedLinks.length} המוצרים נכשלו בהמרה (${errorCount} שגיאות)`);
      }
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: 0 });

    try {
      // Deduplicate by productId - keep the one with higher commission rate
      const uniqueProducts = new Map<string, typeof linksToImport[0]>();
      linksToImport.forEach(link => {
        const existing = uniqueProducts.get(link.productId);
        if (!existing || (link.commissionRate || 0) > (existing.commissionRate || 0)) {
          uniqueProducts.set(link.productId, link);
        }
      });
      
      const allProducts = Array.from(uniqueProducts.values());
      const BATCH_SIZE = 50; // Process 50 products at a time
      const totalProducts = allProducts.length;
      let importedCount = 0;
      
      setImportProgress({ current: 0, total: totalProducts });
      
      // Split into batches
      const batches: typeof allProducts[] = [];
      for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
        batches.push(allProducts.slice(i, i + BATCH_SIZE));
      }
      
      if (selectedPlatform === 'thailand') {
        // Thailand: Insert into category_products table in batches
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          const productsToInsert = batch.map(link => ({
            lazada_product_id: link.productId,
           name_hebrew: link.productName || '',
            name_english: link.productName || null,
            affiliate_link: link.newTrackingLink!,
            category: link.detectedCategory || 'כללי',
            price_thb: link.priceUsd || null,
            image_url: link.imageUrl || null,
            is_active: true,
            out_of_stock: link.inStock === false
          }));

          const { error } = await supabase
            .from('category_products')
            .upsert(productsToInsert, { 
              onConflict: 'lazada_product_id',
              ignoreDuplicates: false 
            });

          if (error) throw error;

          importedCount += batch.length;
          setImportProgress({ current: importedCount, total: totalProducts });
          
          // Small delay between batches to prevent overwhelming the database
          if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        toast.success(`✅ יובאו ${totalProducts} מוצרים לתאילנד!`);

        // Trigger Lazada image scraping
        try {
          await supabase.functions.invoke('scrape-lazada-images');
        } catch (e) {
          console.log('Lazada image scraping triggered');
        }
       
       // Trigger product data sync to fetch prices and images from Lazada feed
       try {
         const { data: session } = await supabase.auth.getSession();
         if (session?.session?.access_token) {
           await supabase.functions.invoke('update-category-products', {
             headers: {
               Authorization: `Bearer ${session.session.access_token}`
             }
           });
           toast.info("🔄 מעדכן מחירים ותמונות מ-Lazada...");
         }
       } catch (e) {
         console.log('Product data sync triggered');
       }
      } else {
        // Israel: Insert into israel_editor_products table in batches
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          const productsToInsert = batch.map(link => ({
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

          importedCount += batch.length;
          setImportProgress({ current: importedCount, total: totalProducts });
          
          // Small delay between batches
          if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        toast.success(`✅ יובאו ${totalProducts} מוצרים! מתרגם לעברית...`);
        
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
      }

      // Clear the converted links after successful auto-import
      setConvertedLinks([]);
      setInputLinks('');
    } catch (err) {
      console.error('Error auto-importing:', err);
      toast.error(`שגיאה בייבוא - יובאו ${importProgress.current} מתוך ${importProgress.total}`);
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0 });
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
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">🔄 המרת קישורים לאפיליאציה</h2>
            <p className="text-sm text-muted-foreground mb-4">
              סרוק אתר חיצוני או הדבק קישורים - הכלי יחלץ את מזהה המוצר ויצור קישורי אפיליאציה חדשים
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Platform Selector */}
            <Select value={selectedPlatform} onValueChange={(v: 'israel' | 'thailand') => setSelectedPlatform(v)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="israel">🇮🇱 ישראל (AliExpress)</SelectItem>
                <SelectItem value="thailand">🇹🇭 תאילנד (Lazada)</SelectItem>
              </SelectContent>
            </Select>
            
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
           
           <Button 
             variant="secondary" 
             onClick={handleUpdateProductDetails}
             disabled={isUpdatingProducts}
             className="shrink-0"
           >
             {isUpdatingProducts ? (
               <>
                 <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                 מעדכן...
               </>
             ) : (
               <>
                 <Download className="h-4 w-4 ml-2" />
                 עדכן פרטי מוצרים
               </>
             )}
           </Button>
          </div>
        </div>

        <Tabs defaultValue="freetext" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="freetext" className="flex items-center gap-1 text-xs sm:text-sm">
              <MessageSquareText className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">טקסט חופשי</span>
              <span className="sm:hidden">טקסט</span>
            </TabsTrigger>
            <TabsTrigger value="sheets" className="flex items-center gap-1 text-xs sm:text-sm">
              <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Google Sheets</span>
              <span className="sm:hidden">שיטס</span>
            </TabsTrigger>
            <TabsTrigger value="file" className="flex items-center gap-1 text-xs sm:text-sm">
              <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">העלאת קובץ</span>
              <span className="sm:hidden">קובץ</span>
            </TabsTrigger>
            <TabsTrigger value="scrape" className="flex items-center gap-1 text-xs sm:text-sm">
              <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">סריקת אתר</span>
              <span className="sm:hidden">אתר</span>
            </TabsTrigger>
            <TabsTrigger value="paste" className="flex items-center gap-1 text-xs sm:text-sm">
              <Link2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">ישירים</span>
              <span className="sm:hidden">לינקים</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="freetext" className="space-y-3">
            <label className="text-sm font-medium">
              הדבק הודעות מהקבוצה (טקסט חופשי) - {selectedPlatform === 'thailand' ? 'Lazada' : 'AliExpress'}:
            </label>
            <Textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder={selectedPlatform === 'thailand' 
                ? `הדבק כאן את כל ההודעות מהקבוצה...
למשל:

היי! מצאתי משהו מדהים 🔥
https://s.lazada.co.th/s.abc123

עוד מוצר מעולה:
https://www.lazada.co.th/products/product-name-i12345678.html

הכלי יחלץ את כל לינקי Lazada אוטומטית!`
                : `הדבק כאן את כל ההודעות מהקבוצה...
למשל:

היי! מצאתי משהו מדהים 🔥
https://s.click.aliexpress.com/e/_ABC123

עוד מוצר מעולה:
https://aliexpress.com/item/1234567890.html

הכלי יחלץ את כל לינקי AliExpress אוטומטית!`}
              className="min-h-[250px] font-sans text-sm resize-y"
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
              פשוט תעתיק את כל ההודעות מהקבוצה - הכלי יזהה ויחלץ את כל לינקי {selectedPlatform === 'thailand' ? 'Lazada' : 'AliExpress'} אוטומטית
            </p>
          </TabsContent>

          <TabsContent value="sheets" className="space-y-3">
            <label className="text-sm font-medium">
              קישור ל-Google Sheets ציבורי - {selectedPlatform === 'thailand' ? 'Lazada' : 'AliExpress'}:
            </label>
            <div className="flex gap-2">
              <Input
                value={googleSheetsUrl}
                onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="font-mono text-sm flex-1"
                dir="ltr"
              />
              <Button 
                onClick={handleScrapeGoogleSheets} 
                disabled={isScrapingSheets || !googleSheetsUrl.trim()}
              >
                {isScrapingSheets ? (
                  <>
                    <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                    סורק...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4 ml-2" />
                    סרוק שיטס
                  </>
                )}
              </Button>
            </div>
            
            {/* Sheets Progress */}
            {isScrapingSheets && sheetsProgress && (
              <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{sheetsProgress}</span>
                </div>
                <Progress value={undefined} className="h-2" />
              </div>
            )}

            {sheetsLinksCount > 0 && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✅ נמצאו {sheetsLinksCount} קישורים מהגיליון! לחץ על "המר לקישורים שלי" להמשיך
                </p>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              הדבק קישור ל-Google Sheets ציבורי. הכלי יסרוק את הגיליון ויחלץ את כל ההיפר-לינקים אוטומטית.
            </p>
          </TabsContent>

          <TabsContent value="file" className="space-y-3">
            <label className="text-sm font-medium">
              העלה קובץ Excel או CSV עם קישורים - {selectedPlatform === 'thailand' ? 'Lazada' : 'AliExpress'}:
            </label>
            
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploadingFile ? (
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">מעבד קובץ...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">לחץ להעלאת קובץ</p>
                  <p className="text-xs text-muted-foreground">
                    XLSX, XLS או CSV - הכלי יחלץ היפר-לינקים מוסתרים
                  </p>
                </div>
              )}
            </div>

            {uploadedLinksCount > 0 && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✅ נמצאו {uploadedLinksCount} קישורים מהקובץ! לחץ על "המר לקישורים שלי" להמשיך
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              ייצא את הטבלה מ-Google Sheets כ-XLSX והעלה כאן. הכלי יחלץ את כל ההיפר-לינקים המוסתרים אוטומטית.
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
              הכלי יסרוק את האתר ויחלץ את כל קישורי {selectedPlatform === 'thailand' ? 'Lazada' : 'AliExpress'} שנמצאים בו
            </p>
          </TabsContent>

          <TabsContent value="paste" className="space-y-3">
            <label className="text-sm font-medium">הדבק קישורים (קישור אחד בכל שורה):</label>
            <Textarea
              value={inputLinks}
              onChange={(e) => setInputLinks(e.target.value)}
              placeholder={selectedPlatform === 'thailand' 
                ? `https://www.lazada.co.th/products/product-name-i12345678.html
https://s.lazada.co.th/s.abc123`
                : `https://www.aliexpress.com/item/1234567890.html
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
              {inputLinks.split('\n').filter(l => 
                selectedPlatform === 'thailand' 
                  ? l.includes('lazada')
                  : (l.includes('aliexpress') || l.includes('s.click'))
              ).length}
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
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      ייבוא אוטומטי לקטגוריות
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      הכלי יזהה את הקטגוריות אוטומטית ויייבא את כל {convertedLinks.filter(l => l.newTrackingLink).length} המוצרים
                    </p>
                    {/* Progress bar during import */}
                    {isImporting && importProgress.total > 0 && (
                      <div className="mt-3 space-y-1">
                        <Progress 
                          value={(importProgress.current / importProgress.total) * 100} 
                          className="h-2 bg-green-200 dark:bg-green-800"
                        />
                        <p className="text-xs text-green-600 dark:text-green-400">
                          מייבא {importProgress.current} מתוך {importProgress.total} מוצרים ({Math.round((importProgress.current / importProgress.total) * 100)}%)
                        </p>
                      </div>
                    )}
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
