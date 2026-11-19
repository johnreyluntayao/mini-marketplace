import { notFound } from "next/navigation";
import { QueryBrowse } from "@/lib/imports/screens";
import { categories, findCategory } from "@/lib/listings";

export function generateStaticParams() {
  return categories.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/category/[slug]">) {
  const { slug } = await params;
  return { title: findCategory(slug)?.label ?? "Category" };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/category/[slug]">) {
  const { slug } = await params;
  const category = findCategory(slug);
  if (!category) notFound();

  return <QueryBrowse category={category} searchParams={searchParams} />;
}
