Chores App (Next.js + Supabase)

What’s included

- Next.js app with three screens: Home, Progress, Parent.
- Supabase schema and migrations in `supabase/migrations/0001_init.sql`.
- Simple app-wide password gate and parent PIN gate via cookies.
- PWA manifest and basic icon (SVG). Replace PNGs for iOS home screen.

Getting started

1) Copy `.env.example` to `.env.local` and fill Supabase URL and anon key. Adjust passwords.
2) Run the SQL in `supabase/migrations/0001_init.sql` in your Supabase project (SQL editor).
3) `npm install` then `npm run dev`.

Dev mode (no database)

- Set `NEXT_PUBLIC_DATA_MODE=local` in `.env.local` to use in-browser localStorage for chores, checkoffs, and settings. This is handy for local testing without Supabase. Switch back to `supabase` for shared data.

Notes

- iOS home screen requires PNG icons; add `public/icon-192.png` and `public/icon-512.png`. An SVG placeholder is provided as `public/icon.svg`.
- Daily resets at local midnight; weeks end Sunday night. Weekly percentage weights weekly chores x2.
- Errors writing to Supabase are surfaced inline on the UI.
