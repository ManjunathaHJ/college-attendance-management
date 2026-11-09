
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Faculty {
  faculty_id: number;
  employee_id: string;
  full_name: string;
  department: string;
  email: string;
}

export default function AdminFacultyPage() {
  const router = useRouter();

  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    employeeId: "",
    fullName: "",
    department: "AIML",
  });

  async function loadFaculty() {
    try {
      const response = await fetch("/api/faculty");
      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        router.replace("/login");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load faculty");
      }

      setFaculty(data.faculty || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFaculty();
  }, []);

  async function addFaculty(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const response = await fetch("/api/faculty", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to add faculty");
      }

      setMessage("Faculty member added successfully!");

      setForm({
        email: "",
        password: "",
        employeeId: "",
        fullName: "",
        department: "AIML",
      });

      setShowForm(false);
      await loadFaculty();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredFaculty = faculty.filter((member) =>
    [
      member.full_name,
      member.employee_id,
      member.email,
      member.department,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-6xl">

        <a
          href="/admin"
          className="font-semibold text-blue-600 hover:underline"
        >
          ← Back to Admin Dashboard
        </a>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Faculty Management
            </h1>
            <p className="mt-2 text-slate-600">
              View and add faculty members.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            {showForm ? "Cancel" : "+ Add Faculty"}
          </button>
        </div>

        {message && (
          <p className="mt-5 rounded-lg bg-green-100 p-4 text-green-700">
            {message}
          </p>
        )}

        {error && (
          <p className="mt-5 rounded-lg bg-red-100 p-4 text-red-700">
            {error}
          </p>
        )}

        {showForm && (
          <form
            onSubmit={addFaculty}
            className="mt-6 rounded-xl bg-white p-6 shadow"
          >
            <h2 className="mb-5 text-xl font-bold text-slate-800">
              Add New Faculty
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                required
                type="text"
                placeholder="Faculty Full Name"
                value={form.fullName}
                onChange={(e) =>
                  setForm({ ...form, fullName: e.target.value })
                }
                className="rounded-lg border p-3"
              />

              <input
                required
                type="text"
                placeholder="Employee ID"
                value={form.employeeId}
                onChange={(e) =>
                  setForm({ ...form, employeeId: e.target.value })
                }
                className="rounded-lg border p-3"
              />

              <input
                required
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                className="rounded-lg border p-3"
              />

              <input
                required
                type="password"
                minLength={8}
                placeholder="Password (minimum 8 characters)"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                className="rounded-lg border p-3"
              />

              <input
                required
                type="text"
                placeholder="Department"
                value={form.department}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
                className="rounded-lg border p-3"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Adding Faculty..." : "Save Faculty"}
            </button>
          </form>
        )}

        <div className="mt-8 rounded-xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-800">
              All Faculty ({faculty.length})
            </h2>

            <input
              type="text"
              placeholder="Search by name, ID, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border p-3 md:w-80"
            />
          </div>

          {loading ? (
            <p className="mt-6 text-slate-600">Loading faculty...</p>
          ) : filteredFaculty.length === 0 ? (
            <p className="mt-6 text-slate-600">No faculty found.</p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-200 text-slate-700">
                  <tr>
                    <th className="p-4">Employee ID</th>
                    <th className="p-4">Full Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Department</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredFaculty.map((member) => (
                    <tr
                      key={member.faculty_id}
                      className="border-t hover:bg-slate-50"
                    >
                      <td className="p-4 font-medium">
                        {member.employee_id}
                      </td>
                      <td className="p-4">{member.full_name}</td>
                      <td className="p-4">{member.email}</td>
                      <td className="p-4">{member.department}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
