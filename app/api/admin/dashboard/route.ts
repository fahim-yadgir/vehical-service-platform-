import { NextRequest } from "next/server";
import { getDashboard } from "@/backend/controllers/statsController";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return getDashboard(request);
}
