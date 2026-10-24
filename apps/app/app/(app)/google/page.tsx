import { EmptyPage } from "@/components/EmptyPage";
import { routeMetadata } from "@/lib/meta";

export const generateMetadata = routeMetadata("google");

export default function Page() {
  return <EmptyPage />;
}
