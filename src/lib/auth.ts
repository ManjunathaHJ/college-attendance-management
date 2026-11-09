import { SignJWT, jwtVerify } from "jose";

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET is not configured");
}

const secretKey = new TextEncoder().encode(secret);

export interface SessionUser {
  userId: number;
  email: string;
  role: "ADMIN" | "FACULTY" | "STUDENT";
}

export async function createToken(user: SessionUser) {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);

    if (
      typeof payload.userId !== "number" ||
      typeof payload.email !== "string" ||
      !["ADMIN", "FACULTY", "STUDENT"].includes(String(payload.role))
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role as SessionUser["role"],
    };
  } catch {
    return null;
  }
}