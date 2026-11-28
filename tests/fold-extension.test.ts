import { describe, it, expect } from "vitest";
import { setsEqual } from "../src/fold-extension";

describe("setsEqual", () => {
  it("returns true for identical sets", () => {
    expect(setsEqual(new Set([1, 2, 3]), new Set([1, 2, 3]))).toBe(true);
  });

  it("returns true for empty sets", () => {
    expect(setsEqual(new Set(), new Set())).toBe(true);
  });

  it("returns false when sizes differ", () => {
    expect(setsEqual(new Set([1, 2]), new Set([1]))).toBe(false);
  });

  it("returns false when same size but different values", () => {
    expect(setsEqual(new Set([1, 2]), new Set([1, 3]))).toBe(false);
  });
});
