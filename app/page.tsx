import { QueryBrowse } from "@/lib/imports/screens";

export default function Home({ searchParams }: PageProps<"/">) {
  return <QueryBrowse searchParams={searchParams} />;
}
