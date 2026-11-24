import { NextRequest } from "next/server";
import { deleteTenant, getTenantById, updateTenant } from "@/backend/controllers/tenantController";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return getTenantById(request, id);
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return updateTenant(request, id);
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return deleteTenant(request, id);
}