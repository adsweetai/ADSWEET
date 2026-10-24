"use server";

import { redirect } from "next/navigation";
import { sendLoginLink } from "@/lib/server/auth";

export async function sendLinkAction(_prev: { error: boolean }, form: FormData): Promise<{ error: boolean }> {
  const res = await sendLoginLink(String(form.get("email") ?? ""));
  if (!res.ok) return { error: true };
  redirect("/inloggen?verstuurd=1");
}
