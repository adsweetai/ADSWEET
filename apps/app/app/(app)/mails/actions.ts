"use server";

import { revalidatePath } from "next/cache";
import { MAIL_KINDS, SAMPLES, type MailKind } from "@adsweet/mails";
import { getContext } from "@/lib/server/context";
import { demoPanelEnabled } from "@/lib/server/demo-state";
import { sendMail } from "@/lib/server/mail";
import { runDailyMails } from "@/lib/server/mail-jobs";

/** Demo: de 12 voorbeeldmails naar jezelf, via de testomgeving (postvak, of Resend als die ingesteld is). */
export async function sendSamplesAction(): Promise<number> {
  if (!demoPanelEnabled()) return 0;
  const ctx = await getContext();
  let n = 0;
  for (const kind of MAIL_KINDS as readonly MailKind[]) if (await sendMail(kind, ctx.profile.email, SAMPLES[kind] as never)) n++;
  revalidatePath("/mails");
  return n;
}

/** Demo: draai de dagelijkse mails nu (met het weekrapport erbij). */
export async function runJobsAction() {
  if (!demoPanelEnabled()) return null;
  await getContext();
  const res = await runDailyMails({ weekly: true });
  revalidatePath("/mails");
  return res;
}
