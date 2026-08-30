import { BrandLogo } from "@/components/shared/BrandLogo";

import { LoginForm } from "./LoginForm";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-jp-admin-canvas p-5">
      <section className="w-full max-w-md border bg-jp-admin-surface p-7">
        <BrandLogo className="mx-auto w-28" />
        <p className="mt-5 text-center text-sm uppercase tracking-[0.2em] text-jp-text-secondary">
          Admin
        </p>
        <h1 className="mt-2 font-display text-5xl">Sign in</h1>
        <p className="mt-3 text-sm leading-6 text-jp-text-secondary">
          Enter the trusted Admin email and we’ll send a one-time sign-in link.
        </p>
        {error ? (
          <p className="mt-5 text-sm text-destructive" role="alert">
            That sign-in link is invalid, expired, or not authorized.
          </p>
        ) : null}
        <div className="mt-8">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
