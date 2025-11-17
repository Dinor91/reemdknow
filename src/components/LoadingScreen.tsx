import loadingAirplane from "@/assets/loading-airplane.png";

export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <img 
          src={loadingAirplane} 
          alt="Loading..." 
          className="h-32 w-32 object-contain animate-pulse"
        />
        <div className="flex gap-2">
          <div className="h-3 w-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="h-3 w-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="h-3 w-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};
