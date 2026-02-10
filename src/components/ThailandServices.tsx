import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Search, Send } from "lucide-react";
import { trackButtonClick } from "@/lib/trackClick";
import { trackFBLead } from "./FacebookPixel";

const services = [
  {
    id: "sim-setup",
    icon: Smartphone,
    title: "מסלול עצמאי",
    subtitle: "סים + הרשמה ל-Lazada",
    description: "אני רוכש עבורכם סים תאילנדי ומבצע איתכם הרשמה ראשונה לאפליקציית Lazada. אחרי זה – אתם עצמאיים!",
    highlight: "מתאים למי שרוצה לנהל הכל לבד",
  },
  {
    id: "full-service",
    icon: Search,
    title: "מסלול מלא",
    subtitle: "חיפוש + ייעוץ אישי",
    description: "אני מחפש לכם עד 6 מוצרים שאתם רוצים, וביחד איתכם מחליטים מה הכי טוב ומשתלם עבורכם.",
    highlight: "מתאים למי שרוצה ליווי מלא",
    featured: true,
  },
  {
    id: "order-for-you",
    icon: Send,
    title: "שגר ושכח",
    subtitle: "אתם בוחרים, אני מזמין",
    description: "אתם מוצאים את הקישורים המדויקים למוצרים, שולחים לי ואני מבצע את ההזמנה עבורכם.",
    highlight: "מתאים למי שכבר יודע מה הוא רוצה",
  },
];

const WHATSAPP_LINK = "https://wa.me/message/XXXXXX"; // placeholder

export const ThailandServices = () => {
  const handleServiceClick = (serviceId: string) => {
    trackButtonClick("whatsapp", `thailand_services_${serviceId}`, "thailand");
    trackFBLead(`Service - ${serviceId}`);
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`היי ראם, אני מתעניין במסלול: ${services.find(s => s.id === serviceId)?.title}`)}`,
      "_blank"
    );
  };

  return (
    <section dir="rtl" className="py-12 px-4 md:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-2xl md:text-3xl font-extrabold tracking-wide mb-2" style={{ color: '#f28433', WebkitTextStroke: '0.5px black' }}>
            COMING SOON
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            שירותי Lazada לישראלים
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            אין לכם מספר תאילנדי? לא מכירים את Lazada? אני כאן בשבילכם.
            <br />
            בחרו את המסלול שמתאים לכם.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <Card
                key={service.id}
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                  service.featured
                    ? "border-2 border-primary ring-1 ring-primary/20"
                    : "border border-border"
                }`}
              >
                {service.featured && (
                  <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center text-xs font-bold py-1">
                    הכי פופולרי
                  </div>
                )}
                <CardHeader className={`text-center ${service.featured ? "pt-10" : "pt-6"}`}>
                  <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
                    service.featured
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <CardTitle className="text-xl font-bold">{service.title}</CardTitle>
                  <p className="text-sm font-medium text-primary">{service.subtitle}</p>
                </CardHeader>
                <CardContent className="text-center space-y-4 pb-6">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>
                  <p className="text-xs font-medium text-foreground/70 italic">
                    {service.highlight}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
