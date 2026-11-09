
import { getCurrentUser } from "@/lib/authorization";
import { NextResponse } from "next/server";
import pool from "@/lib/postgres";

// GET: Admin and Faculty can view available class offerings.
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    if (!["ADMIN", "FACULTY"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    let facultyId: number | null = null;

    if (user.role === "FACULTY") {
      const faculty = await pool.query(
        "SELECT faculty_id FROM faculty WHERE user_id = $1",
        [user.userId]
      );

      if (faculty.rowCount === 0) {
        return NextResponse.json(
          { success: false, message: "Faculty profile not found" },
          { status: 404 }
        );
      }

      facultyId = faculty.rows[0].faculty_id;
    }

    const result = await pool.query(
      `
        SELECT
          co.offering_id,
          co.faculty_id,
          co.semester,
          co.section,
          co.academic_year,
          sub.subject_code,
          sub.subject_name
        FROM class_offerings co
        JOIN subjects sub ON co.subject_id = sub.subject_id
        WHERE ($1::INT IS NULL OR co.faculty_id = $1)
        ORDER BY sub.subject_code
      `,
      [facultyId]
    );

    return NextResponse.json({
      success: true,
      role: user.role,
      offerings: result.rows,
    });
  } catch (error) {
    console.error("Session offerings GET error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load assigned classes" },
      { status: 500 }
    );
  }
}

// POST: Only Faculty can create class sessions.
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    if (user.role !== "FACULTY") {
      return NextResponse.json(
        { success: false, message: "Only Faculty can create class sessions" },
        { status: 403 }
      );
    }

    const faculty = await pool.query(
      "SELECT faculty_id FROM faculty WHERE user_id = $1",
      [user.userId]
    );

    if (faculty.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Faculty profile not found" },
        { status: 404 }
      );
    }

    const facultyId = faculty.rows[0].faculty_id;

    const body = await request.json();
    const { offeringId, sessionDate, startTime, endTime, topic } = body;

    if (
      !Number.isInteger(Number(offeringId)) ||
      Number(offeringId) < 1 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate || "") ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime || "") ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime || "") ||
      startTime >= endTime ||
      !topic?.trim()
    ) {
      return NextResponse.json(
        { success: false, message: "Please provide valid session details" },
        { status: 400 }
      );
    }

    const offering = await pool.query(
      `
        SELECT offering_id
        FROM class_offerings
        WHERE offering_id = $1
          AND faculty_id = $2
      `,
      [Number(offeringId), facultyId]
    );

    if (offering.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Class not found or access denied" },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `
        INSERT INTO class_sessions
          (offering_id, session_date, start_time, end_time, topic)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING session_id
      `,
      [
        Number(offeringId),
        sessionDate,
        startTime,
        endTime,
        topic.trim(),
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Class session created successfully",
      sessionId: result.rows[0].session_id,
    });
  } catch (error) {
    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "A session already exists for this class at that date and time.",
        },
        { status: 409 }
      );
    }

    console.error("Session creation error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to create class session" },
      { status: 500 }
    );
  }
}
