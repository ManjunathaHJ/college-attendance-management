import { NextResponse } from "next/server";
import pool from "@/lib/postgres";
import bcrypt from "bcryptjs";
import { createToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT user_id, email, password_hash, role
       FROM users
       WHERE LOWER(email) = LOWER($1)
         AND is_active = TRUE`,
      [email.trim()]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await createToken({
      userId: user.user_id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        userId: user.user_id,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set("attendance_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to process login" },
      { status: 500 }
    );
  }
}