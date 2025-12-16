import { useEffect } from "react";

declare global {
  interface Window {
    fbq?: (action: string, event: string, params?: Record<string, any>) => void;
  }
}

export const trackFBEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, params);
  }
};

export const trackFBPageView = () => {
  trackFBEvent('PageView');
};

export const trackFBViewContent = (contentName: string) => {
  trackFBEvent('ViewContent', {
    content_name: contentName,
  });
};

export const trackFBLead = (contentName: string) => {
  trackFBEvent('Lead', {
    content_name: contentName,
  });
};

export const trackFBInitiateCheckout = (productName: string, productLink: string) => {
  trackFBEvent('InitiateCheckout', {
    content_name: productName,
    content_ids: [productLink],
  });
};


export const FacebookPixel = () => {
  useEffect(() => {
    trackFBPageView();
  }, []);

  return null;
};
