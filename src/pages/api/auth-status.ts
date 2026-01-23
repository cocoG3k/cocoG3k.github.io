import { isAuthorized } from "../../lib/adminAuth";

export const prerender = false;

export async function GET({ request }: { request: Request }) {
  const authorized = isAuthorized(request, { allowBearer: false });
  return new Response(JSON.stringify({ authorized }), {
    status: authorized ? 200 : 401,
    headers: { "Content-Type": "application/json" },
  });
}
