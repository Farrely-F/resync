/**
 * Capability gate for the landing hero's WebGL scene.
 *
 * The 3D layer is an enhancement only: it is loaded after the page is
 * interactive, and it is dropped entirely where it would cost more than it
 * gives — constrained hardware, a metered connection, or a stated preference
 * for reduced motion. Nothing here depends on the DOM, so the decision is
 * unit-testable in isolation.
 */

/** Reports at or below this core count are treated as constrained. */
export const MIN_HARDWARE_CONCURRENCY = 4;
/** Reports at or below this much memory (GB) are treated as constrained. */
export const MIN_DEVICE_MEMORY_GB = 4;

export interface CapabilityInput {
  /** `navigator.hardwareConcurrency`; null when the browser does not report it. */
  hardwareConcurrency: number | null;
  /** `navigator.deviceMemory` in GB (Chromium only); null when unreported. */
  deviceMemoryGb: number | null;
  /** `navigator.connection.saveData`. */
  saveData: boolean;
  /** `window.matchMedia("(prefers-reduced-motion: reduce)").matches`. */
  prefersReducedMotion: boolean;
  /** Whether a WebGL context could actually be created. */
  webglSupported: boolean;
}

export type ThreeSkipReason = "reduced-motion" | "save-data" | "no-webgl" | "low-cores" | "low-memory";

export interface ThreeDecision {
  enabled: boolean;
  /** Why the scene was skipped; null when it was enabled. */
  reason: ThreeSkipReason | null;
}

/**
 * Ordered from "user said no" to "this device probably cannot afford it", so the
 * reported reason is the most meaningful one when several apply.
 */
export function decideThree(input: CapabilityInput): ThreeDecision {
  if (input.prefersReducedMotion) {
    return { enabled: false, reason: "reduced-motion" };
  }

  if (input.saveData) {
    return { enabled: false, reason: "save-data" };
  }

  if (!input.webglSupported) {
    return { enabled: false, reason: "no-webgl" };
  }

  // Unreported values are unknown, not zero: an unknown device is not penalised.
  if (input.hardwareConcurrency !== null && input.hardwareConcurrency <= MIN_HARDWARE_CONCURRENCY) {
    return { enabled: false, reason: "low-cores" };
  }

  if (input.deviceMemoryGb !== null && input.deviceMemoryGb <= MIN_DEVICE_MEMORY_GB) {
    return { enabled: false, reason: "low-memory" };
  }

  return { enabled: true, reason: null };
}
