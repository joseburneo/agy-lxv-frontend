# Agency OS Frontend - Deployment Workflow

This project is configured to deploy automatically via **Render** whenever code is pushed to the main branch on **GitHub**.

## How to Ship Changes
1. Complete your local coding and verify it using `npm run dev`.
2. Commit your changes.
3. Push to GitHub: `git push origin main`.
4. Render will automatically detect the push and begin building the exact version you pushed.

## ⚠️ CRITICAL: Environment Variables
Local development uses `.env.local` which is ignored by Git for security reasons.

If you add a new API Key (e.g., Supabase, Zapmail, OpenAI) during local development, **you must also add it to Render**.
The production server pulls from shared credential groups.

1. Log into [Render Dashboard](https://dashboard.render.com).
2. Go to **Environment Groups**.
3. Open **Agency Master Credentials**.
4. Add the new Variable (Key + Value) to mirror your `.env.local`.
5. Save changes. Render will automatically reboot the Frontend application to apply the keys.
