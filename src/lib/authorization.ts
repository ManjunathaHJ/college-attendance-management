import { cookies } from "next/headers";
import { verifyToken, type SessionUser } from "@/lib/auth";

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("attendance_session")?.value;

    if (!token) {
      return null;
    }

    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function hasRole(
  allowedRoles: SessionUser["role"][]
): Promise<SessionUser | null> {
  const user = await getCurrentUser();

  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return user;
}