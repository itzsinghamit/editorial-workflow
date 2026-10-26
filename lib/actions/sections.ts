"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { newId, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sectionWriters, sections, users } from "@/lib/db/schema";
import { isEditor, type ActionState } from "@/lib/permissions";

function refresh() {
  revalidatePath("/", "layout");
}

async function editorGuard() {
  const user = await requireUser();
  if (!isEditor(user)) {
    return { user, error: "Only an editor can do that." as string | null };
  }
  return { user, error: null };
}

async function assertEditorExists(id: string): Promise<boolean> {
  if (!id) return true;
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, "editor")))
    .limit(1);
  return Boolean(rows[0]);
}

export async function createSection(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, error } = await editorGuard();
  if (error) return { ok: false, message: error };

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const ownerEditorId = String(formData.get("ownerEditorId") ?? "") || user.id;

  if (!name) return { ok: false, message: "A section name is required." };
  if (!(await assertEditorExists(ownerEditorId))) {
    return { ok: false, message: "The owning editor is not valid." };
  }

  const id = newId();
  await db.insert(sections).values({
    id,
    name,
    description,
    ownerEditorId,
  });

  refresh();
  redirect(`/sections/${id}`);
}

export async function updateSection(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { error } = await editorGuard();
  if (error) return { ok: false, message: error };

  const id = String(formData.get("sectionId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const ownerEditorId = String(formData.get("ownerEditorId") ?? "");

  if (!name) return { ok: false, message: "A section name is required." };
  if (!(await assertEditorExists(ownerEditorId))) {
    return { ok: false, message: "The owning editor is not valid." };
  }

  await db
    .update(sections)
    .set({ name, description, ownerEditorId, updatedAt: new Date() })
    .where(eq(sections.id, id));

  refresh();
  return { ok: true, message: "Section updated." };
}

export async function setSectionArchived(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { error } = await editorGuard();
  if (error) return { ok: false, message: error };

  const id = String(formData.get("sectionId") ?? "");
  const archived = String(formData.get("archived") ?? "") === "true";

  await db
    .update(sections)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(sections.id, id));

  refresh();
  return {
    ok: true,
    message: archived ? "Section archived." : "Section restored.",
  };
}

export async function assignWriter(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { error } = await editorGuard();
  if (error) return { ok: false, message: error };

  const sectionId = String(formData.get("sectionId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!sectionId || !userId) {
    return { ok: false, message: "Choose a writer to assign." };
  }

  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.role, "writer")))
    .limit(1);
  if (!rows[0]) {
    return { ok: false, message: "That user is not a writer." };
  }

  await db
    .insert(sectionWriters)
    .values({ sectionId, userId })
    .onConflictDoNothing();

  refresh();
  return { ok: true, message: "Writer assigned." };
}

export async function removeWriter(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { error } = await editorGuard();
  if (error) return { ok: false, message: error };

  const sectionId = String(formData.get("sectionId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  await db
    .delete(sectionWriters)
    .where(
      and(
        eq(sectionWriters.sectionId, sectionId),
        eq(sectionWriters.userId, userId),
      ),
    );

  refresh();
  return { ok: true, message: "Writer removed." };
}
