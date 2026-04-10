# Agency OS Frontend - Deployment Workflow

This project is configured to deploy automatically via **Vercel** whenever code is pushed to the main branch on **GitHub**.

## How to Ship Changes
1. Complete your local coding and verify it using `npm run dev`.
2. Commit your changes.
3. Push to GitHub: `git push origin main`.
4. Vercel will automatically detect the push and begin building the exact version you pushed.

## ⚠️ CRITICAL: Environment Variables
Local development uses `.env.local` which is ignored by Git for security reasons.

If you add a new API Key (e.g., Supabase, Zapmail, OpenAI) during local development, **you must also add it to Vercel**.

1. Log into [Vercel Dashboard](https://vercel.com).
2. Go to your frontend project (`agy-lxv-frontend` or similar).
3. Navigate to **Settings > Environment Variables**.
4. Add the new Variable (Key + Value) to mirror your `.env.local`.
5. Save changes. You may need to trigger a redeploy in Vercel to apply the keys.
