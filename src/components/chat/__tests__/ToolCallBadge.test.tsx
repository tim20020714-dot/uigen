import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge, getToolLabel } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

// --- getToolLabel ---

test("str_replace_editor create → Creating <filename>", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating App.jsx");
});

test("str_replace_editor str_replace → Editing <filename>", () => {
  expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/src/Card.jsx" })).toBe("Editing Card.jsx");
});

test("str_replace_editor insert → Editing <filename>", () => {
  expect(getToolLabel("str_replace_editor", { command: "insert", path: "/App.jsx" })).toBe("Editing App.jsx");
});

test("str_replace_editor view → Reading <filename>", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "/App.jsx" })).toBe("Reading App.jsx");
});

test("str_replace_editor undo_edit → Reverting <filename>", () => {
  expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })).toBe("Reverting App.jsx");
});

test("str_replace_editor with no path → Editing file", () => {
  expect(getToolLabel("str_replace_editor", {})).toBe("Editing file");
});

test("str_replace_editor uses only the filename, not full path", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/src/components/Button.tsx" })).toBe("Creating Button.tsx");
});

test("file_manager rename → Renaming old → new", () => {
  expect(
    getToolLabel("file_manager", { command: "rename", path: "/old.jsx", new_path: "/new.jsx" })
  ).toBe("Renaming old.jsx → new.jsx");
});

test("file_manager rename without new_path → Renaming <filename>", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "/old.jsx" })).toBe("Renaming old.jsx");
});

test("file_manager delete → Deleting <filename>", () => {
  expect(getToolLabel("file_manager", { command: "delete", path: "/App.jsx" })).toBe("Deleting App.jsx");
});

test("file_manager with no path → Managing files", () => {
  expect(getToolLabel("file_manager", {})).toBe("Managing files");
});

test("unknown tool name → returns tool name as-is", () => {
  expect(getToolLabel("some_other_tool", {})).toBe("some_other_tool");
});

test("getToolLabel returns 'Working...' when args is undefined", () => {
  expect(getToolLabel("str_replace_editor", undefined as any)).toBe("Working...");
});

test("getToolLabel returns 'Working...' when args is null", () => {
  expect(getToolLabel("str_replace_editor", null as any)).toBe("Working...");
});

// --- ToolCallBadge rendering ---

test("ToolCallBadge renders label text", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        state: "result",
        args: { command: "create", path: "/App.jsx" },
        result: "ok",
      }}
    />
  );
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("ToolCallBadge shows green dot when state is result", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        state: "result",
        args: { command: "create", path: "/App.jsx" },
        result: "ok",
      }}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("ToolCallBadge shows spinner when state is call", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        state: "call",
        args: { command: "create", path: "/App.jsx" },
      }}
    />
  );
  expect(container.querySelector(".animate-spin")).not.toBeNull();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolCallBadge shows spinner when state is partial-call", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        state: "partial-call",
        args: {},
      }}
    />
  );
  expect(container.querySelector(".animate-spin")).not.toBeNull();
});
