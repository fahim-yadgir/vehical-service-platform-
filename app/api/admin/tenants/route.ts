import { NextRequest } from "next/server";
import {createTenant, tenantsDetails} from "@/backend/controllers/tenantController"
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return createTenant(request);
}
export async function GET(request: NextRequest) {
  return tenantsDetails(request);
}
