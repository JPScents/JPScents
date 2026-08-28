"use client";

import { useActionState } from "react";

import { signIn, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initialState);
  return <form action={action} className="grid gap-5"><div><label className="mb-2 block text-sm" htmlFor="email">Email</label><input className="h-11 w-full border bg-jp-surface px-3" id="email" name="email" type="email" autoComplete="email" required /></div><div><label className="mb-2 block text-sm" htmlFor="password">Password</label><input className="h-11 w-full border bg-jp-surface px-3" id="password" name="password" type="password" autoComplete="current-password" required /></div>{state.error ? <p className="text-sm text-destructive" role="alert">{state.error}</p> : null}<button className="h-11 bg-jp-admin-action px-5 text-sm text-white disabled:opacity-50" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button></form>;
}
