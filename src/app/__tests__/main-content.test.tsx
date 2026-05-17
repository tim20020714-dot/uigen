import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "@/app/main-content";

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame">preview</div>,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor">editor</div>,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree">tree</div>,
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat">chat</div>,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions">actions</div>,
}));

vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("MainContent Preview/Code toggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults to the Preview tab", () => {
    render(<MainContent />);
    expect(screen.getByTestId("preview-frame")).toBeTruthy();
    expect(screen.queryByTestId("code-editor")).toBeNull();
    expect(screen.getByRole("tab", { name: "Preview" }).getAttribute("data-state")).toBe("active");
    expect(screen.getByRole("tab", { name: "Code" }).getAttribute("data-state")).toBe("inactive");
  });

  it("switches to Code when the Code tab is clicked", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    await user.click(screen.getByRole("tab", { name: "Code" }));

    expect(screen.getByTestId("code-editor")).toBeTruthy();
    expect(screen.getByTestId("file-tree")).toBeTruthy();
    expect(screen.queryByTestId("preview-frame")).toBeNull();
    expect(screen.getByRole("tab", { name: "Code" }).getAttribute("data-state")).toBe("active");
    expect(screen.getByRole("tab", { name: "Preview" }).getAttribute("data-state")).toBe("inactive");
  });

  it("switches back to Preview when the Preview tab is clicked", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    await user.click(screen.getByRole("tab", { name: "Code" }));
    await user.click(screen.getByRole("tab", { name: "Preview" }));

    expect(screen.getByTestId("preview-frame")).toBeTruthy();
    expect(screen.queryByTestId("code-editor")).toBeNull();
    expect(screen.getByRole("tab", { name: "Preview" }).getAttribute("data-state")).toBe("active");
  });

  it("stays in sync through rapid alternating clicks", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    const code = () => screen.getByRole("tab", { name: "Code" });
    const preview = () => screen.getByRole("tab", { name: "Preview" });

    await user.click(code());
    await user.click(preview());
    await user.click(code());
    await user.click(preview());
    await user.click(code());

    expect(code().getAttribute("data-state")).toBe("active");
    expect(preview().getAttribute("data-state")).toBe("inactive");
    expect(screen.getByTestId("code-editor")).toBeTruthy();
  });
});
