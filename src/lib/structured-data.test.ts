import { describe, expect, it } from "vitest";

import { serializeJsonLd, webApplicationJsonLd } from "@/lib/structured-data";

describe("webApplicationJsonLd", () => {
  it("describes a free web application at the site origin", () => {
    const data = webApplicationJsonLd(new URL("https://resync.example"));

    expect(data["@type"]).toBe("WebApplication");
    expect(data.url).toBe("https://resync.example/");
    expect(data.isAccessibleForFree).toBe(true);
    expect(data.offers.price).toBe("0");
  });

  it("carries no rating or review it cannot back up", () => {
    const data = webApplicationJsonLd(new URL("https://resync.example")) as Record<string, unknown>;

    expect(data).not.toHaveProperty("aggregateRating");
    expect(data).not.toHaveProperty("review");
  });
});

describe("serializeJsonLd", () => {
  it("escapes angle brackets so a string cannot close the script tag", () => {
    const out = serializeJsonLd({ name: "</script><b>" });

    expect(out).not.toContain("<");
    expect(JSON.parse(out).name).toBe("</script><b>");
  });
});
