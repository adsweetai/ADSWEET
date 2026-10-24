"use server";

import { revalidatePath } from "next/cache";
import { markLessonRead } from "@/lib/server/academy";

export async function markReadAction(id: string) {
  await markLessonRead(id);
  revalidatePath("/academy");
}
