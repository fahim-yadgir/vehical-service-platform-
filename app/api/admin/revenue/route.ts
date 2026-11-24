import {getRevenue} from "@/backend/controllers/statsController";
import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return getRevenue(request);
}