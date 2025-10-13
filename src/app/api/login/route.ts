import { cookies } from "next/headers";

export async function GET() {
  const c = cookies();
  const ok = c.get("app_auth")?.value === "1";
  return new Response(null, { status: ok ? 200 : 401 });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const pw = String(body?.password ?? "");
  if (!process.env.APP_GLOBAL_PASSWORD) return new Response("Missing password env", { status: 500 });
  if (pw !== process.env.APP_GLOBAL_PASSWORD) return new Response("Unauthorized", { status: 401 });
  cookies().set({ name: "app_auth", value: "1", httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return new Response(null, { status: 200 });
}

