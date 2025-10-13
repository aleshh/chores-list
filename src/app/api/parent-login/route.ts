import { cookies } from "next/headers";

export async function GET() {
  const ok = cookies().get("parent_auth")?.value === "1";
  return new Response(null, { status: ok ? 200 : 401 });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const pin = String(body?.pin ?? "");
  if (!process.env.APP_PARENT_PIN) return new Response("Missing parent PIN env", { status: 500 });
  if (pin !== process.env.APP_PARENT_PIN) return new Response("Unauthorized", { status: 401 });
  // short-lived; required each time
  cookies().set({ name: "parent_auth", value: "1", httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 10 });
  return new Response(null, { status: 200 });
}

