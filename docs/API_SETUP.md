# DeepSeek API Setup

## 1. Get your API key

1. Go to [DeepSeek Platform](https://platform.deepseek.com/)
2. Create an account or sign in
3. Navigate to **API Keys** in your dashboard
4. Create a new API key and copy it

## 2. Configure the project

Create a `.env` file in the project root (same folder as `package.json`):

```
VITE_DEEPSEEK_API_KEY=sk-your-key-here
```

There is a `.env.example` file you can copy as a starting point:

```bash
cp .env.example .env
```

Then paste your key into the `.env` file.

## 3. Run the app

```bash
npm run dev
```

Type a message and hit send. You should see the narrator respond within a few seconds.

## How it works

- The app uses the **OpenAI JS SDK** pointed at DeepSeek's API (`https://api.deepseek.com`)
- The model used is `deepseek-chat` (DeepSeek V3)
- The system prompt for Phase 2 is simply: `You are a narrator for a noir detective story.`
- The full conversation history is sent with each request so the AI has context of prior turns

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "API key not found" error in the log | Make sure your `.env` file exists and starts with `VITE_DEEPSEEK_API_KEY=` |
| Network error / timeout | Check your internet connection. The error will appear in the Activity Log (Debug menu) |
| Empty response | Check the Activity Log for details. DeepSeek may be rate-limiting you |
| Changes to `.env` not taking effect | Restart the dev server (`Ctrl+C` then `npm run dev`) — Vite only reads `.env` on startup |

## Security note

The API key is exposed in the browser (this is expected for now — there is no backend yet). Do not share your built app publicly with the key embedded. A backend proxy will be added in a later phase.
