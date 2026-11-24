import { NextRequest } from "next/server";
import { tenantHistory } from "@/backend/controllers/tenantController";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return tenantHistory(request, id);
}