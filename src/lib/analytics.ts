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
export const trackWhatsAppClick = (source: string) => {
  trackEvent('click_whatsapp', {
    event_category: 'engagement',
    event_label: 'WhatsApp Community Join',
    source
  });
};

export const trackTelegramClick = (source: string) => {
  trackEvent('click_telegram', {
    event_category: 'engagement',
    event_label: 'Telegram Community Join',
    source
  });
};


export const trackCountrySwitch = (country: string, fromPage: string) => {
  trackEvent('country_switch', {
    event_category: 'navigation',
    event_label: country,
    from_page: fromPage
  });
};
