import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, hashAdminPassword } from "@/lib/admin-auth";
import { logInfo, logWarn } from "@/lib/structured-log";
import { AdminMagicLinkForm } from "@/components/admin/magic-link-form";
import { Eyebrow } from "@/components/eyebrow";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

async function login(formData: FormData) {
  "use server";
  const password = String(formData.get("password") || "");
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || password !== expected) {
    // Never log the password itself, correct or not — the fact of a
    // failed attempt is what's worth knowing, not the guess.
    logWarn("admin_auth.password_login_failed");
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
  logInfo("admin_auth.password_login_success");
  redirect("/admin");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-6">
      <Card className="w-full max-w-sm p-2">
        <CardContent>
          <Eyebrow>HamishAI Internal</Eyebrow>
          <h1 className="mt-3 font-heading text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Password-gated internal operations console.</p>

          {error && (
            <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Incorrect password, or that email isn&apos;t authorized for a login link.
            </p>
          )}

          <form action={login} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                autoFocus
                required
                className="h-10"
              />
            </div>
            <Button type="submit" className="h-10 w-full">
              Sign in
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <AdminMagicLinkForm />
        </CardContent>
      </Card>
    </div>
  );
}
