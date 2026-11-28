import { describe, it, expect } from "vitest";
import {
  hasFoldMarker,
  addFoldMarker,
  removeFoldMarker,
  parseFoldedHeadings,
} from "../src/marker";

describe("hasFoldMarker", () => {
  it("detects exact marker", () => {
    expect(hasFoldMarker("## Heading %% fold %%")).toBe(true);
  });

  it("detects marker with extra spaces", () => {
    expect(hasFoldMarker("## Heading  %%  fold  %%  ")).toBe(true);
  });

  it("returns false for lines without marker", () => {
    expect(hasFoldMarker("## Heading")).toBe(false);
    expect(hasFoldMarker("Some text")).toBe(false);
    expect(hasFoldMarker("")).toBe(false);
  });

  it("returns false for partial marker text", () => {
    expect(hasFoldMarker("## Heading %% fold")).toBe(false);
    expect(hasFoldMarker("## Heading fold %%")).toBe(false);
  });
});

describe("addFoldMarker", () => {
  it("appends marker to a heading", () => {
    expect(addFoldMarker("## My Section")).toBe("## My Section %% fold %%");
  });

  it("is idempotent — does not double-add marker", () => {
    const line = "## My Section %% fold %%";
    expect(addFoldMarker(line)).toBe(line);
  });

  it("works on H1 headings", () => {
    expect(addFoldMarker("# Top Level")).toBe("# Top Level %% fold %%");
  });
});

describe("removeFoldMarker", () => {
  it("removes marker from a heading", () => {
    expect(removeFoldMarker("## Heading %% fold %%")).toBe("## Heading");
  });

  it("removes marker with surrounding whitespace variants", () => {
    expect(removeFoldMarker("## Heading  %%  fold  %%  ")).toBe("## Heading");
  });

  it("is a no-op on lines without marker", () => {
    expect(removeFoldMarker("## Heading")).toBe("## Heading");
  });
});

describe("parseFoldedHeadings", () => {
  it("returns empty set for content with no markers", () => {
    const content = "# Heading\n\nSome text\n\n## Another";
    expect(parseFoldedHeadings(content).size).toBe(0);
  });

  it("returns correct 0-indexed line numbers", () => {
    const content = [
      "# First %% fold %%",   // line 0
      "",                       // line 1
      "## Second",              // line 2
      "",                       // line 3
      "## Third %% fold %%",   // line 4
    ].join("\n");

    const result = parseFoldedHeadings(content);
    expect(result).toEqual(new Set([0, 4]));
  });

  it("handles single-line content with marker", () => {
    expect(parseFoldedHeadings("# Only %% fold %%")).toEqual(new Set([0]));
  });
});

