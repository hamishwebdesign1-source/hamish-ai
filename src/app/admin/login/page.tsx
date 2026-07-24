import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, hashAdminPassword } from "@/lib/admin-auth";

async function login(formData: FormData) {
  "use server";
  const password = String(formData.get("password") || "");
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || password !== expected) {
    redirect("/admin/login?error=1");
  }

  const token = await hashAdminPassword(password);
  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/admin/clients");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form action={login} className="w-full max-w-sm">
        <p className="font-mono text-xs font-medium tracking-[0.15em] text-accent uppercase">
          HamishAI Internal
        </p>
        <h1 className="mt-2 font-heading text-2xl font-semibold">Sign in</h1>
        {error && (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Incorrect password.
          </p>
        )}
        <input
          type="password"
          name="password"
          placeholder="Password"
          autoFocus
          required
          className="mt-4 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <button
          type="submit"
          className="mt-3 h-10 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
