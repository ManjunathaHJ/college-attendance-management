
const BASE_URL = "http://localhost:3000";

const accounts = [
  { role: "ADMIN", email: "admin@college.edu", password: "Admin@12345" },
  { role: "FACULTY", email: "faculty@college.edu", password: "Faculty@12345" },
  { role: "STUDENT", email: "student1@college.edu", password: "Student@12345" },
];

let passed = 0;
let failed = 0;

function check(name, condition, details = "") {
  if (condition) {
    passed++;
    console.log(`PASS: ${name}`);
  } else {
    failed++;
    console.log(`FAIL: ${name} ${details}`);
  }
}

async function login(account) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: account.email,
      password: account.password,
    }),
  });

  const cookies = response.headers.getSetCookie?.() ?? [];
  const cookie = cookies.map((c) => c.split(";")[0]).join("; ");

  return { response, cookie };
}

async function request(path, cookie, method = "GET", body = undefined) {
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

async function main() {
  console.log("\nCOLLEGE ATTENDANCE SYSTEM - ROLE ACCESS TESTS\n");

  // Unauthenticated access
  check(
    "Unauthenticated student API returns 401",
    (await request("/api/students", "")).status === 401
  );

  check(
    "Unauthenticated attendance API returns 401",
    (await request("/api/attendance", "")).status === 401
  );

  check(
    "Unauthenticated correction API returns 401",
    (await request("/api/corrections", "")).status === 401
  );

  check(
    "Unauthenticated sessions API returns 401",
    (await request("/api/sessions", "")).status === 401
  );

  const sessions = {};

  // Login tests
  for (const account of accounts) {
    const result = await login(account);

    check(
      `${account.role} login succeeds`,
      result.response.status === 200
    );

    sessions[account.role] = result.cookie;
  }

  if (Object.values(sessions).some((cookie) => !cookie)) {
    console.log("\nA login failed. Check credentials and login API.");
    process.exitCode = 1;
    return;
  }

  // Students API
  check(
    "Admin can access students API",
    (await request("/api/students", sessions.ADMIN)).status === 200
  );

  check(
    "Faculty cannot access students API",
    (await request("/api/students", sessions.FACULTY)).status === 403
  );

  check(
    "Student cannot access students API",
    (await request("/api/students", sessions.STUDENT)).status === 403
  );

  // Attendance GET
  check(
    "Admin can view attendance",
    (await request("/api/attendance", sessions.ADMIN)).status === 200
  );

  check(
    "Faculty can view assigned attendance",
    (await request("/api/attendance", sessions.FACULTY)).status === 200
  );

  check(
    "Student can access own attendance records",
    (await request("/api/attendance", sessions.STUDENT)).status === 200
  );

  // Attendance POST permissions
  check(
    "Admin cannot submit attendance",
    (
      await request("/api/attendance", sessions.ADMIN, "POST", {})
    ).status === 403
  );

  check(
    "Student cannot submit attendance",
    (
      await request("/api/attendance", sessions.STUDENT, "POST", {})
    ).status === 403
  );

  check(
    "Faculty attendance POST passes role check",
    (
      await request("/api/attendance", sessions.FACULTY, "POST", {})
    ).status === 400
  );

  // Sessions GET
  check(
    "Admin can access sessions API",
    (await request("/api/sessions", sessions.ADMIN)).status === 200
  );

  check(
    "Faculty can access assigned sessions API",
    (await request("/api/sessions", sessions.FACULTY)).status === 200
  );

  check(
    "Student cannot access sessions API",
    (await request("/api/sessions", sessions.STUDENT)).status === 403
  );

  // Sessions POST permissions
  check(
    "Admin cannot create class sessions",
    (
      await request("/api/sessions", sessions.ADMIN, "POST", {})
    ).status === 403
  );

  check(
    "Student cannot create class sessions",
    (
      await request("/api/sessions", sessions.STUDENT, "POST", {})
    ).status === 403
  );

  check(
    "Faculty session creation passes role check",
    (
      await request("/api/sessions", sessions.FACULTY, "POST", {})
    ).status === 400
  );

  // Correction API GET
  check(
    "Admin can view correction requests",
    (await request("/api/corrections", sessions.ADMIN)).status === 200
  );

  check(
    "Faculty can view assigned-class correction requests",
    (await request("/api/corrections", sessions.FACULTY)).status === 200
  );

  check(
    "Student can view own correction requests",
(await request("/api/corrections", sessions.STUDENT)).status === 200
  );

  // Summary
  console.log("\n------------------------------------");
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log("------------------------------------");

  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Test execution error:", error);
  process.exitCode = 1;
});
