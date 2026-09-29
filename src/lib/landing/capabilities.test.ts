import { describe, expect, it } from "vitest";

import { decideThree, type CapabilityInput } from "./capabilities";

const capable: CapabilityInput = {
  hardwareConcurrency: 8,
  deviceMemoryGb: 8,
  saveData: false,
  prefersReducedMotion: false,
  webglSupported: true,
};

describe("decideThree", () => {
  it("enables the scene on a device that reports no constraints", () => {
    expect(decideThree(capable)).toEqual({ enabled: true, reason: null });
  });

  it("treats the thresholds as inclusive skips", () => {
    expect(decideThree({ ...capable, hardwareConcurrency: 4 }).reason).toBe("low-cores");
    expect(decideThree({ ...capable, hardwareConcurrency: 5 }).enabled).toBe(true);
    expect(decideThree({ ...capable, deviceMemoryGb: 4 }).reason).toBe("low-memory");
    expect(decideThree({ ...capable, deviceMemoryGb: 8 }).enabled).toBe(true);
  });

  it("does not penalise values a browser does not report", () => {
    expect(decideThree({ ...capable, hardwareConcurrency: null }).enabled).toBe(true);
    expect(decideThree({ ...capable, deviceMemoryGb: null }).enabled).toBe(true);
  });

  it("skips on a reduced-motion preference even on capable hardware", () => {
    expect(decideThree({ ...capable, prefersReducedMotion: true })).toEqual({
      enabled: false,
      reason: "reduced-motion",
    });
  });

  it("skips on save-data even when hardware is capable", () => {
    expect(decideThree({ ...capable, saveData: true })).toEqual({ enabled: false, reason: "save-data" });
  });

  it("skips without a WebGL context", () => {
    expect(decideThree({ ...capable, webglSupported: false })).toEqual({ enabled: false, reason: "no-webgl" });
  });

  it("reports user intent ahead of the hardware reasons", () => {
    const constrained = { ...capable, hardwareConcurrency: 2, saveData: true, prefersReducedMotion: true };
    expect(decideThree(constrained).reason).toBe("reduced-motion");
    expect(decideThree({ ...constrained, prefersReducedMotion: false }).reason).toBe("save-data");
    expect(decideThree({ ...constrained, prefersReducedMotion: false, saveData: false }).reason).toBe("low-cores");
  });
});
