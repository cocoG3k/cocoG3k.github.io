import crypto from "node:crypto";

const ADMIN_COOKIE_NAME = "admin_auth";
const AUTH_VALUE = "authorized";

const parseCookies = (cookieHeader: string | null) => {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((cookie) => {
      const [name, ...rest] = cookie.trim().split("=");
      return [name, rest.join("=")];
    }),
  );
};

const getAdminToken = () => {
  const token = import.meta.env.ADMIN_TOKEN;
  if (!token) {
    throw new Error("ADMIN_TOKEN is not configured");
  }
  return token as string;
};

const signAuthValue = (secret: string) =>
  crypto.createHmac("sha256", secret).update(AUTH_VALUE).digest("base64url");

export const buildAuthCookie = () => {
  const token = getAdminToken();
  const signature = signAuthValue(token);
  const flags = ["Path=/", "HttpOnly", "SameSite=Strict"];
  if (import.meta.env.PROD) {
    flags.push("Secure");
  }
  return `${ADMIN_COOKIE_NAME}=${signature}; ${flags.join("; ")}`;
};

export const isAuthorized = (
  request: Request,
  options: { allowBearer?: boolean } = {},
) => {
  const token = getAdminToken();
  const allowBearer = options.allowBearer ?? true;

  if (allowBearer) {
    const authHeader = request.headers.get("authorization") ?? "";
    const providedToken = authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "").trim()
      : "";
    if (providedToken && providedToken === token) {
      return true;
    }
  }

  const cookies = parseCookies(request.headers.get("cookie"));
  const signature = signAuthValue(token);
  return cookies[ADMIN_COOKIE_NAME] === signature;
};

export const getCookieName = () => ADMIN_COOKIE_NAME;
