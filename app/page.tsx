import Link from "next/link";
import { ArrowRight, Shield, Sparkles, MapPin, Star } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Shield,
    title: "Verified Sellers",
    description:
      "Every seller passes Ghana Card verification, selfie check, and GPS location validation.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Shopping",
    description:
      "Smart search, scam detection, deal alerts, and personalized recommendations.",
  },
  {
    icon: MapPin,
    title: "Local Commerce",
    description:
      "Built for Ghana. Prices in GHS, campus delivery at UMaT, and local payment methods.",
  },
  {
    icon: Star,
    title: "Trust Scores",
    description:
      "Transparent trust ratings based on verification, order history, and buyer reviews.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 to-white px-4 py-20 sm:px-6 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-800">
                <MapPin className="h-4 w-4" />
                Now live at UMaT Campus
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl">
                Ghana&apos;s marketplace,{" "}
                <span className="text-emerald-600">built on trust</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-600">
                SmartShop connects verified buyers and sellers with AI assistance,
                secure payments in GHS, and a trust system designed for local commerce.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/marketplace">
                    Browse Marketplace
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/seller/verify">Start Selling</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6" aria-labelledby="features-heading">
          <div className="mx-auto max-w-7xl">
            <h2 id="features-heading" className="text-center text-3xl font-bold text-zinc-900">
              Why SmartShop?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-zinc-600">
              Designed for Ghanaian commerce with enterprise-grade security and AI at every step.
            </p>
            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
                    <feature.icon className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-emerald-600 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-white">
              Ready to buy or sell?
            </h2>
            <p className="mt-4 text-lg text-emerald-100">
              Join thousands of UMaT students trading safely on SmartShop.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="mt-8"
              asChild
            >
              <Link href="/register">Create free account</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
