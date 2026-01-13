import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.jpg";
import { trackEvent } from "@/lib/analytics";

export const Header = () => {
  const location = useLocation();
  const isIsrael = location.pathname === "/israel";
  const isThailand = location.pathname === "/thailand";

  const handleCountrySwitch = (country: string) => {
    trackEvent('country_switch', {
      event_category: 'navigation',
      event_label: country,
      from_page: location.pathname
    });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-start gap-4">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="Reem(D)Know Logo" className="h-12 w-12 rounded-full object-cover" />
        </Link>
        
        <div className="flex gap-2">
          <Link to="/israel" onClick={() => handleCountrySwitch('israel')}>
            <Button 
              variant={isIsrael ? "default" : "outline"}
              className="transition-all hover:scale-105"
            >
              ישראל
            </Button>
          </Link>
          <Link to="/thailand" onClick={() => handleCountrySwitch('thailand')}>
            <Button 
              variant={isThailand ? "default" : "outline"}
              className="transition-all hover:scale-105"
            >
              תאילנד
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};