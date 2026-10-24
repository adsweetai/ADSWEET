import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server/auth";

export default async function Home() {
  redirect((await currentUser()) ? "/vandaag" : "/inloggen");
}
