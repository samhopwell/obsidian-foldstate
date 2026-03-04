import { describe, it, expect } from "vitest";
import {
  hasFoldMarker,
  addFoldMarker,
  removeFoldMarker,
  parseFoldedHeadings,
  updateFoldMarker,
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

describe("updateFoldMarker", () => {
  const content = [
    "# Section A",       // line 0
    "Body text",         // line 1
    "## Section B",      // line 2
    "More text",         // line 3
  ].join("\n");

  it("adds marker to the correct line when folded=true", () => {
    const result = updateFoldMarker(content, 2, true);
    const lines = result.split("\n");
    expect(lines[2]).toBe("## Section B %% fold %%");
    expect(lines[0]).toBe("# Section A"); // unchanged
  });

  it("removes marker from the correct line when folded=false", () => {
    const withMarker = updateFoldMarker(content, 0, true);
    const result = updateFoldMarker(withMarker, 0, false);
    expect(result.split("\n")[0]).toBe("# Section A");
  });

  it("is idempotent when adding marker twice", () => {
    const once = updateFoldMarker(content, 0, true);
    const twice = updateFoldMarker(once, 0, true);
    expect(once).toBe(twice);
  });

  it("returns original content for out-of-bounds lineIndex", () => {
    expect(updateFoldMarker(content, 99, true)).toBe(content);
    expect(updateFoldMarker(content, -1, true)).toBe(content);
  });
});
