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
        s.student_id,
        s.srn,
        s.full_name,
        u.email,
        s.department,
        s.semester,
        s.section
      FROM students s
      JOIN users u ON s.user_id = u.user_id
      ORDER BY s.student_id
    `);

    return NextResponse.json({
      success: true,
      students: result.rows,
    });
  } catch (error) {
    console.error("Student GET error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to retrieve students" },
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

    const {
      email,
      password,
      srn,
      fullName,
      department,
      semester,
      section,
    } = body;

    if (
      !email ||
      !password ||
      !srn ||
      !fullName ||
      !department ||
      !semester ||
      !section
    ) {
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

    if (!Number.isInteger(Number(semester)) || semester < 1 || semester > 8) {
      return NextResponse.json(
        { success: false, message: "Semester must be between 1 and 8" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await client.query("BEGIN");

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'STUDENT')
       RETURNING user_id`,
      [email.trim().toLowerCase(), passwordHash]
    );

    const userId = userResult.rows[0].user_id;

    const studentResult = await client.query(
      `INSERT INTO students
       (user_id, srn, full_name, department, semester, section)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING student_id, srn, full_name, department, semester, section`,
      [
        userId,
        srn.trim().toUpperCase(),
        fullName.trim(),
        department.trim(),
        Number(semester),
        section.trim().toUpperCase(),
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        message: "Student created successfully",
        student: {
          ...studentResult.rows[0],
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
        { success: false, message: "Email or SRN already exists" },
        { status: 409 }
      );
    }

    console.error("Student POST error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to create student" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}