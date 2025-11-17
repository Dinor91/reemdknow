import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Landing from "./pages/Landing";
import Israel from "./pages/Israel";
import Thailand from "./pages/Thailand";
import NotFound from "./pages/NotFound";
import { CountryProvider } from "./contexts/CountryContext";
import { LoadingScreen } from "./components/LoadingScreen";
import { useState, useEffect } from "react";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/israel" element={<Israel />} />
      <Route path="/thailand" element={<Thailand />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CountryProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </CountryProvider>
  </QueryClientProvider>
);

export default App;
