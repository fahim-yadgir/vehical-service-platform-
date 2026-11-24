import { NextRequest } from "next/server";
import { resetTenantPassword } from "@/backend/controllers/tenantController";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return resetTenantPassword(request, id);
}