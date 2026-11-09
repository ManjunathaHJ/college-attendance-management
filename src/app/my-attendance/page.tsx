"use client";

import { useEffect, useState } from "react";

interface Attendance {
  attendance_id: number;
  status: string;
  session_id: number;
  session_date: string;
  start_time: string;
  end_time: string;
  topic: string;
  subject_code: string;
  subject_name: string;
}

export default function MyAttendancePage() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAttendance() {
      try {
        const response = await fetch("/api/attendance");

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Unable to load attendance");
        }

        const attendanceRecords = (data.sessions || []).flatMap(
          (session: any) =>
            (session.students || []).map((student: any) => ({
              ...student,
              session_id: session.session_id,
              session_date: session.session_date,
              start_time: session.start_time,
              end_time: session.end_time,
              topic: session.topic,
              subject_code: session.subject_code,
              subject_name: session.subject_name,
            }))
        );

        setRecords(attendanceRecords);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong"
        );
      } finally {
        setLoading(false);
      }
    }

    loadAttendance();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <a
          href="/students"
          className="text-sm font-semibold text-blue-600 hover:underline"
        >
          ← Back to Dashboard
        </a>

        <h1 className="mt-5 text-3xl font-bold text-slate-900">
          My Attendance
        </h1>

        <p className="mt-2 text-slate-600">
          View your personal attendance records.
        </p>

        {loading ? (
          <p className="mt-8 text-slate-600">Loading attendance...</p>
        ) : error ? (
          <p className="mt-8 text-red-600">{error}</p>
        ) : records.length === 0 ? (
          <p className="mt-8 rounded-lg bg-white p-6 text-slate-600">
            No attendance records found.
          </p>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-xl bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-200 text-slate-700">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Topic</th>
                  <th className="p-4">Start Time</th>
                  <th className="p-4">End Time</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>

              <tbody>
                {records.map((record) => (
                  <tr
                    key={record.attendance_id}
                    className="border-t border-slate-200"
                  >
                    <td className="p-4">
                      {new Date(record.session_date).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      {record.subject_code}
                    </td>
                    <td className="p-4">
                      {record.topic || "-"}
                    </td>
                    <td className="p-4">{record.start_time}</td>
                    <td className="p-4">{record.end_time}</td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          record.status === "PRESENT"
                            ? "bg-green-100 text-green-700"
                            : record.status === "ABSENT"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}