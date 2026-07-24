// Single-operator auth for the internal /admin tool — one shared password,
// not a full user-accounts system. Uses Web Crypto (crypto.subtle) rather
// than Node's crypto module so the same check works in both the Edge
// middleware and Node route handlers/Server Actions without a runtime split.
export const ADMIN_COOKIE_NAME = "hamishai_admin";

export async function hashAdminPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getExpectedAdminCookieValue(): Promise<string | null> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return hashAdminPassword(password);
}
