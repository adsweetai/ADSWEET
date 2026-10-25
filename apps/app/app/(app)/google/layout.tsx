import { requireOnboarded } from "@/lib/server/context";

// Op slot tot de onboarding af is (zie de zijbalk); ook op de server.
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireOnboarded();
  return children;
}
