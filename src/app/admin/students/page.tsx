"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Student {
  student_id: number;
  srn: string;
  full_name: string;
  email: string;
  department: string;
  semester: number;
  section: string;
}

export default function AdminStudentsPage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    srn: "",
    fullName: "",
    department: "AIML",
    semester: "3",
    section: "A",
  });

  async function loadStudents() {
    try {
      const response = await fetch("/api/students");
      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        router.replace("/login");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load students");
      }

      setStudents(data.students || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  async function addStudent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to add student");
      }

      setMessage("Student added successfully!");

      setForm({
        email: "",
        password: "",
        srn: "",
        fullName: "",
        department: "AIML",
        semester: "3",
        section: "A",
      });

      setShowForm(false);
      await loadStudents();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredStudents = students.filter((student) =>
    [
      student.full_name,
      student.srn,
      student.email,
      student.department,
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
              Student Management
            </h1>
            <p className="mt-2 text-slate-600">
              View and add student records.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            {showForm ? "Cancel" : "+ Add Student"}
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
            onSubmit={addStudent}
            className="mt-6 rounded-xl bg-white p-6 shadow"
          >
            <h2 className="mb-5 text-xl font-bold text-slate-800">
              Add New Student
            </h2>

            <div className="grid gap-4 md:grid-cols-2">

              <input
                required
                type="text"
                placeholder="Student Full Name"
                value={form.fullName}
                onChange={(e) =>
                  setForm({ ...form, fullName: e.target.value })
                }
                className="rounded-lg border p-3"
              />

              <input
                required
                type="text"
                placeholder="SRN"
                value={form.srn}
                onChange={(e) =>
                  setForm({ ...form, srn: e.target.value })
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

              <select
                value={form.semester}
                onChange={(e) =>
                  setForm({ ...form, semester: e.target.value })
                }
                className="rounded-lg border p-3"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </select>

              <input
                required
                type="text"
                placeholder="Section"
                value={form.section}
                onChange={(e) =>
                  setForm({ ...form, section: e.target.value })
                }
                className="rounded-lg border p-3"
              />

            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Adding Student..." : "Save Student"}
            </button>
          </form>
        )}

        <div className="mt-8 rounded-xl bg-white p-6 shadow">

          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-800">
              All Students ({students.length})
            </h2>

            <input
              type="text"
              placeholder="Search by name, SRN, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border p-3 md:w-80"
            />
          </div>

          {loading ? (
            <p className="mt-6 text-slate-600">
              Loading students...
            </p>
          ) : filteredStudents.length === 0 ? (
            <p className="mt-6 text-slate-600">
              No students found.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-200 text-slate-700">
                  <tr>
                    <th className="p-4">SRN</th>
                    <th className="p-4">Full Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Semester</th>
                    <th className="p-4">Section</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.student_id}
                      className="border-t hover:bg-slate-50"
                    >
                      <td className="p-4 font-medium">
                        {student.srn}
                      </td>
                      <td className="p-4">
                        {student.full_name}
                      </td>
                      <td className="p-4">
                        {student.email}
                      </td>
                      <td className="p-4">
                        {student.department}
                      </td>
                      <td className="p-4">
                        {student.semester}
                      </td>
                      <td className="p-4">
                        {student.section}
                      </td>
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