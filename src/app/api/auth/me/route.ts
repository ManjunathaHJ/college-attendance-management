import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  await connection();

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("attendance_session")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Not logged in" },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired session" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Session verification error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to verify session" },
      { status: 500 }
    );
  }
}
