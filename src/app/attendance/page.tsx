
"use client";

import { useEffect, useState } from "react";

interface Session {
  session_id: number;
  session_date: string;
  start_time: string;
  end_time: string;
  topic: string;
  subject_code: string;
  subject_name: string;
}

interface Student {
  student_id: number;
  srn: string;
  full_name: string;
  attendance_status: string | null;
}

interface Offering {
  offering_id: number;
  subject_code: string;
  subject_name: string;
  semester: number;
  section: string;
  academic_year: string;
}

export default function AttendancePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [offeringId, setOfferingId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [topic, setTopic] = useState("");
  const [statuses, setStatuses] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [role, setRole] = useState("");

  async function loadSessions() {
    const response = await fetch("/api/attendance");
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to load sessions");
    }

    setSessions(Array.isArray(result.sessions) ? result.sessions : []);
  }

  useEffect(() => {
    async function initialize() {
      try {
        const [sessionResponse, offeringResponse] = await Promise.all([
          fetch("/api/attendance"),
          fetch("/api/sessions"),
        ]);

        const sessionResult = await sessionResponse.json();
        const offeringResult = await offeringResponse.json();

        if (!sessionResponse.ok) {
          throw new Error(sessionResult.message || "Unable to load sessions");
        }

        if (!offeringResponse.ok) {
          throw new Error(offeringResult.message || "Unable to load classes");
        }

        setSessions(sessionResult.sessions ?? []);
        setOfferings(offeringResult.offerings ?? []);
        setRole(offeringResult.role ?? "");
        
        if (offeringResult.offerings?.length === 1) {
          setOfferingId(String(offeringResult.offerings[0].offering_id));
        }
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Unable to load data"
        );
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, []);

  async function createSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setMessage("");

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offeringId: Number(offeringId),
          sessionDate,
          startTime,
          endTime,
          topic,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to create session");
      }

      await loadSessions();

      setMessage("Class session created successfully!");
      setTopic("");
      setSessionId(String(result.sessionId));

      await loadStudents(String(result.sessionId));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to create session"
      );
    } finally {
      setCreating(false);
    }
  }

  async function loadStudents(id: string) {
    setSessionId(id);
    setStudents([]);
    setStatuses({});
    setMessage("");

    if (!id) return;

    setStudentsLoading(true);

    try {
      const response = await fetch(
        `/api/attendance?sessionId=${encodeURIComponent(id)}`
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load students");
      }

      let studentList: any[] = [];

      if (Array.isArray(result.students)) {
        studentList = result.students;
      } else if (Array.isArray(result.sessions)) {
        const selectedSession = result.sessions.find(
          (session: Session) => Number(session.session_id) === Number(id)
        );

        studentList = selectedSession?.students ?? [];
      }

      const normalizedStudents: Student[] = studentList.map((student) => ({
        student_id: student.student_id,
        srn: student.srn || "",
        full_name: student.full_name || student.student_name || "",
        attendance_status:
          student.attendance_status ?? student.status ?? null,
      }));

      setStudents(normalizedStudents);

      const initialStatuses: Record<number, string> = {};

      for (const student of normalizedStudents) {
        initialStatuses[student.student_id] =
          student.attendance_status || "PRESENT";
      }

      setStatuses(initialStatuses);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load students"
      );
    } finally {
      setStudentsLoading(false);
    }
  }

  async function saveAttendance() {
    if (!sessionId || students.length === 0) return;

    setSaving(true);
    setMessage("");

    try {
      const records = students.map((student) => ({
        studentId: student.student_id,
        status: statuses[student.student_id] || "PRESENT",
      }));

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: Number(sessionId),
          records,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save attendance");
      }

      setMessage(result.message || "Attendance saved successfully.");

      await loadStudents(sessionId);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save attendance"
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
          Attendance Management
        </h1>

        <p className="mt-2 text-slate-600">
          Create class sessions and record student attendance.
        </p>

        {message && (
          <p className="mt-5 rounded-lg bg-white p-4 text-sm text-blue-700">
            {message}
          </p>
        )}

        {role === "FACULTY" && (
 
        <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-800">
            Create New Class Session
          </h2>

          {loading ? (
            <p>Loading assigned classes...</p>
          ) : offerings.length === 0 ? (
            <p className="text-slate-500">
              No assigned classes are available.
            </p>
          ) : (
            <form onSubmit={createSession} className="space-y-4">
              <div>
                <label className="mb-2 block font-medium">
                  Select Class
                </label>
                <select
                  required
                  value={offeringId}
                  onChange={(e) => setOfferingId(e.target.value)}
                  className="w-full rounded-lg border p-3"
                >
                  <option value="">Choose a class</option>
                  {offerings.map((offering) => (
                    <option
                      key={offering.offering_id}
                      value={offering.offering_id}
                    >
                      {offering.subject_code} - {offering.subject_name}
                      {" | Semester "}{offering.semester}
                      {" | Section "}{offering.section}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block font-medium">
                    Session Date
                  </label>
                  <input
                    type="date"
                    required
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full rounded-lg border p-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block font-medium">
                    Lecture Topic
                  </label>
                  <input
                    type="text"
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. SQL Joins"
                    className="w-full rounded-lg border p-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block font-medium">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-lg border p-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block font-medium">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-lg border p-3"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creating || !offeringId}
                className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Session"}
              </button>
            </form>
          )}
        </section>
        )}

        <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <label className="mb-2 block font-semibold text-slate-800">
            Select Class Session
          </label>

          {loading ? (
            <p>Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="text-slate-500">No class sessions available.</p>
          ) : (
            <select
              value={sessionId}
              onChange={(e) => loadStudents(e.target.value)}
              className="w-full rounded-lg border p-3 md:max-w-xl"
            >
              <option value="">Choose a session</option>
              {sessions.map((session) => (
                <option key={session.session_id} value={session.session_id}>
                  {session.subject_code} - {session.topic} (
                  {new Date(session.session_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          )}
        </section>

        {sessionId && (
          <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-slate-800">
              Student Attendance
            </h2>

            {studentsLoading ? (
              <p className="text-slate-500">Loading enrolled students...</p>
            ) : students.length === 0 ? (
              <p className="text-slate-500">
                No enrolled students found for this session.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="p-3">SRN</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.student_id} className="border-b">
                          <td className="p-3">{student.srn}</td>
                          <td className="p-3">{student.full_name}</td>
                          <td className="p-3">
                            <select
                              value={statuses[student.student_id] || "PRESENT"}
                              disabled={role !== "FACULTY" || student.attendance_status !== null}
                              onChange={(e) =>
                                setStatuses((previous) => ({
                                  ...previous,
                                  [student.student_id]: e.target.value,
                                }))
                              }
                              className="rounded-lg border p-2 disabled:bg-slate-100"
                            >
                              <option value="PRESENT">Present</option>
                              <option value="ABSENT">Absent</option>
                              <option value="LATE">Late</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
{role === "FACULTY" && (
                <button
                  onClick={saveAttendance}
                  disabled={
                    saving ||
                    students.some(
                      (student) => student.attendance_status !== null
                    )
                  }
                  className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Attendance"}
                </button>
                )}

                {students.some(
                  (student) => student.attendance_status !== null
                ) && (
                  <p className="mt-3 text-sm text-amber-700">
                    Attendance has already been recorded for this session.
                    Use the correction request workflow to request changes.
                  </p>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
