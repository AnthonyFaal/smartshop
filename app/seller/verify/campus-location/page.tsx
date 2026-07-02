"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { trpc } from "@/lib/trpc/client";

import { PageShell } from "@/components/layout/page-shell";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { MapPin, RotateCcw, CheckCircle2 } from "lucide-react";


type GeoState =
  | { status: "IDLE" }
  | { status: "REQUESTING" }
  | {
      status: "GOT";
      latitude: number;
      longitude: number;
    }
  | {
      status: "ERROR";
      message: string;
    };

type GhanaLocationData = Record<string, Record<string, string[]>>;

const GHANA_LOCATIONS: GhanaLocationData = {
  "Western Region": {
    Tarkwa: [
      "Tarkwa Township",
      "Teberebie",
      "Nsuta",
      "Abosso",
      "Banso",
      "Brahabebome",
      "Akoon",
      "New Atuabo",
      "Samahu",
      "Dompim",
    ],
  },
};


export default function CampusLocationVerifyPage() {
  const router = useRouter();

  const sellerVerificationMutation =
    trpc.auth.sellerVerificationSubmitLocation.useMutation();


  const [geo, setGeo] = useState<GeoState>({
    status: "IDLE",
  });


  const requestedRef = useRef(false);


  const [region, setRegion] = useState<keyof typeof GHANA_LOCATIONS>(
    "Western Region"
  );
  const [city, setCity] = useState(
    () => Object.keys(GHANA_LOCATIONS["Western Region"] ?? {})[0] ?? ""
  );
  const [town, setTown] = useState("");

  const [shopAddress, setShopAddress] = useState("");


  const [submitError, setSubmitError] = useState<string | null>(null);



  function requestLocation() {
    if (!navigator.geolocation) {
      setGeo({
        status: "ERROR",
        message: "Location is not supported on this device.",
      });

      return;
    }


    setSubmitError(null);

    setGeo({
      status: "REQUESTING",
    });


    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeo({
          status: "GOT",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        setGeo({
          status: "ERROR",
          message:
            error.message ||
            "Unable to get your location.",
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000,
      }
    );
  }



  useEffect(() => {
    if (requestedRef.current) return;

    requestedRef.current = true;

    requestLocation();

  }, []);



  const cities = Object.keys(GHANA_LOCATIONS[region] ?? {});

  const towns = GHANA_LOCATIONS[region]?.[city] ?? [];



  const canSubmit = useMemo(() => {

    return (
      geo.status === "GOT" &&
      region &&
      city &&
      town &&
      shopAddress.trim()
    );

  }, [
    geo,
    region,
    city,
    town,
    shopAddress,
  ]);



  return (
    <PageShell showVerificationBanner>

      <div className="mx-auto max-w-xl px-4 py-10">

        <div className="mb-6">

          <h1 className="text-2xl font-bold text-zinc-900">
            Verify shop location
          </h1>

          <p className="mt-1 text-sm text-zinc-600">
            Confirm where your business operates.
          </p>

        </div>



        <Card className="border-zinc-200 shadow-sm">

          <CardHeader>

            <CardTitle>
              Location details
            </CardTitle>

            <CardDescription>
              Select your Ghana location and capture GPS.
            </CardDescription>

          </CardHeader>



          <CardContent className="space-y-5">



            {/* Region */}

            <div className="space-y-2">

              <Label>
                Region
              </Label>


              <select
                value={region}
                onChange={(e) => {
                  const nextRegion = e.target.value as keyof typeof GHANA_LOCATIONS;
                  const nextCities = Object.keys(GHANA_LOCATIONS[nextRegion] ?? {});

                  setRegion(nextRegion);
                  setCity(nextCities[0] ?? "");
                  setTown("");
                }}
                className="h-11 w-full rounded-md border px-3 text-sm"
              >

                {Object.keys(GHANA_LOCATIONS).map((item) => (

                  <option key={item}>
                    {item}
                  </option>

                ))}

              </select>

            </div>



            {/* City */}

            <div className="space-y-2">

              <Label>
                City
              </Label>


              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setTown("");
                }}
                className="h-11 w-full rounded-md border px-3 text-sm"
              >

                <option value="">
                  Select city
                </option>

                {cities.map((item) => (

                  <option key={item} value={item}>
                    {item}
                  </option>

                ))}

              </select>

            </div>




            {/* Town */}

            <div className="space-y-2">

              <Label>
                Town / Community
              </Label>


              <select
                value={town}
                onChange={(e) =>
                  setTown(e.target.value)
                }
                className="h-11 w-full rounded-md border px-3 text-sm"
              >

                <option value="">
                  Select town
                </option>


                {towns.map((item) => (

                  <option key={item} value={item}>
                    {item}
                  </option>

                ))}


              </select>


            </div>




            {/* Address */}

            <div className="space-y-2">

              <Label>
                Shop address
              </Label>


              <Input

                value={shopAddress}

                onChange={(e) =>
                  setShopAddress(e.target.value)
                }

                placeholder="Street, landmark, building"

                className="h-11"

              />

            </div>





            {/* GPS */}

            <div className="rounded-xl bg-zinc-50 p-4">


              <div className="flex items-center justify-between">


                <div className="flex items-center gap-2">

                  <MapPin
                    className="h-5 w-5 text-emerald-600"
                  />

                  <div>

                    <p className="text-sm font-medium">
                      GPS verification
                    </p>


                    <p className="text-xs text-zinc-600">

                      {geo.status === "REQUESTING" &&
                        "Detecting location..."}


                      {geo.status === "IDLE" &&
                        "Waiting..."}


                      {geo.status === "GOT" &&
                        "Location captured"}


                      {geo.status === "ERROR" &&
                        geo.message}

                    </p>

                  </div>

                </div>




                <Button

                  size="sm"

                  variant="outline"

                  onClick={requestLocation}

                  disabled={
                    geo.status === "REQUESTING"
                  }

                >

                  <RotateCcw className="mr-2 h-4 w-4"/>

                  Retry

                </Button>


              </div>


              {geo.status === "GOT" && (

                <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700">

                  <CheckCircle2 className="h-4 w-4"/>

                  GPS ready

                </div>

              )}

            </div>





            {submitError && (

              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">

                {submitError}

              </div>

            )}






            <div className="flex gap-3 pt-2">


              <Button

                variant="outline"

                className="flex-1"

                onClick={() =>
                  router.push("/seller/verify")
                }

              >

                Back

              </Button>





              <Button

                className="flex-1"

                disabled={
                  !canSubmit ||
                  sellerVerificationMutation.isPending
                }


                onClick={async () => {

                  if (geo.status !== "GOT")
                    return;


                  try {

                    setSubmitError(null);


await sellerVerificationMutation.mutateAsync({
                      latitude: geo.latitude,
                      longitude: geo.longitude,
                      shopRegion: region,
                      shopCity: city,
                      shopTown: town,
                      shopAddress,
                    });


                    router.refresh();

                    router.push("/seller/verify");


                  } catch (err) {

                    setSubmitError(
                      err instanceof Error
                        ? err.message
                        : "Submission failed."
                    );

                  }

                }}

              >

                {sellerVerificationMutation.isPending
                  ? "Verifying..."
                  : "Verify location"}

              </Button>


            </div>



          </CardContent>

        </Card>


      </div>

    </PageShell>
  );
}