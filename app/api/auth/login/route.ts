import { loginController } from "@/backend/controllers/authController";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return loginController(request);
}