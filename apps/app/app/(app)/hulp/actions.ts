"use server";

import { requestCall, type CallKind } from "@/lib/server/help";

export async function requestCallAction(kind: CallKind) {
  return requestCall(kind);
}
