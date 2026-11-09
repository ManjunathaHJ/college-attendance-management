
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    attendanceRate: 0,
    pendingRequests: 0,
  });

  useEffect(() => {
    async function loadDashboard() {
      const auth = await fetch("/api/auth/me");

      if (!auth.ok) {
        router.replace("/login");
        return;
      }

      const authData = await auth.json();

      if (authData.user.role !== "ADMIN") {
        router.replace("/");
        return;
      }

      setUser(authData.user.email);

      const response = await fetch("/api/dashboard");

      if (response.ok) {
        const data = await response.json();
        setStats(data.statistics);
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
              Admin Dashboard
            </h1>
            <p className="mt-1 text-slate-600">{user}</p>
          </div>

          <button
            onClick={logout}
            className="rounded-lg bg-red-600 px-5 py-2 text-white hover:bg-red-700"
          >
            Logout
          </button>
        </header>

        <h2 className="mt-8 text-xl font-semibold text-slate-800">
          System Overview
        </h2>

        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Total Students", stats.totalStudents],
            ["Total Faculty", stats.totalFaculty],
            ["Attendance Rate", `${stats.attendanceRate}%`],
            ["Pending Requests", stats.pendingRequests],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl bg-white p-6 shadow">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-8 text-xl font-semibold text-slate-800">
          Management
        </h2>

        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {[
            ["/admin/students", "Student Management", "View and manage student records."],
            ["/attendance", "Attendance Management", "View class attendance records."],
            ["/corrections", "Correction Requests", "View attendance correction requests."],
            ["/admin/faculty","Faculty Management","View and manage faculty records.",],
          ].map(([href, title, description]) => (
            <a
              key={href}
              href={href}
              className="rounded-xl bg-white p-6 shadow transition hover:shadow-lg"
            >
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-slate-600">{description}</p>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
