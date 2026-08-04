"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/format";
import { ShieldCheck, Star } from "lucide-react";

type VerificationStatus = "PENDING" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "SUSPENDED";

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    slug: string;
    price: number | { toString(): string };
    images: string[];
    rating: number | { toString(): string };
    comparePrice?: number | { toString(): string } | null;
    store: {
      name: string;
      slug: string;
      verificationStatus: VerificationStatus;
    };
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const price = Number(product.price);
  const comparePrice = product.comparePrice
    ? Number(product.comparePrice)
    : null;
  const rating = Number(product.rating);
  const imageUrl = product.images[0] ?? "/placeholder-product.png";
  const discount =
    comparePrice && comparePrice > price
      ? Math.round(((comparePrice - price) / comparePrice) * 100)
      : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        href={`/products/${product.id}`}
        className="group block overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <div className="relative aspect-square overflow-hidden bg-zinc-100">
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width:768px) 50vw, 25vw"
          />
          {discount && (
            <Badge className="absolute left-2 top-2" variant="destructive">
              -{discount}%
            </Badge>
          )}
        </div>
        <div className="space-y-2 p-4">
          <h3 className="line-clamp-2 text-sm font-medium text-zinc-900 group-hover:text-emerald-700">
            {product.title}
          </h3>
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <span>{product.store.name}</span>
            {product.store.verificationStatus === "VERIFIED" && (
              <ShieldCheck className="h-3 w-3 text-blue-500" aria-label="Verified store" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-emerald-700">
                {formatCurrency(price)}
              </span>
              {comparePrice && (
                <span className="text-xs text-zinc-400 line-through">
                  {formatCurrency(comparePrice)}
                </span>
              )}
            </div>
            {rating > 0 && (
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {rating.toFixed(1)}
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
