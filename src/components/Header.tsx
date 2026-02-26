import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/dknow-logo.png";
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
    <header dir="ltr" className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex gap-2">
          <Link to="/thailand" onClick={() => handleCountrySwitch('thailand')}>
            <Button 
              variant={isThailand ? "default" : "outline"}
              className={`transition-all hover:scale-105 ${isThailand ? "bg-orange-500 hover:bg-orange-600 text-white" : "border-orange-500 text-orange-500 hover:bg-orange-50"}`}
            >
              תאילנד
            </Button>
          </Link>
          <Link to="/israel" onClick={() => handleCountrySwitch('israel')}>
            <Button 
              variant={isIsrael ? "default" : "outline"}
              className={`transition-all hover:scale-105 ${isIsrael ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-blue-600 text-blue-600 hover:bg-blue-50"}`}
            >
              ישראל
            </Button>
          </Link>
        </div>

        <Link to="/" className="flex items-center">
          <img src={logo} alt="Reem(D)Know Logo" className="h-14 w-14 rounded-full object-contain" />
        </Link>
      </div>
    </header>
  );
};