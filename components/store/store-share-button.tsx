"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function StoreShareButton({ slug, name }: { slug: string; name: string }) {
  const share = async () => {
    const url = `${window.location.origin}/stores/${slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, text: `Shop ${name} on SmartShop`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Store link copied");
      }
    } catch (error) {
      // Closing the native share sheet is not a failure that needs alarming UI.
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Could not share the store link. Please try again.");
    }
  };

  return <Button type="button" size="sm" variant="outline" onClick={share}><Share2 className="h-4 w-4" />Share store</Button>;
}
