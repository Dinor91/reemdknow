

# Telegram Bot Integration Plan

## Step 1: Add Secrets

Two secrets need to be stored:
- `TELEGRAM_BOT_TOKEN`: `8259324797:AAEijOxVM9h33ZpbZ_inBZTyCQQcPdGTN48`
- `TELEGRAM_USER_ID`: `5524069980`

## Step 2: Create Edge Function `telegram-bot-handler/index.ts`

Single file (~450 lines). Receives Telegram webhook POSTs and routes commands.

**Security**: Compare `message.from.id` against `TELEGRAM_USER_ID`. Return 200 silently for unauthorized users.

**Commands**:

| Command | What it does |
|---------|-------------|
| `/start` | Reemdknow welcome message + inline keyboard with all commands |
| `/revenue` | Fetches Lazada + AliExpress APIs (same logic as `conversions_all`), formats for mobile |
| `/weekly` | Calls `handleWeeklyAnalytics()` logic, shows report + "הודעה לקבוצה" button |
| `/deal` | Interactive flow: platform → category → top products → generate message |
| `/stats` | Queries `button_clicks` for performance stats |
| `/events` | Shows active marketing calendar events |

**Callback queries** (`callback_query.data`): Handles multi-step `/deal` flow and "generate weekly message" button via prefixed data strings like `deal_platform:israel`, `deal_cat:toys`, `weekly_msg`.

**Shared logic**: The function copies the same patterns from `dino-chat` (API calls to lazada-api/aliexpress-api, DB queries, event calendar, upsert functions) since edge functions can't share imports across directories.

**Telegram API helper**: A `sendMessage(chatId, text, options?)` function that calls `https://api.telegram.org/bot<TOKEN>/sendMessage` with optional `reply_markup` for inline keyboards.

**Webhook self-registration**: On first `/start`, calls `setWebhook` to register the function URL automatically.

## Step 3: Update `supabase/config.toml`

Add:
```toml
[functions.telegram-bot-handler]
verify_jwt = false
```

## File Changes Summary

| File | Action |
|------|--------|
| `supabase/functions/telegram-bot-handler/index.ts` | New (~450 lines) |
| `supabase/config.toml` | Add 2 lines |

## Implementation Order

1. Add both secrets via `add_secret` tool
2. Create edge function with all commands
3. Update config.toml
4. Deploy and test `/start`

