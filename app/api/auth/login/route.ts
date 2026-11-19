import { loginController } from "@/backend/controllers/authController";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return loginController(request);
}