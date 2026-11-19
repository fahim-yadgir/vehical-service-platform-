import { NextRequest } from "next/server";
import { logoutController } from "@/backend/controllers/authController";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return logoutController(request);
}