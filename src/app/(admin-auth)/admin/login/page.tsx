import { LoginForm } from "./LoginForm";

export default function AdminLoginPage() {
  return <main className="grid min-h-screen place-items-center bg-jp-admin-canvas p-5"><section className="w-full max-w-md border bg-jp-admin-surface p-7"><p className="text-sm uppercase tracking-[0.2em] text-jp-text-secondary">JPScents Admin</p><h1 className="mt-2 font-display text-5xl">Sign in</h1><p className="mt-3 text-sm leading-6 text-jp-text-secondary">Only identities provisioned with the Admin role can enter the workspace.</p><div className="mt-8"><LoginForm /></div></section></main>;
}
