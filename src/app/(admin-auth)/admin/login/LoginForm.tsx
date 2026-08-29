"use client";

import { useActionState } from "react";

import { requestMagicLink, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(requestMagicLink, initialState);

  return (
    <form action={action} className="grid gap-5">
      <div>
        <label className="mb-2 block text-sm" htmlFor="email">
          Email
        </label>
        <input
          className="h-11 w-full border bg-jp-surface px-3"
          id="email"
          name="email"
          type="email"
          autoCapitalize="none"
          autoComplete="email"
          spellCheck={false}
          required
        />
      </div>
      {state.message ? (
        <p
          className={
            state.status === "error"
              ? "text-sm text-destructive"
              : "text-sm leading-6 text-jp-olive"
          }
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
      <button
        className="h-11 bg-jp-admin-action px-5 text-sm text-white disabled:opacity-50"
        type="submit"
        disabled={pending}
      >
        {pending ? "Sending link…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
