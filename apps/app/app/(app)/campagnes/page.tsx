import { EmptyPage } from "@/components/EmptyPage";
import { routeMetadata } from "@/lib/meta";

export const generateMetadata = routeMetadata("campagnes");

export default function Page() {
  return <EmptyPage />;
}
