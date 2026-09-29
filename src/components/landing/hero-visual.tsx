"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { decideThree, type CapabilityInput, type ThreeDecision } from "@/lib/landing/capabilities";
import { HeroFallback } from "./hero-fallback";

/**
 * The scene is a separate chunk that is only requested after the gate has said
 * yes, so it is never part of the first load and there is nothing to download
 * for the users who will not see it.
 */
const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false });

interface NavigatorWithMemory extends Navigator {
  /** Chromium-only hint in GB; absent elsewhere. */
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

function probeWebgl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!context) {
      return false;
    }
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function readCapabilities(prefersReducedMotion: boolean): CapabilityInput {
  const navigator_ = navigator as NavigatorWithMemory;

  return {
    hardwareConcurrency: navigator_.hardwareConcurrency ?? null,
    deviceMemoryGb: navigator_.deviceMemory ?? null,
    saveData: navigator_.connection?.saveData === true,
    prefersReducedMotion,
    webglSupported: probeWebgl(),
  };
}

export function HeroVisual() {
  const [decision, setDecision] = useState<ThreeDecision | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const evaluate = () => setDecision(decideThree(readCapabilities(media.matches)));

    evaluate();
    media.addEventListener("change", evaluate);

    return () => media.removeEventListener("change", evaluate);
  }, []);

  return (
    <div
      aria-label="A resume page with the line the match rests on, checked against the posting's requirements and scored 70 percent in this example."
      className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border/70 bg-card md:aspect-[5/4]"
      data-three={decision?.enabled ? "enabled" : "fallback"}
      data-three-reason={decision?.reason ?? undefined}
      role="img"
    >
      {decision?.enabled ? <HeroScene /> : <HeroFallback />}
    </div>
  );
}
