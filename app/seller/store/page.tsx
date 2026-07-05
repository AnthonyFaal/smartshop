"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Plus, Store as StoreIcon } from "lucide-react";

import { GHANA_REGIONS } from "@/lib/ghana/regions";


import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";

type StoreForm = {
  name: string;
  description: string;

  // Branding
  logoUrl: string;
  bannerUrl: string;

  // Location (Ghana-only)
  address: string;
  region: string;
  city: string;
  town: string;
  country: "Ghana";

  latitude: number | null;
  longitude: number | null;
};

const initialForm: StoreForm = {
  name: "",
  description: "",

  logoUrl: "",
  bannerUrl: "",

  address: "",
  region: "",
  city: "",
  town: "",
  country: "Ghana",

  latitude: null,
  longitude: null,
};



function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function SellerStorePage() {
  const utils = trpc.useUtils();
  const { data: dashboard } = trpc.auth.sellerDashboard.useQuery();
  const { data: stores, isLoading: storesLoading } = trpc.store.list.useQuery();

  const [form, setForm] = useState<StoreForm>(initialForm);

  // Note: Store model only has `city` and `region` fields.
  // UX mapping:
  // - “Developed municipality” (stored in DB `city`)
  // - “Area/Town under it” (stored in DB `town`, appended into `city` as "Municipality, Area")



  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);



  const selectedRegion = useMemo(
    () => GHANA_REGIONS.find((r) => r.name === form.region) ?? null,
    [form.region]
  );

  const selectedCity = useMemo(() => {
    if (!selectedRegion) return null;
    return selectedRegion.cities.find((c) => c.name === form.city) ?? null;
  }, [selectedRegion, form.city]);

  const cityTowns = selectedCity?.towns ?? [];



  const createStore = trpc.store.create.useMutation({
    onSuccess: async () => {
      await utils.store.list.invalidate();
      await utils.auth.sellerDashboard.invalidate();
    },
  });

  const storeList = stores ?? [];
  const locationReady =
    form.address.trim().length > 0 &&
    form.region.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.latitude != null &&
    form.longitude != null;

  const canSubmit = form.name.trim().length >= 2 && locationReady && !createStore.isPending;


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.name.trim()) {
      setError("Store name is required.");
      return;
    }

    try {
      const sanitizeOptionalString = (v: string) => v.trim() || undefined;

      if (!form.address.trim()) {
        setError("Address is required.");
        return;
      }
      if (!form.region.trim()) {
        setError("Region is required.");
        return;
      }
      if (!form.city.trim()) {
        setError("Developed municipality / area is required.");
        return;
      }
      if (form.latitude == null || form.longitude == null) {
        setError("Location coordinates could not be determined.");
        return;
      }

      const store = await createStore.mutateAsync({
        name: form.name.trim(),
        description: sanitizeOptionalString(form.description),
        logoUrl: sanitizeOptionalString(form.logoUrl),
        bannerUrl: sanitizeOptionalString(form.bannerUrl),
        address: form.address.trim(),
        city: `${form.city}${form.town ? `, ${form.town}` : ""}`.trim(),
        region: form.region.trim(),
        country: "Ghana",
        latitude: form.latitude,
        longitude: form.longitude,
      });




      setForm(initialForm);
      setSuccess(`${store.name} was created.`);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to create store right now."));
    }
  };

  return (
    <PageShell showVerificationBanner>
      <SellerPageShell activeHref="/seller/store">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Stores</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Create and manage the stores connected to your seller account.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/seller">Back to dashboard</Link>
            </Button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create store</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="store-name">Store name</Label>
                    <Input
                      id="store-name"
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Example: Ama's Fashion"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="store-description">Description</Label>
                    <textarea
                      id="store-description"
                      className="min-h-28 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder="What do you sell?"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="store-logo">Logo (optional)</Label>
                      <input
                        id="store-logo"
                        type="file"
                        accept="image/*"
                        className="block w-full text-sm text-zinc-700 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const pathPrefix = `stores/${new Date().toISOString()}`;

                          const fd = new FormData();
                          fd.set("file", file);
                          fd.set("pathPrefix", pathPrefix);
                          fd.set("bucketType", "avatar");

                          try {
                            const res = await fetch("/api/uploads/public-image", {
                              method: "POST",
                              body: fd,
                            });
                            const json: { publicUrl?: string; error?: string } =
                              await res.json();
                            if (!res.ok || !json.publicUrl) {
                              setError(json.error ?? "Logo upload failed.");
                              return;
                            }
                            setForm((current) => ({
                              ...current,
                              logoUrl: json.publicUrl ?? "",
                            }));
                          } catch {
                            setError("Logo upload failed.");
                          }
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="store-banner">Banner (optional)</Label>
                      <input
                        id="store-banner"
                        type="file"
                        accept="image/*"
                        className="block w-full text-sm text-zinc-700 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const pathPrefix = `stores/${new Date().toISOString()}`;

                          const fd = new FormData();
                          fd.set("file", file);
                          fd.set("pathPrefix", pathPrefix);
                          fd.set("bucketType", "product");

                          try {
                            const res = await fetch("/api/uploads/public-image", {
                              method: "POST",
                              body: fd,
                            });
                            const json: { publicUrl?: string; error?: string } =
                              await res.json();
                            if (!res.ok || !json.publicUrl) {
                              setError(json.error ?? "Banner upload failed.");
                              return;
                            }
                            setForm((current) => ({
                              ...current,
                              bannerUrl: json.publicUrl ?? "",
                            }));
                          } catch {
                            setError("Banner upload failed.");
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="store-address">Address</Label>
                      <Input
                        id="store-address"
                        value={form.address}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            address: event.target.value,
                          }))
                        }
                        placeholder="Street / market area"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="store-region">Region</Label>
                      <select
                        id="store-region"
                        className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                        value={form.region}
                        onChange={(e) => {
                          const regionName = e.target.value;
                          const region = GHANA_REGIONS.find(
                            (r) => r.name === regionName
                          );

                          const firstCity = region?.cities?.[0];
                          const firstTown = firstCity?.towns?.[0];

                          const nextCityName = firstCity?.name ?? "";
                          const nextTownName = firstTown?.name ?? "";

                          const coord = firstTown
                            ? { latitude: firstTown.latitude, longitude: firstTown.longitude }
                            : firstCity
                              ? { latitude: firstCity.latitude, longitude: firstCity.longitude }
                              : { latitude: null, longitude: null };

                          setForm((current) => ({
                            ...current,
                            region: regionName,
                            city: nextCityName,
                            town: nextTownName,
                            latitude: coord.latitude,
                            longitude: coord.longitude,
                          }));
                        }}
                      >
                        <option value="" disabled>
                          Select a region
                        </option>
                        {GHANA_REGIONS.map((region) => (
                          <option key={region.name} value={region.name}>
                            {region.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="store-city">Developed municipality</Label>
                      <select
                        id="store-city"
                        className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                        value={form.city}
                        disabled={!form.region}
                        onChange={(e) => {
                          const cityName = e.target.value;
                          const region = GHANA_REGIONS.find(
                            (r) => r.name === form.region
                          );
                          const city = region?.cities?.find(
                            (c) => c.name === cityName
                          );
                          const firstTown = city?.towns?.[0];

                          const nextTownName = firstTown?.name ?? "";
                          const coord = firstTown
                            ? { latitude: firstTown.latitude, longitude: firstTown.longitude }
                            : city
                              ? { latitude: city.latitude, longitude: city.longitude }
                              : { latitude: null, longitude: null };

                          setForm((current) => ({
                            ...current,
                            city: cityName,
                            town: nextTownName,
                            latitude: coord.latitude,
                            longitude: coord.longitude,
                          }));
                        }}
                      >
                        <option value="" disabled>
                          Select a developed municipality
                        </option>
                        {(selectedRegion?.cities ?? []).map((city) => (
                          <option key={city.name} value={city.name}>
                            {city.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="store-town">Area (town under it)</Label>
                      <select
                        id="store-town"
                        className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                        value={form.town}
                        disabled={!form.region || !form.city}
                        onChange={(e) => {
                          const townName = e.target.value;
                          const region = GHANA_REGIONS.find(
                            (r) => r.name === form.region
                          );
                          const city = region?.cities?.find(
                            (c) => c.name === form.city
                          );
                          const town = city?.towns?.find(
                            (t) => t.name === townName
                          );

                          setForm((current) => ({
                            ...current,
                            town: townName,
                            latitude: town?.latitude ?? current.latitude,
                            longitude: town?.longitude ?? current.longitude,
                          }));
                        }}
                      >
                        <option value="">
                          {(() => {
                            const region = GHANA_REGIONS.find(
                              (r) => r.name === form.region
                            );
                            const city = region?.cities?.find(
                              (c) => c.name === form.city
                            );
                          return city?.towns && city.towns.length > 0
                            ? "Select an area"
                            : "No areas available";
                        })()}
                        </option>

                        {(cityTowns ?? []).map((town) => (
                          <option key={town.name} value={town.name}>
                            {town.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>



                  {error ? <p className="text-sm text-red-600">{error}</p> : null}
                  {success ? (
                    <p className="text-sm text-emerald-700">{success}</p>
                  ) : null}

                  <Button type="submit" className="w-full" disabled={!canSubmit}>
                    {createStore.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Create store
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                  <StoreIcon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Your stores</CardTitle>
                  <p className="text-sm text-zinc-500">
                    Products live: {dashboard?.metrics.productsLive ?? 0}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                {storesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading stores...
                  </div>
                ) : storeList.length > 0 ? (
                  <div className="space-y-3">
                    {storeList.map((store) => (
                      <div
                        key={store.id}
                        className="rounded-lg border border-zinc-200 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="font-medium text-zinc-900">
                                {store.name}
                              </h2>
                              {store.verificationStatus? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">
                              /{store.slug}
                            </p>
                            {store.description ? (
                              <p className="mt-2 text-sm text-zinc-600">
                                {store.description}
                              </p>
                            ) : null}
                          </div>
                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                            {store.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-md bg-zinc-50 p-3">
                            <p className="text-xs text-zinc-500">Products</p>
                            <p className="font-medium text-zinc-900">
                              {store.productCount}
                            </p>
                          </div>
                          <div className="rounded-md bg-zinc-50 p-3">
                            <p className="text-xs text-zinc-500">Followers</p>
                            <p className="font-medium text-zinc-900">
                              {store.followerCount}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center">
                    <StoreIcon className="mx-auto h-8 w-8 text-zinc-400" />
                    <p className="mt-3 text-sm font-medium text-zinc-900">
                      No stores yet
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Create your first store to start listing products.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
