// Google Analytics event tracking utility

declare global {
  interface Window {
    gtag?: (
      command: string,
      action: string,
      params?: Record<string, any>
    ) => void;
  }
}

export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
};

// Specific event trackers
export const trackWhatsAppClick = () => {
  trackEvent('click_whatsapp', {
    event_category: 'engagement',
    event_label: 'WhatsApp Community Join'
  });
};

export const trackTelegramClick = () => {
  trackEvent('click_telegram', {
    event_category: 'engagement',
    event_label: 'Telegram Community Join'
  });
};

export const trackProductClick = (productName: string, productUrl: string) => {
  trackEvent('click_product', {
    event_category: 'conversion',
    event_label: productName,
    product_url: productUrl
  });
};

export const trackCountrySwitch = (country: string, fromPage: string) => {
  trackEvent('country_switch', {
    event_category: 'navigation',
    event_label: country,
    from_page: fromPage
  });
};
