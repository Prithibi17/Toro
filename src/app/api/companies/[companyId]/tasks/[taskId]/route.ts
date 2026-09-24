import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { can, requireMembership } from "@/lib/session";
import { getAdmin } from "@/lib/firebase-admin";

const updateInput = z.object({ status: z.enum(["todo", "in-progress", "review", "done"]) });
export async function PATCH(req: Request, { params }: { params: Promise<{ companyId: string; taskId: string }> }) {
  const { companyId, taskId } = await params;
  const ctx = await requireMembership(companyId);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const input = updateInput.parse(await req.json());
    const ref = getAdmin().db.doc(`companies/${companyId}/tasks/${taskId}`);
    const doc = await ref.get();
    if (!doc.exists) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (!can(ctx.membership,"tasks.move")) return NextResponse.json({ error: "You do not have permission to move tasks" }, { status: 403 });
    await ref.update({ status: input.status, updatedAt: FieldValue.serverTimestamp(), updatedBy: ctx.user.uid });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid update" }, { status: 400 }); }
}
