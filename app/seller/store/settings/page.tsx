"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";

type FormState = {
  name: string;
  description: string;
  address: string;
  city: string;
  region: string;
  locationId: string;
  latitude: string;
  longitude: string;
  logoUrl: string;
  bannerUrl: string;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  address: "",
  city: "",
  region: "",
  locationId: "",
  latitude: "",
  longitude: "",
  logoUrl: "",
  bannerUrl: "",
};

export default function StoreSettingsPage() {
  return (
    <Suspense fallback={<main className="flex min-h-[60vh] items-center justify-center">Loading...</main>}>
      <StoreSettingsForm />
    </Suspense>
  );
}

function StoreSettingsForm() {
  const utils = trpc.useUtils();
  const { data: stores, isLoading } = trpc.store.list.useQuery();
  const searchParams = useSearchParams();
  const [storeId, setStoreId] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [locationQuery, setLocationQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestedStoreId = searchParams.get("storeId");
  const selectedStore = stores?.find((store) => store.id === storeId) ?? stores?.find((store) => store.id === requestedStoreId) ?? stores?.[0];
  const locationResults = trpc.location.search.useQuery(
    { query: locationQuery.trim() },
    { enabled: locationQuery.trim().length >= 2 }
  );

  useEffect(() => {
    if (!selectedStore) return;
    queueMicrotask(() => {
      setStoreId(selectedStore.id);
      setForm({
        name: selectedStore.name,
        description: selectedStore.description ?? "",
        address: selectedStore.address ?? "",
        city: selectedStore.city ?? "",
        region: selectedStore.region ?? "",
        locationId: selectedStore.locationId ?? "",
        latitude: selectedStore.latitude == null ? "" : String(selectedStore.latitude),
        longitude: selectedStore.longitude == null ? "" : String(selectedStore.longitude),
        logoUrl: selectedStore.logoUrl ?? "",
        bannerUrl: selectedStore.bannerUrl ?? "",
      });
      setLocationQuery("");
    });
  // The form mirrors the selected server record when a store is loaded/switched.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore?.id]);

  const updateStore = trpc.store.update.useMutation({
    onSuccess: async () => {
      await utils.store.list.invalidate();
      setMessage("Store settings saved.");
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
      setMessage(null);
    },
  });

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (!selectedStore || !form.name.trim() || !form.address.trim()) {
      setError("Store name and address are required.");
      return;
    }

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (!form.locationId || !form.city.trim() || !form.region.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError("Select a location with valid city, region, and coordinates.");
      return;
    }

    updateStore.mutate({
      storeId: selectedStore.id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      address: form.address.trim(),
      city: form.city.trim(),
      region: form.region.trim(),
      locationId: form.locationId,
      latitude,
      longitude,
      logoUrl: form.logoUrl.trim() || null,
      bannerUrl: form.bannerUrl.trim() || null,
    });
  }

  return (
    <PageShell showVerificationBanner>
      <SellerPageShell activeHref="/seller/store">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Store settings</h1>
              <p className="mt-1 text-sm text-zinc-500">Update business details and location information.</p>
            </div>
            <Button asChild variant="outline"><Link href="/seller/store">Back to stores</Link></Button>
          </div>

          {isLoading ? (
            <Card className="mt-6"><CardContent className="flex items-center gap-2 py-10 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Loading stores...</CardContent></Card>
          ) : !stores?.length ? (
            <Card className="mt-6"><CardContent className="py-10 text-center text-sm text-zinc-500">Create a store before editing settings.</CardContent></Card>
          ) : (
            <Card className="mt-6">
              <CardHeader><CardTitle className="text-base">Business details</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={submit} className="space-y-5">
                  <div className="space-y-2"><Label htmlFor="settings-store">Store</Label><Select id="settings-store" value={selectedStore?.id ?? ""} onChange={(e) => setStoreId(e.target.value)}>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</Select></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label htmlFor="settings-name">Name</Label><Input id="settings-name" value={form.name} onChange={(e) => updateField("name", e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="settings-address">Address</Label><Input id="settings-address" value={form.address} onChange={(e) => updateField("address", e.target.value)} /></div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="settings-description">Description</Label><textarea id="settings-description" value={form.description} onChange={(e) => updateField("description", e.target.value)} className="min-h-28 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" /></div>
                  <div className="space-y-2"><Label htmlFor="settings-location">Location</Label><Input id="settings-location" value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} placeholder="Search city or area" />{(locationResults.data ?? []).length > 0 && <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white">{locationResults.data?.map((location) => <button type="button" key={location.id} className="block w-full border-b border-zinc-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-zinc-50" onClick={() => { updateField("locationId", location.id); updateField("city", location.name); updateField("region", location.region ?? ""); updateField("latitude", location.latitude == null ? "" : String(location.latitude)); updateField("longitude", location.longitude == null ? "" : String(location.longitude)); setLocationQuery(location.name); }}>{location.name}<span className="ml-2 text-xs text-zinc-500">{location.region}</span></button>)}</div>}</div>
                  <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="settings-city">City</Label><Input id="settings-city" value={form.city} onChange={(e) => updateField("city", e.target.value)} /></div><div className="space-y-2"><Label htmlFor="settings-region">Region</Label><Input id="settings-region" value={form.region} onChange={(e) => updateField("region", e.target.value)} /></div></div>
                  <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="settings-logo">Logo URL</Label><Input id="settings-logo" value={form.logoUrl} onChange={(e) => updateField("logoUrl", e.target.value)} placeholder="https://..." /></div><div className="space-y-2"><Label htmlFor="settings-banner">Banner URL</Label><Input id="settings-banner" value={form.bannerUrl} onChange={(e) => updateField("bannerUrl", e.target.value)} placeholder="https://..." /></div></div>
                  {message && <p className="text-sm text-emerald-700">{message}</p>}{error && <p className="text-sm text-red-600">{error}</p>}
                  <Button type="submit" disabled={updateStore.isPending}>{updateStore.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save settings</Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
