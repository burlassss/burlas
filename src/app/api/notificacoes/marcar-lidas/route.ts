import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST() {
  const user = await requireUser();
  await db.markAllNotificationsRead(user.id);
  return NextResponse.json({ ok: true });
}
