import { buildAuthCookie, isAuthorized } from "../../lib/adminAuth";

export const prerender = false;

export async function POST({ request }: { request: Request }) {
  let payload: { token?: string } = {};

  try {
    payload = (await request.json()) as { token?: string };
  } catch {
    return new Response(JSON.stringify({ message: "Invalid JSON payload." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!payload.token) {
    return new Response(JSON.stringify({ message: "Token is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const fakeRequest = new Request(request.url, {
    headers: { authorization: `Bearer ${payload.token}` },
  });

  if (!isAuthorized(fakeRequest)) {
    return new Response(JSON.stringify({ message: "Unauthorized." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": buildAuthCookie(),
    },
  });
}
