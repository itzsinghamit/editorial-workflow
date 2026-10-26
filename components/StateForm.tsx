"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/permissions";

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
};

/**
 * Thin wrapper around `useActionState` so every form in the app reports server
 * errors in the same place instead of silently failing.
 */
export function StateForm({ action, children, className }: Props) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className={className}>
      {children}
      {state && (
        <p
          role="status"
          className={`mt-3 rounded-md px-3 py-2 text-sm ${
            state.ok
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}
      {state?.items && state.items.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {state.items.map((item) => (
            <li key={item.id} className="flex gap-2">
              <span className={item.ok ? "text-emerald-600" : "text-red-600"}>
                {item.ok ? "✓" : "✕"}
              </span>
              <span className="font-medium">{item.label}</span>
              <span className="text-slate-500">— {item.message}</span>
            </li>
          ))}
        </ul>
      )}
      {pending && <p className="mt-2 text-xs text-slate-500">Working…</p>}
    </form>
  );
}

export function SubmitButton({
  children,
  className = "",
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}
