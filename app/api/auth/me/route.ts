import { meController } from "@/backend/controllers/authController";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return meController(request);
}