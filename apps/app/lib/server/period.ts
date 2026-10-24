import "server-only";
import { cookies } from "next/headers";
import { PERIOD_COOKIE, PERIODS, type Period } from "@/lib/period";

export async function currentPeriod(): Promise<Period> {
  const v = (await cookies()).get(PERIOD_COOKIE)?.value as Period | undefined;
  return v && PERIODS.includes(v) ? v : "7d";
}
