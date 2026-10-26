import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Newsroom
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Editorial Workflow
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to draft, review and publish.
        </p>

        <LoginForm />

        <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-medium text-slate-700">Demo accounts</p>
          <p className="mt-1">editor@newsroom.test / editor123</p>
          <p>writer@newsroom.test / writer123</p>
        </div>
      </div>
    </main>
  );
}
