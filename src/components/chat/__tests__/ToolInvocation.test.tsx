import { test, expect, afterEach, describe } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocation, getToolInvocationLabel } from "../ToolInvocation";

afterEach(() => {
  cleanup();
});

describe("getToolInvocationLabel", () => {
  test("describes creating a file (in progress)", () => {
    const label = getToolInvocationLabel(
      {
        toolName: "str_replace_editor",
        args: { command: "create", path: "/Card.jsx" },
      },
      false
    );
    expect(label).toBe("Creating Card.jsx");
  });

  test("describes creating a file (completed)", () => {
    const label = getToolInvocationLabel(
      {
        toolName: "str_replace_editor",
        args: { command: "create", path: "/Card.jsx" },
      },
      true
    );
    expect(label).toBe("Created Card.jsx");
  });

  test("uses only the basename of a nested path", () => {
    const label = getToolInvocationLabel(
      {
        toolName: "str_replace_editor",
        args: { command: "create", path: "/components/ui/Button.tsx" },
      },
      true
    );
    expect(label).toBe("Created Button.tsx");
  });

  test("describes str_replace as editing", () => {
    expect(
      getToolInvocationLabel(
        {
          toolName: "str_replace_editor",
          args: { command: "str_replace", path: "/App.jsx" },
        },
        false
      )
    ).toBe("Editing App.jsx");
    expect(
      getToolInvocationLabel(
        {
          toolName: "str_replace_editor",
          args: { command: "str_replace", path: "/App.jsx" },
        },
        true
      )
    ).toBe("Edited App.jsx");
  });

  test("describes insert as editing", () => {
    expect(
      getToolInvocationLabel(
        {
          toolName: "str_replace_editor",
          args: { command: "insert", path: "/App.jsx" },
        },
        true
      )
    ).toBe("Edited App.jsx");
  });

  test("describes viewing a file", () => {
    expect(
      getToolInvocationLabel(
        {
          toolName: "str_replace_editor",
          args: { command: "view", path: "/App.jsx" },
        },
        false
      )
    ).toBe("Viewing App.jsx");
  });

  test("describes reverting a file", () => {
    expect(
      getToolInvocationLabel(
        {
          toolName: "str_replace_editor",
          args: { command: "undo_edit", path: "/App.jsx" },
        },
        true
      )
    ).toBe("Reverted App.jsx");
  });

  test("describes renaming via file_manager", () => {
    const label = getToolInvocationLabel(
      {
        toolName: "file_manager",
        args: {
          command: "rename",
          path: "/Card.jsx",
          new_path: "/ProductCard.jsx",
        },
      },
      false
    );
    expect(label).toBe("Renaming Card.jsx to ProductCard.jsx");
  });

  test("describes deleting via file_manager", () => {
    const label = getToolInvocationLabel(
      {
        toolName: "file_manager",
        args: { command: "delete", path: "/Old.jsx" },
      },
      true
    );
    expect(label).toBe("Deleted Old.jsx");
  });

  test("falls back to the tool name for unknown tools", () => {
    expect(
      getToolInvocationLabel(
        { toolName: "mystery_tool", args: {} },
        false
      )
    ).toBe("Running mystery_tool");
    expect(
      getToolInvocationLabel({ toolName: "mystery_tool", args: {} }, true)
    ).toBe("Ran mystery_tool");
  });

  test("handles a missing path gracefully", () => {
    expect(
      getToolInvocationLabel(
        { toolName: "str_replace_editor", args: { command: "create" } },
        false
      )
    ).toBe("Creating file");
  });
});

describe("ToolInvocation component", () => {
  test("renders a friendly label instead of the raw tool name", () => {
    render(
      <ToolInvocation
        toolInvocation={{
          toolName: "str_replace_editor",
          args: { command: "create", path: "/Card.jsx" },
          state: "result",
          result: "Success",
        }}
      />
    );

    expect(screen.getByText("Created Card.jsx")).toBeDefined();
    expect(screen.queryByText("str_replace_editor")).toBeNull();
  });

  test("shows the completed indicator (green dot) when finished", () => {
    const { container } = render(
      <ToolInvocation
        toolInvocation={{
          toolName: "str_replace_editor",
          args: { command: "create", path: "/Card.jsx" },
          state: "result",
          result: "Success",
        }}
      />
    );

    expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
    expect(container.querySelector(".animate-spin")).toBeNull();
  });

  test("shows a spinner while the tool is still running", () => {
    const { container } = render(
      <ToolInvocation
        toolInvocation={{
          toolName: "str_replace_editor",
          args: { command: "create", path: "/Card.jsx" },
          state: "call",
        }}
      />
    );

    expect(screen.getByText("Creating Card.jsx")).toBeDefined();
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(container.querySelector(".bg-emerald-500")).toBeNull();
  });

  test("treats a result-less invocation as still in progress", () => {
    render(
      <ToolInvocation
        toolInvocation={{
          toolName: "file_manager",
          args: { command: "delete", path: "/Old.jsx" },
          state: "result",
          result: null,
        }}
      />
    );

    expect(screen.getByText("Deleting Old.jsx")).toBeDefined();
  });
});
