

# תיקון זיכרון חיפוש — user_sessions

## בעיה
אחרי לחיצה על "🔍 חיפוש מוצר" (`cmd:search`), הבוט שולח "מה אתה מחפש?" אבל כשהמשתמש שולח טקסט חופשי (למשל "אוזניות בלוטוס"), הטקסט לא עובר את `isSearchIntent` (חסרות מילות טריגר) והבוט מגיב "לא הבנתי".

## פתרון — טבלת `user_sessions`

### שלב 1: מיגרציה
```sql
CREATE TABLE user_sessions (
  user_id BIGINT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'idle',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON user_sessions FOR ALL USING (true) WITH CHECK (true);
```

### שלב 2: שינויים ב-`telegram-bot-handler/index.ts`

**2a. ב-callback handler של `cmd:search` (שורה 1560):**
```typescript
else if (data === "cmd:search") {
  const serviceClient = createServiceClient();
  await serviceClient.from("user_sessions").upsert({
    user_id: userId,
    state: "waiting_search",
    last_updated: new Date().toISOString(),
  });
  await sendMessage(chatId, "🔍 מה אתה מחפש?\n\nשלח תיאור קצר של המוצר ואחפש לך.");
}
```

**2b. ב-main message handler, לפני routing הפקודות (שורה ~1612, אחרי בדיקת authorized user):**
```typescript
// Check if waiting for search input
const serviceClient = createServiceClient();
const { data: session } = await serviceClient
  .from("user_sessions")
  .select("state")
  .eq("user_id", userId)
  .maybeSingle();

if (session?.state === "waiting_search" && !text.startsWith("/")) {
  await serviceClient.from("user_sessions").delete().eq("user_id", userId);
  await handleFreeTextSearch(chatId, text);
  return new Response("OK");
}
```

## קובץ
- `supabase/functions/telegram-bot-handler/index.ts`

## תוצאה
לחיצה על "חיפוש מוצר" → שליחת טקסט חופשי כלשהו → חיפוש מופעל, ללא צורך במילות טריגר.

