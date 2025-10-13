Make me a Chore tracking app. Requirements (finalized):

- Next.js app deployed to Vercel; Supabase for backend storage.
- No accounts; this is a private, single-family app gated by a global app password (no RLS needed).
- Two kids hard-coded: Astrid and Emilia. Each has Daily and Weekly chore lists.

Screens

- Home (Chores list):
  - Shows Astrid and Emilia side-by-side. Daily chores above; Weekly chores below.
  - At top, show two circular progress indicators per child: left is today’s completion percent; right is weekly completion percent.
  - Progress rings should animate smoothly when values change (e.g., ease-out over ~700ms), respecting reduced-motion preferences.
  - Dynamic font sizing so all tasks fit on the screen without scrolling; both kids use the same font size.
  - Each task has a Lucide checkbox indicator (left of text). When completed:
    - Animate sparkles moving in a left→right sweep across the entire chore row; use the `react-sparkle` library in successive moving bands during the completion state. The final band fades more slowly; the text strike happens just before that final pass.
    - Show a Lucide checkmark briefly, then fade into a random “reward” emoji where the checkbox was. Emoji selection is random each day.
    - Reward emojis are large and can overflow their container slightly, and are not struck through when the text is completed.
  - When a child’s weekly total reaches 100% (all daily chores done every day plus all weekly chores done once), trigger a one-time confetti drop for that week and show a trophy in place of the weekly ring.
  - Top-right actions: a calendar icon toggles the weekly status screen; a gear icon toggles the parent screen.

- Progress (Weekly status):
  - Astrid on the left, Emilia on the right (matching Home layout).
  - For each kid, show a horizontal, wrapping row of tiles for the last 8 weeks.
  - Each tile shows either a trophy (≥95%), an apple (≥85%..<95%), or a numeric percent if below 85%. Underneath, show the date range of the week (Mon–Sun) like “M/D–M/D”.
  - Thresholds are global and configurable.

- Parent (Edit):
  - Requires entering a 4-digit PIN each time the screen is opened.
  - The PIN field autofocuses when the screen opens, shows numeric keypad on mobile, and auto-submits as soon as the 4th digit is entered.
  - Add, edit, remove chores per child (Daily/Weekly).
  - Drag-and-drop to reorder chores within each child’s Daily and Weekly sections; order is persisted.
  - Adjust global trophy/apple thresholds.

Scoring & time windows

- Daily resets at local midnight.
- Week is Monday–Sunday (ends Sunday night).
- Weekly percentage = (Daily completions per day + 2 × Weekly completions) / (7 × daily_count + 2 × weekly_count).
  - Daily completions count once per day per chore (max 7 per week).
  - Weekly chores count once per week and are weighted double.

Auth & configuration

- App password (remembered per device, ~1-year cookie) and Parent PIN (prompted each time) are provided via environment variables; include an example `.env`.
- All data persists in Supabase (with SQL migration). For local development, a `localStorage` data mode is available via env flag.
- Parent PIN rate limiting: after 2 incorrect attempts, lock out further attempts for 5 minutes. Lockout tracked via HTTP-only cookies; error message should show remaining time.

Design & PWA

- Bright, happy design with orange background and white text.
- Dynamic type to fit screens (iPad/laptop) without scrolling on Home.
- App icon: a unicorn emoji on an orange background.
- Iconography: Use Lucide (react) icons for checkboxes, calendar, and gear. Keep emoji for all other visuals.
- Completed items: Only the text is struck through, with a thicker, better-aligned strike; the left indicator (emoji or icon) is not struck through.
- Top bar:
  - Home: app title (left) + calendar and gear icons (right) for navigating to Progress and Parent.
  - Progress and Parent: app title (left) + a single Close (X) button (right) that returns to Home.
- Card styling: rounded chore items and columns use a slightly darker overlay on the orange background (not lighter) to improve contrast.

Typography

- Use Google Fonts via Next.js:
  - Title (“Chores list”): Bungee Shade
  - Kid names: Emilys Candy
  - Body/UI: Arvo

Developer mode data

- When `NEXT_PUBLIC_DATA_MODE=local` and the local store is empty, seed example chores for both kids and generate sample completions for the last 8 weeks so the Progress screen and Home rings illustrate trophy/apple/percentage cases.
- PWA/standalone mode for iPad home screen; show network write errors instead of caching offline.

Reward emoji pool

😄 😁 😆 😂 🤩 🥳 😺 😻 🤗 😋 😜 🤪 😎 😇 😍 🥰 🐵 🙉 🐶 🐱 🐸 🐯 🐼 🦊 🦄 🐥 🐣 🐤 🐝 🦋 🐞 🐢 🐙 🐬 🦕 🌈 🌞 🌟 ✨ 💫 💖 💕 💞 💛 💚 💙 💜 🧡 ❤️ 🩵 🔆 🎈 🎉 🎊 🎁 🪅 🪩 🎠 🎡 🎢 🎨 🎵 🎶 🎸 🥁 🧩 🪀 🛝 🏖️ 🍭 🍦 🍪 🍰 🧁 🍓 🍉 🍌 🍊 🌽 🥕 🧃 🧸 🪄 🚀 🛼 🧗 🏄 🤸 🤹 🪁 🧙 🦸 🧚 🐲 🐉 🔮 💎 🕹️ 📸 🖼️ 🌸 🌼 🍀 🪷 🪻 🌻 🌺 🪆
