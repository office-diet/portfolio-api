import dotenv from "dotenv";
import { jwtVerify } from "jose";
import { parse } from "cookie"
import type { AuthInfo } from "../types/types";
dotenv.config();

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function authenticate(cookieHeader: string | undefined): Promise<AuthInfo> {
  const token = parse(cookieHeader ?? "").token;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { visitorId: payload.visitorId as string, visitorName: payload.visitorName as string };
  } catch {
    return null;
  }
}