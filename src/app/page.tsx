"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkUser() {
      try {
        const response = await fetch("/api/auth/me");

        if (!response.ok) {
          router.replace("/login");
          return;
        }

        const data = await response.json();

        if (data.user.role === "ADMIN") {
          router.replace("/admin");
        } else if (data.user.role === "FACULTY") {
          router.replace("/faculty");
        } else if (data.user.role === "STUDENT") {
          router.replace("/students");
        } else {
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      }
    }

    checkUser();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100">
      <p className="text-lg font-semibold text-slate-700">
        Loading your dashboard...
      </p>
    </main>
  );
}