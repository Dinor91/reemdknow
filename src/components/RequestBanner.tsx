import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface RequestBannerProps {
  variant?: 'thailand' | 'israel';
}

export const RequestBanner = ({ variant = 'thailand' }: RequestBannerProps) => {
  const isThailand = variant === 'thailand';
  
  return (
    <section className={`py-6 ${isThailand ? 'bg-orange-50' : 'bg-blue-50'}`}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
          <div className="flex items-center gap-2">
            <MessageSquare className={`h-5 w-5 ${isThailand ? 'text-orange-600' : 'text-blue-600'}`} />
            <span className="text-lg font-medium text-foreground">
              מחפשים משהו ספציפי?
            </span>
          </div>
          <Button 
            asChild
            className={isThailand 
              ? 'bg-orange-600 hover:bg-orange-700' 
              : 'bg-blue-600 hover:bg-blue-700'
            }
          >
            <Link to="/requests">
              שלחו לי בקשה
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
