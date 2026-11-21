import {changePasswordController} from "@/backend/controllers/authController";
export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  return changePasswordController(request);
}