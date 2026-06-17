import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { VerificationBanner } from "@/components/auth/verification-banner";
import { Button } from "@/components/ui/button";

export function PageShell({
  children,
  showVerificationBanner = false,
}: {
  children: React.ReactNode;
  showVerificationBanner?: boolean;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      {showVerificationBanner && <VerificationBanner />}
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
      <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
      <p className="mt-3 text-zinc-600">{description}</p>
      {action && (
        <Button className="mt-8" asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
