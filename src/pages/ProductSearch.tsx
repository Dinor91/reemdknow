import { Search, Package, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.jpg";

const ProductSearch = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col" dir="ltr">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="Logo" className="h-10 w-10 rounded-full object-contain" />
          </Link>

          <h1 className="text-lg md:text-xl font-bold text-center" style={{ color: "#0F3460" }}>
            Lazada & AliExpress Product Search Tool
          </h1>

          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4" style={{ color: "#22c55e" }} />
            <span className="hidden sm:inline text-muted-foreground">Ready to Search</span>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6 h-full">
          {/* Sidebar – 30% */}
          <aside className="w-full lg:w-[30%] shrink-0">
            <Card className="shadow-md sticky top-24">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: "#0F3460" }}>
                  <Search className="h-4 w-4" />
                  Search Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Placeholder sections */}
                <PlaceholderField label="Search Input" />
                <PlaceholderField label="Category" />
                <PlaceholderField label="Price Range" />
                <PlaceholderField label="Rating" />
                <PlaceholderField label="Sort By" />
                <PlaceholderField label="Platform Selection" />
                <PlaceholderField label="Results Count" />

                <Button
                  className="w-full mt-4 font-semibold text-white"
                  style={{ backgroundColor: "#FF6B35" }}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search Products
                </Button>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content – 70% */}
          <main className="flex-1 min-h-[400px]">
            <div className="h-full flex items-center justify-center border-2 border-dashed border-border rounded-xl">
              <div className="text-center p-8 space-y-4">
                <Package className="h-16 w-16 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground text-lg">
                  Enter search parameters and click Search to find products
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
          <span>Powered by Lazada API & AliExpress API</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last search: —
          </span>
        </div>
      </footer>
    </div>
  );
};

/** Placeholder row for sidebar fields */
const PlaceholderField = ({ label }: { label: string }) => (
  <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5">
    <span className="text-sm text-muted-foreground">{label}</span>
  </div>
);

export default ProductSearch;
