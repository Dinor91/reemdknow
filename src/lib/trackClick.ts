import { supabase } from "@/integrations/supabase/client";

export const trackButtonClick = async (
  buttonType: "whatsapp" | "telegram",
  source: string,
  country?: string
) => {
  try {
    const { error } = await supabase.from("button_clicks").insert({
      button_type: buttonType,
      source: source,
      country: country || null,
    });

    if (error) {
      console.error("Error tracking click:", error);
    }
  } catch (err) {
    console.error("Error tracking click:", err);
  }
};
