import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { can, requireMembership } from "@/lib/session";
import { getAdmin } from "@/lib/firebase-admin";

const taskInput = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).default(""),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z.string().max(30).default(""),
  status: z.enum(["todo", "in-progress", "review", "done"]).default("todo")
});

export async function GET(_: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const ctx = await requireMembership(companyId);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const snap = await getAdmin().db.collection(`companies/${companyId}/tasks`).orderBy("createdAt", "desc").limit(200).get();
  return NextResponse.json({ tasks: snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null })) });
}

export async function POST(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const ctx = await requireMembership(companyId);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!can(ctx.membership,"tasks.create")) return NextResponse.json({ error: "You do not have permission to create tasks" }, { status: 403 });
  try {
    const input = taskInput.parse(await req.json());
    const ref = getAdmin().db.collection(`companies/${companyId}/tasks`).doc();
    const record = { ...input, companyId, creatorId: ctx.user.uid, creatorName: ctx.user.name ?? ctx.user.email ?? "User", assigneeIds: [ctx.user.uid], viewerIds: [], createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };
    await ref.create(record);
    return NextResponse.json({ task: { id: ref.id, ...input, creatorName: record.creatorName } }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid task" }, { status: 400 }); }
}
