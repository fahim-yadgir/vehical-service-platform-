import { NextRequest } from "next/server";
import { getTenantById } from "@/backend/controllers/tenantController";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return getTenantById(request, id);
}