
"use client";

import { useEffect, useState } from "react";

interface CorrectionRequest {
  request_id: number;
  attendance_id: number;
  student_id: number;
  srn: string;
  student_name: string;
  subject_code: string;
  current_status: string;
  requested_status: string;
  reason: string;
  request_status: string;
  created_at: string;
  reviewer_name: string | null;
}

interface AttendanceOption {
  attendance_id: number;
  subject_code: string;
  session_date: string;
  current_status: string;
}

export default function CorrectionsPage() {
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [attendance, setAttendance] = useState<AttendanceOption[]>([]);
  const [role, setRole] = useState("");
  const [attendanceId, setAttendanceId] = useState("");
  const [requestedStatus, setRequestedStatus] = useState("PRESENT");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadRequests() {
    try {
      const response = await fetch("/api/corrections");
      const result = await response.json();

      if (!response.ok) throw new Error(result.message);

      setRequests(result.requests || []);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load requests"
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadUser() {
    const response = await fetch("/api/auth/me");
    const result = await response.json();

    if (!response.ok) throw new Error("Unable to identify logged-in user");

    setRole(result.user.role);
  }

  async function loadStudentAttendance() {
    try {
      const response = await fetch("/api/attendance");
      const result = await response.json();

      if (!response.ok) throw new Error(result.message);

      const options: AttendanceOption[] = (result.sessions || []).flatMap(
        (session: {
          students?: {
            attendance_id?: number;
            status?: string;
          }[];
          subject_code?: string;
          session_date?: string;
        }) =>
          (session.students || [])
            .filter((student) => student.attendance_id)
            .map((student) => ({
              attendance_id: student.attendance_id!,
              subject_code: session.subject_code || "Subject",
              session_date: session.session_date || "",
              current_status: student.status || "UNKNOWN",
            }))
      );

      setAttendance(options);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load attendance records"
      );
    }
  }

  useEffect(() => {
    async function initialize() {
      try {
        await loadUser();
        await loadRequests();
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Unable to load page"
        );
        setLoading(false);
      }
    }

    initialize();
  }, []);

  useEffect(() => {
    if (role === "STUDENT") {
      loadStudentAttendance();
    }
  }, [role]);

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceId: Number(attendanceId),
          requestedStatus,
          reason,
        }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.message);

      setMessage(result.message);
      setAttendanceId("");
      setReason("");
      await loadRequests();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to submit request"
      );
    } finally {
      setSaving(false);
    }
  }

  async function reviewRequest(requestId: number, decision: string) {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/corrections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, decision }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.message);

      setMessage(result.message);
      await loadRequests();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to review request"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <a href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to Dashboard
        </a>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Attendance Correction Requests
        </h1>

        <p className="mt-2 text-slate-600">
          {role === "STUDENT"
            ? "Submit and track your attendance correction requests."
            : "Review student attendance correction requests."}
        </p>

        {message && (
          <p className="mt-5 rounded-lg bg-white p-4 text-sm text-blue-700">
            {message}
          </p>
        )}

        {role === "STUDENT" && (
          <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-slate-800">
              Submit a Correction Request
            </h2>

            <form onSubmit={submitRequest} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Attendance Record
                </label>
                <select
                  required
                  value={attendanceId}
                  onChange={(event) => setAttendanceId(event.target.value)}
                  className="w-full rounded-lg border p-3"
                >
                  <option value="">Select an attendance record</option>
                  {attendance.map((item) => (
                    <option
                      key={item.attendance_id}
                      value={item.attendance_id}
                    >
                      {item.subject_code} - {item.session_date} -{" "}
                      {item.current_status} (ID: {item.attendance_id})
                    </option>
                  ))}
                </select>

                {attendance.length === 0 && (
                  <p className="mt-2 text-sm text-slate-500">
                    No attendance records available for correction.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Requested Status
                </label>
                <select
                  value={requestedStatus}
                  onChange={(event) => setRequestedStatus(event.target.value)}
                  className="w-full rounded-lg border p-3"
                >
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Late</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Reason
                </label>
                <textarea
                  required
                  minLength={5}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Explain why this attendance record needs correction"
                  className="w-full rounded-lg border p-3"
                  rows={3}
                />
              </div>

              <button
                type="submit"
                disabled={saving || !attendanceId || !reason.trim()}
                className="rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
              >
                {saving ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          </section>
        )}

        <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-800">
            {role === "STUDENT" ? "My Requests" : "Submitted Requests"} (
            {requests.length})
          </h2>

          {loading ? (
            <p>Loading requests...</p>
          ) : requests.length === 0 ? (
            <p className="text-slate-500">No correction requests found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    {role !== "STUDENT" && <th className="p-3">Student</th>}
                    <th className="p-3">Subject</th>
                    <th className="p-3">Current</th>
                    <th className="p-3">Requested</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Status</th>
                    {role !== "STUDENT" && <th className="p-3">Action</th>}
                  </tr>
                </thead>

                <tbody>
                  {requests.map((request) => (
                    <tr key={request.request_id} className="border-b">
                      {role !== "STUDENT" && (
                        <td className="p-3">
                          <div className="font-medium">
                            {request.student_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {request.srn}
                          </div>
                        </td>
                      )}

                      <td className="p-3">{request.subject_code}</td>
                      <td className="p-3">{request.current_status}</td>
                      <td className="p-3">{request.requested_status}</td>
                      <td className="max-w-xs p-3">{request.reason}</td>
                      <td className="p-3">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                          {request.request_status}
                        </span>
                      </td>

                      {role !== "STUDENT" && (
                        <td className="p-3">
                          {role === "FACULTY" &&
                          request.request_status === "PENDING" ? (
                            <div className="flex gap-2">
                              <button
                                disabled={saving}
                                onClick={() =>
                                  reviewRequest(request.request_id, "APPROVED")
                                }
                                className="rounded bg-green-600 px-3 py-2 text-xs text-white disabled:opacity-50"
                              >
                                Approve
                              </button>

                              <button
                                disabled={saving}
                                onClick={() =>
                                  reviewRequest(request.request_id, "REJECTED")
                                }
                                className="rounded bg-red-600 px-3 py-2 text-xs text-white disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500">
                              {request.reviewer_name || "View only"}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
