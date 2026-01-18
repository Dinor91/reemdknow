import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Landing from "./pages/Landing";
import Israel from "./pages/Israel";
import Thailand from "./pages/Thailand";
import ChannelSelect from "./pages/ChannelSelect";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Requests from "./pages/Requests";
import NotFound from "./pages/NotFound";
import { CountryProvider } from "./contexts/CountryContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoadingScreen } from "./components/LoadingScreen";
import { useState, useEffect } from "react";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">טוען...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">אין לך הרשאה</h1>
          <p className="text-muted-foreground">אין לך הרשאת מנהל לצפות בדף זה.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const AppContent = () => {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/israel" element={<Israel />} />
        <Route path="/join" element={<ChannelSelect />} />
        <Route path="/thailand" element={<Thailand />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CountryProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </CountryProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
