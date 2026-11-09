
import { getCurrentUser } from "@/lib/authorization";
import { NextResponse } from "next/server";
import pool from "@/lib/postgres";

// GET: Admin sees all requests, Faculty sees assigned classes,
// Student sees only their own requests.
export async function GET() {
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

    let facultyId: number | null = null;
    let studentId: number | null = null;

    // Identify authenticated faculty.
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

    // Identify authenticated student.
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

      studentId = studentResult.rows[0].student_id;
    }

    const result = await pool.query(
      `
      SELECT
        cr.request_id,
        cr.attendance_id,
        cr.student_id,
        s.srn,
        s.full_name AS student_name,
        sub.subject_code,
        ar.status AS current_status,
        cr.requested_status,
        cr.reason,
        cr.request_status,
        cr.created_at,
        cr.reviewed_at,
        f.full_name AS reviewer_name
      FROM correction_requests cr
      JOIN students s
        ON cr.student_id = s.student_id
      JOIN attendance_records ar
        ON cr.attendance_id = ar.attendance_id
      JOIN class_sessions cs
        ON ar.session_id = cs.session_id
      JOIN class_offerings co
        ON cs.offering_id = co.offering_id
      JOIN subjects sub
        ON co.subject_id = sub.subject_id
      LEFT JOIN faculty f
        ON cr.reviewed_by = f.faculty_id
      WHERE
        ($1::INT IS NULL OR co.faculty_id = $1)
        AND
        ($2::INT IS NULL OR cr.student_id = $2)
      ORDER BY cr.created_at DESC
      `,
      [facultyId, studentId]
    );

    return NextResponse.json({
      success: true,
      requests: result.rows,
    });
  } catch (error) {
    console.error("Correction GET error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to retrieve correction requests" },
      { status: 500 }
    );
  }
}

// POST: Only students can submit correction requests.
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    if (user.role !== "STUDENT") {
      return NextResponse.json(
        {
          success: false,
          message: "Only students can submit correction requests",
        },
        { status: 403 }
      );
    }

    // Get student ID from authenticated account.
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

    const studentId = studentResult.rows[0].student_id;

    const body = await request.json();
    const { attendanceId, requestedStatus, reason } = body;

    if (
      !Number.isInteger(Number(attendanceId)) ||
      Number(attendanceId) < 1 ||
      !["PRESENT", "ABSENT", "LATE"].includes(requestedStatus) ||
      typeof reason !== "string" ||
      reason.trim().length < 5
    ) {
      return NextResponse.json(
        { success: false, message: "Please provide valid correction details" },
        { status: 400 }
      );
    }

    // Insert only if the attendance record belongs to this student.
    const result = await pool.query(
      `
      INSERT INTO correction_requests
        (attendance_id, student_id, requested_status, reason)
      SELECT
        ar.attendance_id,
        ar.student_id,
        $3,
        $4
      FROM attendance_records ar
      WHERE ar.attendance_id = $1
        AND ar.student_id = $2
      RETURNING request_id, request_status, created_at
      `,
      [
        Number(attendanceId),
        studentId,
        requestedStatus,
        reason.trim(),
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Attendance record not found for this student",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Correction request submitted successfully",
        request: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        { success: false, message: "Invalid attendance record" },
        { status: 400 }
      );
    }

    console.error("Correction POST error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to submit correction request",
      },
      { status: 500 }
    );
  }
}

// PATCH: Only faculty can approve or reject correction requests.
export async function PATCH(request: Request) {
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
        {
          success: false,
          message: "Only faculty can review correction requests",
        },
        { status: 403 }
      );
    }

    // Get faculty ID from authenticated account.
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

    const facultyId = facultyResult.rows[0].faculty_id;

    const body = await request.json();
    const { requestId, decision } = body;

    if (
      !Number.isInteger(Number(requestId)) ||
      Number(requestId) < 1 ||
      !["APPROVED", "REJECTED"].includes(decision)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid review details" },
        { status: 400 }
      );
    }

    // Stored procedure checks faculty assignment and updates
    // attendance when the request is approved.
    await pool.query(
      "CALL review_correction_request($1, $2, $3)",
      [Number(requestId), facultyId, decision]
    );

    return NextResponse.json({
      success: true,
      message: `Correction request ${decision.toLowerCase()} successfully`,
    });
  } catch (error) {
    console.error("Correction review error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to review request. It may already be reviewed or the faculty assignment may be invalid.",
      },
      { status: 400 }
    );
  }
}
