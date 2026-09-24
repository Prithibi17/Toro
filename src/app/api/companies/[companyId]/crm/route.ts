import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { can, requireMembership } from "@/lib/session";
import { getAdmin } from "@/lib/firebase-admin";

const dealInput = z.object({ name: z.string().trim().min(2).max(160), contactName: z.string().trim().max(120).default(""), email: z.string().trim().email().or(z.literal("")), value: z.coerce.number().min(0).max(999999999), stage: z.enum(["new", "qualified", "proposal", "won", "lost"]).default("new") });
export async function GET(_: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params; const ctx = await requireMembership(companyId);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const snap = await getAdmin().db.collection(`companies/${companyId}/crmDeals`).orderBy("createdAt", "desc").limit(200).get();
  return NextResponse.json({ deals: snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null })) });
}
export async function POST(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params; const ctx = await requireMembership(companyId);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!can(ctx.membership,"crm.manage")) return NextResponse.json({ error: "You do not have permission to manage CRM" }, { status: 403 });
  try { const input = dealInput.parse(await req.json()); const ref = getAdmin().db.collection(`companies/${companyId}/crmDeals`).doc(); await ref.create({ ...input, companyId, ownerId: ctx.user.uid, createdBy: ctx.user.uid, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }); return NextResponse.json({ deal: { id: ref.id, ...input } }, { status: 201 }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid opportunity" }, { status: 400 }); }
}
