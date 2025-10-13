import { cookies } from "next/headers";

const ATTEMPTS_KEY = "parent_attempts";
const LOCK_KEY = "parent_lock_until";
const MAX_ATTEMPTS = 2;
const LOCK_SECONDS = 5 * 60; // 5 minutes

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const pin = String(body?.pin ?? "");
  if (!process.env.APP_PARENT_PIN) return new Response("Missing parent PIN env", { status: 500 });

  const c = cookies();
  const now = Math.floor(Date.now() / 1000);
  const lockedUntil = Number(c.get(LOCK_KEY)?.value || 0);
  if (lockedUntil && now < lockedUntil) {
    const remaining = lockedUntil - now;
    return new Response(`Locked. Try again in ${remaining} seconds.`, { status: 429 });
  }

  if (pin === process.env.APP_PARENT_PIN) {
    // reset attempts and lock
    c.set({ name: ATTEMPTS_KEY, value: "0", path: "/", httpOnly: true, sameSite: "lax", maxAge: 0 });
    c.set({ name: LOCK_KEY, value: "0", path: "/", httpOnly: true, sameSite: "lax", maxAge: 0 });
    return new Response(null, { status: 200 });
  }

  const attempts = Number(c.get(ATTEMPTS_KEY)?.value || 0) + 1;
  if (attempts >= MAX_ATTEMPTS) {
    const until = now + LOCK_SECONDS;
    c.set({ name: ATTEMPTS_KEY, value: "0", path: "/", httpOnly: true, sameSite: "lax", maxAge: 0 });
    c.set({ name: LOCK_KEY, value: String(until), path: "/", httpOnly: true, sameSite: "lax", maxAge: LOCK_SECONDS });
    return new Response(`Locked. Try again in ${LOCK_SECONDS} seconds.`, { status: 429 });
  } else {
    c.set({ name: ATTEMPTS_KEY, value: String(attempts), path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 10 });
    return new Response("Unauthorized", { status: 401 });
  }
}
