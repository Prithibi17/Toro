import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { getAdmin } from "@/lib/firebase-admin";

/** GET /api/invitations — returns all pending invitations for the signed-in user's email */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.email) return NextResponse.json({ invitations: [] });

  const { db } = getAdmin();
  const normalized = user.email.trim().toLowerCase();

  const snap = await db
    .collectionGroup("invitations")
    .where("email", "==", normalized)
    .where("status", "==", "pending")
    .get();

  const invitations = await Promise.all(
    snap.docs.map(async (d) => {
      const companyId = d.ref.parent.parent?.id ?? "";
      let companyName = companyId;
      try {
        const company = await d.ref.parent.parent!.get();
        companyName = company.data()?.name ?? companyId;
      } catch {}
      const data = d.data();
      return {
        id: d.id,
        companyId,
        companyName,
        role: data.role ?? "employee",
        invitedBy: data.invitedByName ?? data.invitedByEmail ?? "Someone",
        expiresAt: data.expiresAt?.toDate?.()?.toISOString() ?? null,
      };
    })
  );

  return NextResponse.json({ invitations });
}
