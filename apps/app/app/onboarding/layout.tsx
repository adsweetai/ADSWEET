import { AppToastProvider } from "@/components/ui";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppToastProvider>{children}</AppToastProvider>;
}
