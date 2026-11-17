import { describe, expect, it } from "vitest";
import { buildMetadata } from "@/lib/seo";

describe("buildMetadata", () => {
  it("returns title, description, canonical and indexable robots", () => {
    const m = buildMetadata({ title: "Men", description: "Shop men", path: "/categories/men" });
    expect(m.title).toBe("Men");
    expect(m.description).toBe("Shop men");
    expect(m.alternates?.canonical).toBe("/categories/men");
    expect(m.robots).toEqual({ index: true, follow: true });
  });

  it("falls back to a non-empty description", () => {
    expect(buildMetadata({ title: "x", description: "", path: "/" }).description).toBeTruthy();
    expect(buildMetadata({ title: "x", description: "   ", path: "/" }).description).toBeTruthy();
  });

  it("falls back to a non-empty title", () => {
    expect(buildMetadata({ title: " ", description: "d", path: "/" }).title).toBeTruthy();
  });
});
