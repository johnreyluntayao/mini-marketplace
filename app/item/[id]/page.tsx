import { notFound } from "next/navigation";
import { LiveListingDetail } from "@/lib/imports/screens";
import { isUuid } from "@/lib/listings";

export const metadata = { title: "Listing details" };

export default async function ItemPage({ params, searchParams }: PageProps<"/item/[id]">) {
  const [{ id }, { published }] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();
  return <LiveListingDetail key={id} id={id} published={published === "1"} />;
}
