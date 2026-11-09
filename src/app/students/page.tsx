
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentDashboard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);

  useEffect(() => {
    async function loadDashboard() {
      const auth = await fetch("/api/auth/me");

      if (!auth.ok) {
        router.replace("/login");
        return;
      }

      const authData = await auth.json();

      if (authData.user.role !== "STUDENT") {
        router.replace("/");
        return;
      }

      setEmail(authData.user.email);

      const response = await fetch("/api/attendance");

      if (response.ok) {
        const data = await response.json();
        const sessions = data.sessions ?? [];

        let total = 0;
        let present = 0;

        sessions.forEach((session: {
          students?: { status: string }[];
        }) => {
          (session.students ?? []).forEach((student) => {
            total++;

            if (
              student.status === "PRESENT" ||
              student.status === "LATE"
            ) {
              present++;
            }
          });
        });

        setTotalClasses(total);
        setAttendanceRate(
          total > 0 ? Math.round((present / total) * 100) : 0
        );
      }
    }

    loadDashboard();
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Student Dashboard
            </h1>
            <p className="mt-1 text-slate-600">{email}</p>
          </div>

          <button
            onClick={logout}
            className="rounded-lg bg-red-600 px-5 py-2 text-white hover:bg-red-700"
          >
            Logout
          </button>
        </header>

        <h2 className="mt-8 text-xl font-semibold text-slate-800">
          My Attendance
        </h2>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">
              Attendance Percentage
            </p>
            <p className="mt-2 text-3xl font-bold">
              {attendanceRate}%
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">
              Recorded Classes
            </p>
            <p className="mt-2 text-3xl font-bold">
              {totalClasses}
            </p>
          </div>
        </div>

        {/* Attendance Eligibility Warning */}
        {totalClasses > 0 && (
          <div
            className={`mt-5 rounded-xl p-5 shadow ${
              attendanceRate < 75
                ? "border border-red-300 bg-red-50"
                : "border border-green-300 bg-green-50"
            }`}
          >
            {attendanceRate < 75 ? (
              <>
                <h3 className="text-lg font-bold text-red-700">
                  Attendance Shortage Warning!
                </h3>
                <p className="mt-2 text-red-700">
                  Your attendance is below the required 75%.
                  Please attend more classes to improve your
                  attendance percentage.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-green-700">
                  Attendance Eligible
                </h3>
                <p className="mt-2 text-green-700">
                  Your attendance meets the minimum requirement
                  of 75%.
                </p>
              </>
            )}
          </div>
        )}

        <h2 className="mt-8 text-xl font-semibold text-slate-800">
          Student Actions
        </h2>

        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <a
            href="/my-attendance"
            className="rounded-xl bg-white p-6 shadow hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold">
              View My Attendance
            </h3>
            <p className="mt-2 text-slate-600">
              Check attendance records for your classes.
            </p>
          </a>

          <a
            href="/corrections"
            className="rounded-xl bg-white p-6 shadow hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold">
              Correction Requests
            </h3>
            <p className="mt-2 text-slate-600">
              Submit and track attendance correction requests.
            </p>
          </a>
        </div>
      </div>
    </main>
  );
}
