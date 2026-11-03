import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { ProductCard } from "@/components/marketplace/product-card";
import { StoreShareButton } from "@/components/store/store-share-button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function PublicStorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await prisma.store.findFirst({
    where: { slug, isActive: true, deletedAt: null, verificationStatus: "VERIFIED" },
    select: {
      name: true, slug: true, description: true, city: true, region: true,
      productCount: true, verificationStatus: true,
      products: {
        where: { status: "ACTIVE", deletedAt: null, category: { isActive: true } },
        orderBy: { createdAt: "desc" }, take: 50,
        select: { id: true, title: true, slug: true, price: true, comparePrice: true, images: true, rating: true },
      },
    },
  });
  if (!store) notFound();

  const products = store.products.map((product) => ({
    ...product, price: Number(product.price), comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
    rating: Number(product.rating), store: { name: store.name, slug: store.slug, verificationStatus: store.verificationStatus },
  }));

  return <PageShell><main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
    <div className="flex flex-col gap-4 border-b border-zinc-200 pb-7 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex items-center gap-2"><h1 className="text-3xl font-bold text-zinc-900">{store.name}</h1><Badge variant="outline" className="text-emerald-700">Verified seller</Badge></div>{store.description ? <p className="mt-2 max-w-2xl text-zinc-600">{store.description}</p> : null}<p className="mt-2 text-sm text-zinc-500">{[store.city, store.region].filter(Boolean).join(", ")} · {products.length} available product{products.length === 1 ? "" : "s"}</p></div>
      <StoreShareButton slug={store.slug} name={store.name} />
    </div>
    {products.length ? <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="py-16 text-center text-zinc-500">This verified store has no available products right now.</div>}
  </main></PageShell>;
}
