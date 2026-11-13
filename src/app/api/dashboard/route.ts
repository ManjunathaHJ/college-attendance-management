
import { getCurrentUser } from "@/lib/authorization";
import { NextResponse } from "next/server";
import pool from "@/lib/postgres";

export async function GET() {
  try {
    // Verify authentication.
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only administrators can access dashboard statistics.
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    const [
      studentResult,
      facultyResult,
      attendanceResult,
      pendingResult,
      recentResult,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total FROM students"),

      pool.query("SELECT COUNT(*)::int AS total FROM faculty"),

      pool.query(`
        SELECT
          COALESCE(
            ROUND(
              100.0 * COUNT(*) FILTER (
                WHERE status IN ('PRESENT', 'LATE')
              ) / NULLIF(COUNT(*), 0),
              2
            ),
            0
          ) AS percentage
        FROM attendance_records
      `),

      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM correction_requests
        WHERE request_status = 'PENDING'
      `),

      pool.query(`
        SELECT
          s.full_name AS student_name,
          s.srn,
          sub.subject_code,
          ar.status,
          ar.marked_at
        FROM attendance_records ar
        JOIN students s
          ON ar.student_id = s.student_id
        JOIN class_sessions cs
          ON ar.session_id = cs.session_id
        JOIN class_offerings co
          ON cs.offering_id = co.offering_id
        JOIN subjects sub
          ON co.subject_id = sub.subject_id
        ORDER BY ar.marked_at DESC
        LIMIT 10
      `),
    ]);

    return NextResponse.json({
      success: true,
      statistics: {
        totalStudents: studentResult.rows[0].total,
        totalFaculty: facultyResult.rows[0].total,
        attendanceRate: Number(attendanceResult.rows[0].percentage),
        pendingRequests: pendingResult.rows[0].total,
      },
      recentAttendance: recentResult.rows,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve dashboard data",
      },
      { status: 500 }
    );
  }
}
