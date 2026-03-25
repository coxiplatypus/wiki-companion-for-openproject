// Overview: Unit tests for the pure depth/branch collapse algorithm used by the wiki controller.
import { describe, expect, it } from "vitest";
import {
  computeAutoCollapsedNodeIds,
  type TocNodeSnapshot
} from "../../src/content/wiki-toc-autocollapse";

describe("computeAutoCollapsedNodeIds", () => {
  it("collapses non-active branches deeper than configured depth", () => {
    const nodes: TocNodeSnapshot[] = [
      { id: "root-1", parentId: null, depth: 0, isActive: false, hasChildren: true },
      { id: "child-1", parentId: "root-1", depth: 1, isActive: false, hasChildren: true },
      { id: "leaf-1", parentId: "child-1", depth: 2, isActive: false, hasChildren: false },
      { id: "root-2", parentId: null, depth: 0, isActive: true, hasChildren: true },
      { id: "child-2", parentId: "root-2", depth: 1, isActive: true, hasChildren: true },
      { id: "leaf-2", parentId: "child-2", depth: 2, isActive: false, hasChildren: false }
    ];

    const collapsed = computeAutoCollapsedNodeIds(nodes, 1);

    expect(collapsed.has("child-1")).toBe(true);
    expect(collapsed.has("root-1")).toBe(false);
    expect(collapsed.has("root-2")).toBe(false);
    expect(collapsed.has("child-2")).toBe(false);
  });

  it("keeps active branch and its ancestors open regardless of configured depth", () => {
    const nodes: TocNodeSnapshot[] = [
      { id: "root", parentId: null, depth: 0, isActive: false, hasChildren: true },
      { id: "level-1", parentId: "root", depth: 1, isActive: false, hasChildren: true },
      { id: "level-2", parentId: "level-1", depth: 2, isActive: false, hasChildren: true },
      { id: "active", parentId: "level-2", depth: 3, isActive: true, hasChildren: true },
      { id: "active-child", parentId: "active", depth: 4, isActive: false, hasChildren: false }
    ];

    const collapsed = computeAutoCollapsedNodeIds(nodes, 1);

    expect(collapsed.has("root")).toBe(false);
    expect(collapsed.has("level-1")).toBe(false);
    expect(collapsed.has("level-2")).toBe(false);
    expect(collapsed.has("active")).toBe(false);
  });
});
