import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";
import { useAuth } from "@/hooks/use-auth";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAuth", () => {
  describe("isLoading", () => {
    test("is false initially", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    test("is true while signIn is pending and false after it resolves", async () => {
      let resolve!: (v: unknown) => void;
      vi.mocked(signInAction).mockReturnValue(new Promise((r) => (resolve = r)));
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([{ id: "p1" }]);

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signIn("a@b.com", "pw");
      });
      expect(result.current.isLoading).toBe(true);

      await act(async () => resolve({ success: true }));
      expect(result.current.isLoading).toBe(false);
    });

    test("is true while signUp is pending and false after it resolves", async () => {
      let resolve!: (v: unknown) => void;
      vi.mocked(signUpAction).mockReturnValue(new Promise((r) => (resolve = r)));
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([{ id: "p1" }]);

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signUp("a@b.com", "pw");
      });
      expect(result.current.isLoading).toBe(true);

      await act(async () => resolve({ success: true }));
      expect(result.current.isLoading).toBe(false);
    });

    test("resets to false even when signIn throws", async () => {
      vi.mocked(signInAction).mockRejectedValue(new Error("network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.signIn("a@b.com", "pw")).rejects.toThrow(
          "network error"
        );
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets to false even when signUp throws", async () => {
      vi.mocked(signUpAction).mockRejectedValue(new Error("server error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.signUp("a@b.com", "pw")).rejects.toThrow(
          "server error"
        );
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signIn", () => {
    test("calls signInAction with the provided email and password", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@test.com", "secret");
      });

      expect(signInAction).toHaveBeenCalledOnce();
      expect(signInAction).toHaveBeenCalledWith("user@test.com", "secret");
    });

    test("returns the result from signInAction", async () => {
      const mockResult = { success: false, error: "invalid credentials" };
      vi.mocked(signInAction).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useAuth());
      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.signIn("a@b.com", "pw");
      });

      expect(returnValue).toEqual(mockResult);
    });

    test("does not redirect when signIn fails", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: false, error: "wrong password" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("a@b.com", "pw");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    describe("post-sign-in routing", () => {
      test("creates project from anon work and redirects when anon messages exist", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getAnonWorkData).mockReturnValue({
          messages: [{ role: "user", content: "hello" }],
          fileSystemData: { "index.html": "<h1>Hi</h1>" },
        });
        vi.mocked(createProject).mockResolvedValue({ id: "anon-proj-1" });

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("a@b.com", "pw");
        });

        expect(createProject).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: [{ role: "user", content: "hello" }],
            data: { "index.html": "<h1>Hi</h1>" },
          })
        );
        expect(clearAnonWork).toHaveBeenCalledOnce();
        expect(mockPush).toHaveBeenCalledWith("/anon-proj-1");
      });

      test("skips fetching existing projects when anon work has messages", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getAnonWorkData).mockReturnValue({
          messages: [{ role: "user", content: "build me a site" }],
          fileSystemData: {},
        });
        vi.mocked(createProject).mockResolvedValue({ id: "p1" });

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("a@b.com", "pw");
        });

        expect(getProjects).not.toHaveBeenCalled();
      });

      test("redirects to first existing project when anon work is null", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getAnonWorkData).mockReturnValue(null);
        vi.mocked(getProjects).mockResolvedValue([{ id: "proj-1" }, { id: "proj-2" }]);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("a@b.com", "pw");
        });

        expect(mockPush).toHaveBeenCalledWith("/proj-1");
        expect(createProject).not.toHaveBeenCalled();
      });

      test("redirects to first existing project when anon messages array is empty", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getAnonWorkData).mockReturnValue({ messages: [], fileSystemData: {} });
        vi.mocked(getProjects).mockResolvedValue([{ id: "proj-1" }]);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("a@b.com", "pw");
        });

        expect(mockPush).toHaveBeenCalledWith("/proj-1");
        expect(clearAnonWork).not.toHaveBeenCalled();
      });

      test("creates a new empty project and redirects when no projects exist", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getAnonWorkData).mockReturnValue(null);
        vi.mocked(getProjects).mockResolvedValue([]);
        vi.mocked(createProject).mockResolvedValue({ id: "new-proj-42" });

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("a@b.com", "pw");
        });

        expect(createProject).toHaveBeenCalledWith(
          expect.objectContaining({ messages: [], data: {} })
        );
        expect(mockPush).toHaveBeenCalledWith("/new-proj-42");
      });
    });
  });

  describe("signUp", () => {
    test("calls signUpAction with the provided email and password", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@test.com", "pass123");
      });

      expect(signUpAction).toHaveBeenCalledOnce();
      expect(signUpAction).toHaveBeenCalledWith("new@test.com", "pass123");
    });

    test("returns the result from signUpAction", async () => {
      const mockResult = { success: false, error: "email already in use" };
      vi.mocked(signUpAction).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useAuth());
      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.signUp("a@b.com", "pw");
      });

      expect(returnValue).toEqual(mockResult);
    });

    test("does not redirect when signUp fails", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: false, error: "email taken" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("a@b.com", "pw");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("redirects after successful signUp using the same post-sign-in logic", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([{ id: "existing-proj" }]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@test.com", "pass");
      });

      expect(mockPush).toHaveBeenCalledWith("/existing-proj");
    });

    test("creates project from anon work on successful signUp", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue({
        messages: [{ role: "user", content: "make a landing page" }],
        fileSystemData: { "app.css": "body{}" },
      });
      vi.mocked(createProject).mockResolvedValue({ id: "signup-anon-proj" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@test.com", "pass");
      });

      expect(clearAnonWork).toHaveBeenCalledOnce();
      expect(mockPush).toHaveBeenCalledWith("/signup-anon-proj");
    });
  });

  describe("return value shape", () => {
    test("exposes signIn, signUp, and isLoading", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(typeof result.current.isLoading).toBe("boolean");
    });
  });
});
