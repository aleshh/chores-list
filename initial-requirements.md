Make me a Chore tracking app. Requirements:

- Next.js deployed to Vercel, Supabase for backend.
- No accounts, this is going to be a private app.
- Handles two kids, each with a different set or chores: Astrid and Emilia (we can hard-code the names to keep the code simple)
- Each child will have a list of daily chores and a list of weekly chores

There are three main screens:

- 1. A progress screen that shows (again, side by side) how good each child did for each preceeding week: a trophy emoji for 95% or more done, an apple emoji for 85 to 95%, and no emoji for below 85%. Let's show the last 8 weeks that we have data for.
- 2. A parent edit screen where chores for each child can be added, removed, or edited. (We can also tweak the exact percentages required for the two emoji)
- 3. Home screen, with each child's list side by side. Daily chores above, weekly chores below. At the top there are two circular progress bar for each child: one showing percentage done of the requirements for the day, the other showing percentage for the entire week. In other words, if everything is completed then the left circle will be at 100% at the end of every day, the right circle will be complete at the end of the week. Weekly chores count for twice as much as the daily ones for that second graph.
- Some mor edetails about the home screen:
- When the right circle completes we get a confetti drop across the screen and the progress indicator becomes a trophy emoji.
- When each task is crossed off, we'll get a little sparkle animation, and the chore will get crossed off and fade a little. We'll show a checkmark for a second and then fade it to one of our "reward" emoji, picked at random (list below).

Some details:

- Start by creating an npm Next.js project.
- The weekly chores will count double the daily chores for calculating percentage done for the week.
- This will be single-family for now, but we want to access it from multiple devices, so store all data in the Supabase DB (creating a migration).
- A global password for the app (which should only need to be entered once on each device) and a 4-digit pin to access the parent screen (needed each time) will be stored in environmental variables.
- Make me an example .env file with some values prefilled for those, plus places to add the Supabase credentials.
- We're going to add it to an ipad home screen, so we'll need an app icon and full-screen settings. However, we can expect network to be available when using this app, so no local cache; just show an error message if there's an error writing to the database.
- A new day starts (daily tasks reset) at midnight, the week ends on Sunday night.
- The overall design of the app should be bright and happy, with nice sized fonts. Let's make the app background orange for now, with white text. On the main task screen, make the font nice and big, but small enough that all the tasks fit on the screen without scrolling. Both kids' lists should be the same font size, but we might want to make it dynamic so it fits. This should work on an ipad or laptop screen.

reward emoji:
😄 😁 😆 😂 🤩 🥳 😺 😻 🤗 😋 😜 🤪 😎 😇 😍 🥰 🐵 🙉 🐶 🐱 🐸 🐯 🐼 🦊 🦄 🐥 🐣 🐤 🐝 🦋 🐞 🐢 🐙 🐬 🦕 🌈 🌞 🌟 ✨ 💫 💖 💕 💞 💛 💚 💙 💜 🧡 ❤️ 🩵 🔆 🎈 🎉 🎊 🎁 🪅 🪩 🎠 🎡 🎢 🎨 🎵 🎶 🎸 🥁 🧩 🪀 🛝 🏖️ 🍭 🍦 🍪 🍰 🧁 🍓 🍉 🍌 🍊 🌽 🥕 🧃 🧸 🪄 🚀 🛼 🧗 🏄 🤸 🤹 🪁 🧙 🦸 🧚 🐲 🐉 🔮 💎 🕹️ 📸 🖼️ 🌸 🌼 🍀 🪷 🪻 🌻 🌺 🪆
