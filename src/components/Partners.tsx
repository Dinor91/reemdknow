import ddSamuiTours from "@/assets/dd-samui-tours.jpg";

export const Partners = () => {
  return (
    <section className="bg-muted/50 py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-8 text-2xl font-bold text-foreground">המלצות על חברים</h2>
          
          <div className="flex justify-center">
            <a 
              href="https://www.facebook.com/ddsamuitours" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group"
            >
              <div className="inline-block rounded-lg bg-card p-4 shadow-sm border border-border transition-all hover:shadow-md hover:scale-105">
                <img 
                  src={ddSamuiTours} 
                  alt="D.D SAMUI Tours - טיולים ואטרקציות נבחרים בקוסמוי" 
                  className="w-32 h-32 object-contain rounded-lg mb-2 mx-auto"
                />
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  D.D SAMUI Tours
                </p>
                <p className="text-xs text-muted-foreground">טיולים ואטרקציות נבחרים בקוסמוי</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
