

## Fix: Support `channel_post` in Telegram Bot Handler

### Problem
Line 1991 reads only `update.message`. Telegram sends group/channel messages as `update.channel_post` when:
- The chat is a channel
- The group has "Sign Messages" disabled (posts appear as the channel name)

The bot silently ignores these with `return new Response("OK")`.

### Fix (1 line change)

**File:** `supabase/functions/telegram-bot-handler/index.ts`

**Line 1991:** Change:
```typescript
const message = update.message;
```
to:
```typescript
const message = update.message || update.channel_post;
```

### Additional: Verify webhook includes `channel_post`

After deploying, call `getWebhookInfo` to check `allowed_updates`. If `channel_post` is missing, re-register the webhook with:
```
allowed_updates: ["message", "callback_query", "channel_post"]
```

This can be done via a one-time curl to the Telegram API.

### No other code changes needed
The downstream logic (`chat.type`, `chat.id`, `message.text`, URL extraction) works identically for both `message` and `channel_post` payloads — Telegram uses the same structure for both.

