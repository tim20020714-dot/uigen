import { test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "../main-content";

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface" />,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree" />,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor" />,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame" />,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions" />,
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useChat: () => ({ messages: [], status: "idle" }),
}));

vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useFileSystem: () => ({
    getFile: vi.fn(),
    selectedFile: null,
    selectFile: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
});

test("defaults to Preview view on mount", () => {
  render(<MainContent />);

  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();

  const previewTab = screen.getByRole("tab", { name: "Preview" });
  const codeTab = screen.getByRole("tab", { name: "Code" });
  expect(previewTab.getAttribute("data-state")).toBe("active");
  expect(codeTab.getAttribute("data-state")).toBe("inactive");
});

test("clicking Code tab swaps to the code editor", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  await user.click(screen.getByRole("tab", { name: "Code" }));

  expect(screen.getByTestId("code-editor")).toBeDefined();
  expect(screen.queryByTestId("preview-frame")).toBeNull();
  expect(screen.getByRole("tab", { name: "Code" }).getAttribute("data-state")).toBe("active");
  expect(screen.getByRole("tab", { name: "Preview" }).getAttribute("data-state")).toBe("inactive");
});

test("clicking Preview tab after Code returns to the preview frame", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  await user.click(screen.getByRole("tab", { name: "Code" }));
  await user.click(screen.getByRole("tab", { name: "Preview" }));

  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();
  expect(screen.getByRole("tab", { name: "Preview" }).getAttribute("data-state")).toBe("active");
});

test("toggling rapidly back and forth keeps state in sync", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const codeTab = screen.getByRole("tab", { name: "Code" });
  const previewTab = screen.getByRole("tab", { name: "Preview" });

  await user.click(codeTab);
  await user.click(previewTab);
  await user.click(codeTab);

  expect(screen.getByTestId("code-editor")).toBeDefined();
  expect(codeTab.getAttribute("data-state")).toBe("active");
});
