import { requireUser } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { countOverdue } from "@/lib/queries";
import { Nav } from "@/components/Nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const overdue = await countOverdue(user);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col gap-6 bg-slate-900 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Newsroom
          </p>
          <h1 className="mt-1 text-lg font-semibold text-white">
            Editorial Workflow
          </h1>
        </div>

        <Nav overdue={overdue} userId={user.id} role={user.role} />

        <div className="mt-auto rounded-lg bg-slate-800 p-3">
          <p className="text-sm font-medium text-white">{user.name}</p>
          <p className="text-xs text-slate-400">{user.email}</p>
          <p className="mt-1 inline-flex rounded-full bg-slate-700 px-2 py-0.5 text-xs font-medium capitalize text-slate-200">
            {user.role}
          </p>
          <form action={logout} className="mt-3">
            <button
              type="submit"
              className="w-full rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-600"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
