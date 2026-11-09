
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function FacultyDashboard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sessions, setSessions] = useState(0);
  const [requests, setRequests] = useState(0);

  useEffect(() => {
    async function loadDashboard() {
      const auth = await fetch("/api/auth/me");

      if (!auth.ok) {
        router.replace("/login");
        return;
      }

      const authData = await auth.json();

      if (authData.user.role !== "FACULTY") {
        router.replace("/");
        return;
      }

      setEmail(authData.user.email);

      const [attendanceResponse, correctionResponse] = await Promise.all([
        fetch("/api/attendance"),
        fetch("/api/corrections"),
      ]);

      if (attendanceResponse.ok) {
        const data = await attendanceResponse.json();
        setSessions(data.sessions?.length ?? 0);
      }

      if (correctionResponse.ok) {
        const data = await correctionResponse.json();
        const pending = (data.requests ?? []).filter(
          (request: { request_status: string }) =>
            request.request_status === "PENDING"
        );
        setRequests(pending.length);
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
              Faculty Dashboard
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
          Teaching Overview
        </h2>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">Assigned Class Sessions</p>
            <p className="mt-2 text-3xl font-bold">{sessions}</p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">Pending Correction Requests</p>
            <p className="mt-2 text-3xl font-bold">{requests}</p>
          </div>
        </div>

        <h2 className="mt-8 text-xl font-semibold text-slate-800">
          Faculty Actions
        </h2>

        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <a
            href="/attendance"
            className="rounded-xl bg-white p-6 shadow hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold">Manage Attendance</h3>
            <p className="mt-2 text-slate-600">
              View assigned sessions and mark student attendance.
            </p>
          </a>

          <a
            href="/corrections"
            className="rounded-xl bg-white p-6 shadow hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold">Review Corrections</h3>
            <p className="mt-2 text-slate-600">
              Approve or reject student attendance correction requests.
            </p>
          </a>
        </div>
      </div>
    </main>
  );
}
