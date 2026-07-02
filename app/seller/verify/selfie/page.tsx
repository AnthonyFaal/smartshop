"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import { trpc } from "@/lib/trpc/client";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Challenge = "BLINK" | "SMILE" | "TURN_LEFT" | "TURN_RIGHT";

const ALL_CHALLENGES: Challenge[] = [
  "BLINK",
  "SMILE",
  "TURN_LEFT",
  "TURN_RIGHT",
];

function randomChallenges() {
  return [...ALL_CHALLENGES]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
}

export default function SelfieVerifyPage() {
  const router = useRouter();

  const mutation =
    trpc.auth.sellerVerificationUpsertSelfieFrame.useMutation();

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<FaceLandmarker | null>(null);

  const runningRef = useRef(false);
  const busyRef = useRef(false);

  const blinkClosedRef = useRef(false);

  const challengeRef = useRef<Challenge[]>([]);
  const indexRef = useRef(0);

  const [challenge, setChallenge] = useState<Challenge[]>([]);
  const [index, setIndex] = useState(0);

  const [cameraReady, setCameraReady] = useState(false);
  const [detectorReady, setDetectorReady] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");

  const current =
    challengeRef.current[indexRef.current] ?? "BLINK";


  const label = useMemo(() => {
    switch (current) {
      case "BLINK":
        return "Blink twice";

      case "SMILE":
        return "Smile";

      case "TURN_LEFT":
        return "Turn left";

      case "TURN_RIGHT":
        return "Turn right";

      default:
        return "";
    }
  }, [current]);


  useEffect(() => {
    const c = randomChallenges();

    challengeRef.current = c;
    setChallenge(c);
  }, []);


  async function setup() {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 720 },
            height: { ideal: 720 },
          },
          audio: false,
        });


      streamRef.current = stream;

      const video = videoRef.current;

      if (!video)
        throw new Error("Video unavailable");


      video.srcObject = stream;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
      });


      await video.play();

      setCameraReady(true);


      const vision =
        await FilesetResolver.forVisionTasks(
          "/mediapipe/wasm"
        );


      const detector =
        await FaceLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                "/mediapipe/face_landmarker.task",
            },

            runningMode: "VIDEO",
            numFaces: 1,
          }
        );


      detectorRef.current = detector;
      setDetectorReady(true);

      runningRef.current = true;

    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Camera error"
      );
    }
  }


  useEffect(() => {
    setup();

    return () => {
      runningRef.current = false;

      streamRef.current
        ?.getTracks()
        .forEach((t) => t.stop());
    };
  }, []);



  function finishChallenge() {

    if (busyRef.current)
      return;


    busyRef.current = true;


    const next =
      indexRef.current + 1;


    setTimeout(() => {

      busyRef.current = false;


      if (
        next >= challengeRef.current.length
      ) {

        setCompleted(true);
        return;
      }


      indexRef.current = next;
      setIndex(next);

    }, 800);
  }



  function detectFace(points: any[]) {

    if (busyRef.current)
      return;


    const task =
      challengeRef.current[indexRef.current];


    const leftEyeTop = points[159];
    const leftEyeBottom = points[145];

    const mouthTop = points[13];
    const mouthBottom = points[14];


    const nose = points[1];

    /*
      MediaPipe coordinates:
      x = 0 left side of raw camera
      x = 1 right side of raw camera

      Since selfie preview is mirrored:
      User turning LEFT makes nose move RIGHT.
    */

    if (task === "BLINK") {

      const eye =
        Math.abs(
          leftEyeTop.y -
          leftEyeBottom.y
        );


      if (eye < 0.012) {
        blinkClosedRef.current = true;
      }


      if (
        blinkClosedRef.current &&
        eye > 0.022
      ) {

        blinkClosedRef.current = false;

        finishChallenge();
      }
    }



    if (task === "SMILE") {

      const mouth =
        Math.abs(
          mouthTop.y -
          mouthBottom.y
        );


      if (mouth > 0.035)
        finishChallenge();
    }



    if (task === "TURN_LEFT") {

      if (nose.x > 0.58)
        finishChallenge();

    }



    if (task === "TURN_RIGHT") {

      if (nose.x < 0.42)
        finishChallenge();

    }

  }



  useEffect(() => {

    if (
      !cameraReady ||
      !detectorReady
    )
      return;


    let raf = 0;
    let last = -1;


    function loop() {

      if (!runningRef.current)
        return;


      const video =
        videoRef.current;


      const detector =
        detectorRef.current;


      if (
        !video ||
        !detector ||
        video.readyState < 2
      ) {

        raf =
          requestAnimationFrame(loop);

        return;
      }



      if (
        video.currentTime !== last &&
        !busyRef.current
      ) {

        last =
          video.currentTime;


        try {

          const result =
            detector.detectForVideo(
              video,
              performance.now()
            );


          if (
            result.faceLandmarks?.length
          ) {

            detectFace(
              result.faceLandmarks[0]
            );

          }


        } catch (e) {

          console.log(e);

        }

      }


      raf =
        requestAnimationFrame(loop);
    }


    raf =
      requestAnimationFrame(loop);


    return () =>
      cancelAnimationFrame(raf);


  }, [
    cameraReady,
    detectorReady,
  ]);



  function captureCanvas() {
    const video =
      videoRef.current;

    if (!video)
      throw new Error("No camera");

    const canvas =
      document.createElement("canvas");

    canvas.width =
      video.videoWidth;

    canvas.height =
      video.videoHeight;

    canvas
      .getContext("2d")
      ?.drawImage(
        video,
        0,
        0
      );

    return canvas;
  }

  async function captureSelfieFile() {
    const canvas = captureCanvas();
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b),
        "image/jpeg",
        0.9
      );
    });

    if (!blob) throw new Error("Failed to capture selfie");

    return new File([blob], "selfie.jpg", {
      type: "image/jpeg",
    });
  }




  return (
    <PageShell showVerificationBanner>

      <div className="mx-auto max-w-xl px-5 py-10">

        <Card>

          <CardHeader>

            <CardTitle>
              Selfie verification
            </CardTitle>

          </CardHeader>


          <CardContent className="space-y-5">


            <div className="overflow-hidden rounded-xl bg-black">

              <video
                ref={videoRef}
                playsInline
                muted
                className="h-96 w-full object-cover"
              />

            </div>



            <div className="text-center">

              <p className="font-medium">

                {completed
                  ? "Verified"
                  : label}

              </p>


              <p className="text-sm text-zinc-500">

                {completed
                  ? "Ready"
                  : `${index + 1}/${challenge.length}`}

              </p>

            </div>



            {error && (
              <p className="text-sm text-red-600">
                {error}
              </p>
            )}



            <div className="flex gap-3">

              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    "/seller/verify"
                  )
                }
              >
                Back
              </Button>



              <Button
                className="flex-1"
                disabled={
                  !completed ||
                  mutation.isPending
                }
                onClick={async () => {

                  const selfieFile =
                    await captureSelfieFile();

                  const data = new FormData();
                  data.append("file", selfieFile);
                  data.append(
                    "pathPrefix",
                    "seller-verification/selfie"
                  );

                  const res = await fetch(
                    "/api/uploads/public-image",
                    {
                      method: "POST",
                      body: data,
                    }
                  );

                  if (!res.ok) {
                    throw new Error("Selfie upload failed");
                  }

                  const json = (await res.json()) as {
                    publicUrl: string;
                  };

                  await mutation.mutateAsync({
                    selfieUrl: json.publicUrl,
                  });




                  router.push(
                    "/seller/verify"
                  );
                }}
              >

                Submit

              </Button>


            </div>


          </CardContent>

        </Card>

      </div>

    </PageShell>
  );
}