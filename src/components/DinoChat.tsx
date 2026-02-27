import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Send, Copy, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  products?: any[];
  type?: "text" | "products" | "menu";
}

const STORAGE_KEY = "dino_chat_history";
const MAX_STORED = 10;

const QUICK_ACTIONS = [
  { emoji: "🔍", label: "חפש מוצר ללקוח", action: "search" },
  { emoji: "📦", label: "צור דיל יומי", action: "deal" },
  { emoji: "📥", label: "ייבא הודעה מהקבוצה", action: "import" },
  { emoji: "📊", label: "סטטיסטיקות", action: "stats" },
  { emoji: "✍️", label: "כתוב סיכום שבועי", action: "summary" },
  { emoji: "⚙️", label: "ערוך נוסח הודעה", action: "template" },
];

const DinoChat = () => {
  const { isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Don't render if not admin
  if (!isAdmin) return null;

  /* eslint-disable react-hooks/rules-of-hooks -- isAdmin is stable after auth loads */

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const saveToStorage = (msgs: ChatMessage[]) => {
    try {
      const toStore = msgs.filter(m => m.type !== "menu").slice(-MAX_STORED);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch { /* ignore */ }
  };

  const loadFromStorage = (): ChatMessage[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return [];
  };

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("dino-chat", {
        body: { action: "get_alerts" },
      });
      if (!error && data?.alerts) {
        setAlerts(data.alerts);
      }
    } catch { /* ignore */ }
  };

  const handleOpen = () => {
    setIsOpen(true);
    const stored = loadFromStorage();
    if (stored.length > 0) {
      setShowResumePrompt(true);
      setMessages([]);
    } else {
      showWelcomeMenu();
    }
    fetchAlerts();
  };

  const showWelcomeMenu = () => {
    setMessages([{
      role: "assistant",
      content: "היי! מה נעשה? 🦕",
      type: "menu",
    }]);
  };

  const handleResumeChoice = (resume: boolean) => {
    setShowResumePrompt(false);
    if (resume) {
      const stored = loadFromStorage();
      setMessages(stored);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      showWelcomeMenu();
    }
  };

  const streamChat = async (userMessages: { role: string; content: string }[]) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dino-chat`;
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        action: "chat",
        messages: userMessages,
      }),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `Error ${resp.status}`);
    }

    return resp;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages.filter(m => m.type !== "menu"), userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    scrollToBottom();

    try {
      // Check for special intents locally before sending to AI
      const lower = text.trim().toLowerCase();

      // Statistics shortcut
      if (lower.includes("סטטיסטיק") || lower.includes("קליקים") || lower.includes("נתונים")) {
        const { data, error } = await supabase.functions.invoke("dino-chat", {
          body: { action: "statistics" },
        });
        if (!error && data?.message) {
          const assistantMsg: ChatMessage = { role: "assistant", content: data.message };
          const updated = [...newMessages, assistantMsg];
          setMessages(updated);
          saveToStorage(updated);
          setIsLoading(false);
          scrollToBottom();
          return;
        }
      }

      // Stream AI response
      const chatMessages = newMessages
        .filter(m => m.type !== "menu")
        .map(m => ({ role: m.role, content: m.content }));

      const resp = await streamChat(chatMessages);

      if (!resp.body) throw new Error("No stream body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && last.type !== "menu") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
              scrollToBottom();
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final save
      setMessages(prev => {
        saveToStorage(prev);
        return prev;
      });
    } catch (e: any) {
      console.error("Dino chat error:", e);
      const errMsg = e.message === "RATE_LIMITED"
        ? "יותר מדי בקשות, נסה שוב בעוד רגע ⏳"
        : e.message === "PAYMENT_REQUIRED"
        ? "נגמר הקרדיט, צריך להטעין 💳"
        : `שגיאה: ${e.message}`;
      const updated = [...newMessages, { role: "assistant" as const, content: errMsg }];
      setMessages(updated);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleQuickAction = (action: string) => {
    const actionMessages: Record<string, string> = {
      search: "אני רוצה לחפש מוצר ללקוח",
      deal: "אני רוצה ליצור דיל יומי",
      import: "אני רוצה לייבא הודעה מהקבוצה",
      stats: "הראה לי סטטיסטיקות",
      summary: "כתוב סיכום שבועי",
      template: "אני רוצה לערוך נוסח הודעה",
    };
    sendMessage(actionMessages[action] || action);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast({ title: "שגיאה בהעתקה", variant: "destructive" });
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-teal-500 hover:bg-teal-600 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-2xl animate-in fade-in slide-in-from-bottom-4"
          aria-label="פתח את דינו"
        >
          🦕
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-6rem)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-4" dir="rtl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-teal-500 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xl">🦕</span>
              <span className="font-bold text-white text-lg">דינו</span>
              <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="px-3 py-2 space-y-1 border-b bg-amber-50 dark:bg-amber-950/20">
              {alerts.map((alert, i) => (
                <p key={i} className="text-xs text-amber-700 dark:text-amber-300">{alert}</p>
              ))}
            </div>
          )}

          {/* Resume Prompt */}
          {showResumePrompt && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center space-y-4">
                <p className="text-lg">🦕 המשך משיחה קודמת?</p>
                <div className="flex gap-3 justify-center">
                  <Button size="sm" onClick={() => handleResumeChoice(true)}>
                    כן, המשך
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleResumeChoice(false)}>
                    שיחה חדשה
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {!showResumePrompt && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3" ref={scrollRef}>
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === "assistant" && msg.type === "menu" ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">{msg.content}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {QUICK_ACTIONS.map((qa) => (
                          <button
                            key={qa.action}
                            onClick={() => handleQuickAction(qa.action)}
                            className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card hover:bg-accent text-right text-sm transition-colors"
                          >
                            <span>{qa.emoji}</span>
                            <span className="text-xs leading-tight">{qa.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : msg.role === "user" ? (
                    <div className="flex justify-start">
                      <div className="bg-teal-500 text-white rounded-2xl rounded-br-sm px-3 py-2 max-w-[85%] text-sm">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap relative group">
                        {msg.content}
                        {msg.content.length > 50 && (
                          <button
                            onClick={() => copyText(msg.content)}
                            className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-background/80"
                          >
                            {copied === msg.content ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-end">
                  <div className="bg-muted rounded-2xl px-4 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input */}
          {!showResumePrompt && (
            <div className="p-3 border-t">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="flex gap-2"
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="כתוב לדינו..."
                  className="flex-1 text-sm rounded-xl"
                  disabled={isLoading}
                  autoFocus
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !input.trim()}
                  className="rounded-xl bg-teal-500 hover:bg-teal-600 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default DinoChat;
