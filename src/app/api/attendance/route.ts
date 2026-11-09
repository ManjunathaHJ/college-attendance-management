
import { getCurrentUser } from "@/lib/authorization";
import { NextResponse } from "next/server";
import pool from "@/lib/postgres";

// GET: Admin sees all sessions, Faculty sees assigned sessions,
// Student sees only their own attendance records.
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    if (!["ADMIN", "FACULTY", "STUDENT"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId && !/^\d+$/.test(sessionId)) {
      return NextResponse.json(
        { success: false, message: "Invalid session ID" },
        { status: 400 }
      );
    }

    // STUDENT: Return only their own attendance records.
    if (user.role === "STUDENT") {
      const studentResult = await pool.query(
        "SELECT student_id FROM students WHERE user_id = $1",
        [user.userId]
      );

      if (studentResult.rowCount === 0) {
        return NextResponse.json(
          { success: false, message: "Student profile not found" },
          { status: 404 }
        );
      }

      const result = await pool.query(
        `
        SELECT
          ar.attendance_id,
          ar.student_id,
          ar.status,
          ar.status AS attendance_status,
          cs.session_id,
          cs.session_date,
          cs.start_time,
          cs.end_time,
          cs.topic,
          sub.subject_code,
          sub.subject_name
        FROM attendance_records ar
        JOIN class_sessions cs
          ON ar.session_id = cs.session_id
        JOIN class_offerings co
          ON cs.offering_id = co.offering_id
        JOIN subjects sub
          ON co.subject_id = sub.subject_id
        WHERE ar.student_id = $1
          AND ($2::INT IS NULL OR cs.session_id = $2)
        ORDER BY cs.session_date DESC, cs.start_time DESC
        `,
        [studentResult.rows[0].student_id, sessionId ? Number(sessionId) : null]
      );

      // Keep the sessions/students response structure used by the UI.
      const sessions = result.rows.map((row) => ({
        session_id: row.session_id,
        session_date: row.session_date,
        start_time: row.start_time,
        end_time: row.end_time,
        topic: row.topic,
        subject_code: row.subject_code,
        subject_name: row.subject_name,
        students: [
          {
            attendance_id: row.attendance_id,
            student_id: row.student_id,
            status: row.status,
            attendance_status: row.attendance_status,
            subject_code: row.subject_code,
            session_date: row.session_date,
          },
        ],
      }));

      return NextResponse.json({
        success: true,
        sessions,
      });
    }

    // Identify faculty for access restrictions.
    let facultyId: number | null = null;

    if (user.role === "FACULTY") {
      const facultyResult = await pool.query(
        "SELECT faculty_id FROM faculty WHERE user_id = $1",
        [user.userId]
      );

      if (facultyResult.rowCount === 0) {
        return NextResponse.json(
          { success: false, message: "Faculty profile not found" },
          { status: 404 }
        );
      }

      facultyId = facultyResult.rows[0].faculty_id;
    }

    // ADMIN sees all sessions; FACULTY sees assigned sessions only.
    const sessionsResult = await pool.query(
      `
      SELECT
        cs.session_id,
        cs.session_date,
        cs.start_time,
        cs.end_time,
        cs.topic,
        sub.subject_code,
        sub.subject_name,
        co.faculty_id
      FROM class_sessions cs
      JOIN class_offerings co
        ON cs.offering_id = co.offering_id
      JOIN subjects sub
        ON co.subject_id = sub.subject_id
      WHERE ($1::INT IS NULL OR co.faculty_id = $1)
      ORDER BY cs.session_date DESC, cs.start_time DESC
      `,
      [facultyId]
    );

    if (!sessionId) {
      return NextResponse.json({
        success: true,
        sessions: sessionsResult.rows,
      });
    }

    // Check that the requested session exists and is accessible.
    const selectedSession = sessionsResult.rows.find(
      (session) => session.session_id === Number(sessionId)
    );

    if (!selectedSession) {
      return NextResponse.json(
        { success: false, message: "Session not found or access denied" },
        { status: 404 }
      );
    }

    const studentsResult = await pool.query(
      `
      SELECT
        s.student_id,
        s.srn,
        s.full_name,
        ar.attendance_id,
        ar.status,
        ar.status AS attendance_status
      FROM class_sessions cs
      JOIN class_offerings co
        ON cs.offering_id = co.offering_id
      JOIN enrollments e
        ON e.offering_id = co.offering_id
      JOIN students s
        ON s.student_id = e.student_id
      LEFT JOIN attendance_records ar
        ON ar.session_id = cs.session_id
        AND ar.student_id = s.student_id
      WHERE cs.session_id = $1
      ORDER BY s.full_name
      `,
      [Number(sessionId)]
    );

    return NextResponse.json({
      success: true,
      sessions: sessionsResult.rows,
      students: studentsResult.rows,
    });
  } catch (error) {
    console.error("Attendance GET error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to retrieve attendance data" },
      { status: 500 }
    );
  }
}

