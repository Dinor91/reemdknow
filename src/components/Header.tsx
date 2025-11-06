import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Header = () => {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">
          REEM(D)KNOW
        </Link>
        
        <div className="flex gap-2">
          {user && isAdmin ? (
            <>
              <Button asChild variant="outline" size="sm">
                <Link to="/conversions">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  ניהול המרות
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
                התנתק
              </Button>
            </>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link to="/auth">
                <BarChart3 className="h-4 w-4 mr-2" />
                כניסה למנהל
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
