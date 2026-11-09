
import { getCurrentUser } from "@/lib/authorization";
import { NextResponse } from "next/server";
import pool from "@/lib/postgres";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    const result = await pool.query(`
      SELECT
        f.faculty_id,
        f.employee_id,
        f.full_name,
        f.department,
        u.email
      FROM faculty f
      JOIN users u ON f.user_id = u.user_id
      ORDER BY f.faculty_id
    `);

    return NextResponse.json({
      success: true,
      faculty: result.rows,
    });
  } catch (error) {
    console.error("Faculty GET error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to retrieve faculty" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const { email, password, employeeId, fullName, department } = body;

    if (!email || !password || !employeeId || !fullName || !department) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    if (String(password).length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must contain at least 8 characters" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await client.query("BEGIN");

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'FACULTY')
       RETURNING user_id`,
      [email.trim().toLowerCase(), passwordHash]
    );

    const userId = userResult.rows[0].user_id;

    const facultyResult = await client.query(
      `INSERT INTO faculty
       (user_id, employee_id, full_name, department)
       VALUES ($1, $2, $3, $4)
       RETURNING faculty_id, employee_id, full_name, department`,
      [
        userId,
        employeeId.trim().toUpperCase(),
        fullName.trim(),
        department.trim(),
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        message: "Faculty created successfully",
        faculty: {
          ...facultyResult.rows[0],
          email: email.trim().toLowerCase(),
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    await client.query("ROLLBACK");

    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      return NextResponse.json(
        { success: false, message: "Email or Employee ID already exists" },
        { status: 409 }
      );
    }

    console.error("Faculty POST error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to create faculty" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