// POST: Only Faculty can mark attendance.
export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 }
    );
  }

  if (user.role !== "FACULTY") {
    return NextResponse.json(
      { success: false, message: "Only Faculty can mark attendance" },
      { status: 403 }
    );
  }
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON request" },
      { status: 400 }
    );
  }

  const { sessionId, records } = body;

  if (
    !Number.isInteger(Number(sessionId)) ||
    Number(sessionId) < 1 ||
    !Array.isArray(records) ||
    records.length === 0
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "A valid session and attendance records are required",
      },
      { status: 400 }
    );
  }

  const validStatuses = ["PRESENT", "ABSENT", "LATE"];

  const studentIds = records.map(
    (record: { studentId?: number }) => Number(record.studentId)
  );

  if (
    records.some(
      (record: { studentId?: number; status?: string }) =>
        !Number.isInteger(Number(record.studentId)) ||
        Number(record.studentId) < 1 ||
        !validStatuses.includes(record.status ?? "")
    ) ||
    new Set(studentIds).size !== studentIds.length
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid or duplicate student attendance entries",
      },
      { status: 400 }
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const sessionResult = await client.query(
      `
      SELECT co.faculty_id
      FROM class_sessions cs
      JOIN class_offerings co
        ON cs.offering_id = co.offering_id
      WHERE cs.session_id = $1
      `,
      [Number(sessionId)]
    );

    if (sessionResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { success: false, message: "Class session not found" },
        { status: 404 }
      );
    }

    const facultyId = sessionResult.rows[0].faculty_id;

    // A faculty member can mark attendance only for their own class.
    if (user.role === "FACULTY") {
      const facultyResult = await client.query(
        "SELECT faculty_id FROM faculty WHERE user_id = $1",
        [user.userId]
      );

      if (
        facultyResult.rowCount === 0 ||
        facultyResult.rows[0].faculty_id !== facultyId
      ) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          { success: false, message: "You are not assigned to this class" },
          { status: 403 }
        );
      }
    }

    for (const record of records) {
      await client.query(
        `
        INSERT INTO attendance_records
          (session_id, student_id, status, marked_by)
        VALUES ($1, $2, $3, $4)
        `,
        [
          Number(sessionId),
          Number(record.studentId),
          record.status,
          facultyId,
        ]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Attendance saved successfully",
      recordsSaved: records.length,
    });
  } catch (error: unknown) {
    await client.query("ROLLBACK");

    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Attendance already exists for one or more students in this session. No changes were saved.",
        },
        { status: 409 }
      );
    }

    if (dbError.code === "P0001" || dbError.code === "23503") {
      return NextResponse.json(
        { success: false, message: "Invalid student or attendance assignment" },
        { status: 400 }
      );
    }

    console.error("Attendance POST error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to save attendance" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
