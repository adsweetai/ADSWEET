"use server";

import { redirect } from "next/navigation";
import { sendLoginLink } from "@/lib/server/auth";

export interface LoginState {
  error?: "ongeldig" | "fout";
  email?: string;
}

export async function requestLoginLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "");
  const next = String(form.get("next") ?? "") || undefined;
  const res = await sendLoginLink(email, next);
  if (!res.ok) return { error: res.error, email };
  redirect("/mail-verstuurd");
}
