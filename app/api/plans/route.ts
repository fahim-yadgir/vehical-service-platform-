import { NextRequest } from "next/server";
import { getPlans, updatePlans } from "@/backend/controllers/planController";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return getPlans(request);
}
export async function PATCH(request: NextRequest) {
  return updatePlans(request);
}