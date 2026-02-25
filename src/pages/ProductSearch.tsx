import { useState } from "react";
import { Search, Package, RotateCcw, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.jpg";

const ProductSearch = () => {
  const [message, setMessage] = useState("");
  const [showResults, setShowResults] = useState(false);

  const parameters = [
    { icon: "🛍️", label: "מוצר", value: "—" },
    { icon: "💰", label: "תקציב מקס׳", value: "—" },
    { icon: "⭐", label: "דירוג מינימלי", value: "—" },
    { icon: "🏷️", label: "מותג", value: "—" },
    { icon: "🌐", label: "פלטפורמה", value: "—" },
  ];

  const resultCards = [
    { rank: "🥇", label: "המחיר הטוב ביותר", accentClass: "border-green-500 bg-green-500/10", badgeClass: "bg-green-500/20 text-green-700" },
    { rank: "🥈", label: "הדירוג הגבוה ביותר", accentClass: "border-[#0F3460] bg-[#0F3460]/10", badgeClass: "bg-[#0F3460]/20 text-[#0F3460]" },
    { rank: "🥉", label: "התמורה הטובה ביותר", accentClass: "border-[#FF6B35] bg-[#FF6B35]/10", badgeClass: "bg-[#FF6B35]/20 text-[#FF6B35]" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: "#1A1A2E" }}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="Logo" className="h-10 w-10 rounded-full object-contain" />
          </Link>
          <h1 className="text-lg md:text-xl font-bold text-center text-white">
            חיפוש מוצרים חכם
          </h1>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <span className="h-2 w-2 rounded-full bg-green-400 inline-block" />
            <span className="hidden sm:inline">מוכן לחיפוש</span>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-4 py-6 space-y-6">
        {/* ─── TOP: INPUT AREA ─── */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">📋 הדבקת הודעת לקוח</h2>
            <p className="text-sm text-muted-foreground">
              הדביקו הודעת לקוח והכלי יחלץ את פרמטרי החיפוש באופן אוטומטי
            </p>
          </div>

          {/* Textarea with clear button */}
          <div className="relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full resize-none pr-16 text-base"
              placeholder={`הדביקו הודעת לקוח כאן...\nדוגמה: היי ראם, אני מחפש אוזניות בלוטות׳, תקציב עד 800 באט, לא משנה מותג, פשוט איכות טובה`}
            />
            {message && (
              <button
                onClick={() => setMessage("")}
                className="absolute top-2 right-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors bg-background/80 rounded px-2 py-1"
              >
                <X className="h-3 w-3" /> נקה
              </button>
            )}
          </div>

          {/* Extracted Parameters */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">🔍 פרמטרים שזוהו:</p>
            <div className="flex flex-wrap gap-2">
              {parameters.map((p) => (
                <Badge
                  key={p.label}
                  variant="secondary"
                  className="text-sm font-normal px-3 py-1.5 gap-1.5"
                >
                  <span>{p.icon}</span>
                  <span className="text-muted-foreground">{p.label}:</span>
                  <span className="font-medium text-foreground">{p.value}</span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Platform Override" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הפלטפורמות</SelectItem>
                <SelectItem value="lazada">Lazada תאילנד בלבד</SelectItem>
                <SelectItem value="aliexpress">AliExpress בלבד</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1 flex flex-col items-stretch sm:items-end gap-1">
              <Button
                disabled
                className="w-full sm:w-auto text-white font-semibold px-8"
                style={{ backgroundColor: "#0F3460" }}
              >
                🚀 חפש עכשיו
              </Button>
              <p className="text-xs text-muted-foreground text-center sm:text-start">
                התוצאות יופיעו למטה תוך שניות
              </p>
            </div>
          </div>
        </section>

        {/* ─── BOTTOM: RESULTS AREA ─── */}
        <section className="space-y-4">
          {/* Section title bar */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">📦 תוצאות חיפוש</h2>
            <span className="text-sm text-muted-foreground italic">ממתין לחיפוש...</span>
          </div>

          {/* Empty State */}
          {!showResults && (
            <div className="flex items-center justify-center border-2 border-dashed border-border rounded-xl min-h-[300px]">
              <div className="text-center p-8 space-y-3">
                <Search className="h-14 w-14 mx-auto text-muted-foreground/40" />
                <p className="text-lg font-medium text-muted-foreground">No results yet</p>
                <p className="text-sm text-muted-foreground/70">
                  Paste a customer message above and click Search Now
                </p>
              </div>
            </div>
          )}

          {/* Result Cards (shown for structure preview – toggle showResults to true to see) */}
          {showResults && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {resultCards.map((card, i) => (
                  <Card key={i} className={`border-2 ${card.accentClass} overflow-hidden`}>
                    <CardContent className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold">
                          {card.rank} אפשרות {i + 1}
                        </span>
                        <Badge className={card.badgeClass}>{card.label}</Badge>
                      </div>

                      {/* Platform badge */}
                      <Badge variant="outline" className="text-xs">
                        Lazada
                      </Badge>

                      {/* Image placeholder */}
                      <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center">
                        <Package className="h-12 w-12 text-muted-foreground/30" />
                      </div>

                      {/* Product info */}
                      <p className="font-semibold text-foreground line-clamp-2">שם המוצר כאן</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>⭐ 4.8</span>
                        <span>🛒 1.2k נמכרו</span>
                      </div>

                      {/* Price */}
                      <div>
                        <span className="text-lg font-bold" style={{ color: "#FF6B35" }}>💰 ฿599</span>
                        <span className="ml-2 text-sm text-muted-foreground line-through">฿899</span>
                        <span className="ml-1 text-xs text-green-600 font-medium">-33%</span>
                      </div>

                      <hr className="border-border" />

                      {/* Explanation */}
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">💬 למה המוצר הזה?</p>
                        <p className="text-sm text-muted-foreground italic">
                          ״מתאים לתקציב, דירוג גבוה, ומשלוח מהיר לאזור שלך.״
                        </p>
                      </div>

                      <hr className="border-border" />

                      {/* Action */}
                      <Button variant="outline" className="w-full gap-2" disabled>
                        <ExternalLink className="h-4 w-4" /> צפה במוצר
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Post-results info */}
              <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2 pt-2">
                <span>החיפוש הושלם תוך — שניות</span>
                <span>חיפוש אחרון: —</span>
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                  <RotateCcw className="h-3 w-3" /> חיפוש חדש
                </Button>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t py-4 mt-auto">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
          <span>מופעל על ידי Lazada Open API & AliExpress API</span>
          <span>v1.0</span>
        </div>
      </footer>
    </div>
  );
};

export default ProductSearch;
