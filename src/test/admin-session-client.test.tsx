import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getStoredCmsConfig, logoutAdmin, setCustomAdminPassword } from "../lib/bycar";
import { AdminSystemTab } from "../components/admin/AdminSystemTab";

const originalToken = "synthetic-app-session";
beforeEach(() => {
  window.sessionStorage.clear();
  window.sessionStorage.setItem("bycar_admin_token", originalToken);
  window.sessionStorage.setItem("bycar_admin_auth", "1");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

describe("Client session mutation acknowledgements", () => {
  it("does not report a password change when there is no session", async () => {
    window.sessionStorage.removeItem("bycar_admin_token");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(setCustomAdminPassword("NewPassword!2026")).rejects.toThrow("yeniden giriş");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("preserves the token after a failed logout so revocation can be retried", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: false, error: "Try again" }), { status: 503 }),
      ),
    );
    await expect(logoutAdmin()).rejects.toThrow("Try again");
    expect(window.sessionStorage.getItem("bycar_admin_token")).toBe(originalToken);
    expect(window.sessionStorage.getItem("bycar_admin_auth")).toBe("1");
  });

  it("preserves the token after a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Offline");
      }),
    );
    await expect(logoutAdmin()).rejects.toThrow("Offline");
    expect(window.sessionStorage.getItem("bycar_admin_token")).toBe(originalToken);
  });

  it("rejects an Access login HTML response even when its HTTP status is 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("<html>Access sign-in</html>", {
            status: 200,
            headers: { "content-type": "text/html" },
          }),
      ),
    );
    await expect(logoutAdmin()).rejects.toThrow("Çıkış");
    await expect(setCustomAdminPassword("NewPassword!2026")).rejects.toThrow("Şifre sunucuda");
    expect(window.sessionStorage.getItem("bycar_admin_token")).toBe(originalToken);
  });

  it("clears local state only after confirmed server logout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }))),
    );
    await logoutAdmin();
    expect(window.sessionStorage.getItem("bycar_admin_token")).toBeNull();
    expect(window.sessionStorage.getItem("bycar_admin_auth")).toBeNull();
  });

  it("preserves local state if password replacement/revocation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: false }), { status: 500 })),
    );
    await expect(setCustomAdminPassword("NewPassword!2026")).rejects.toThrow();
    expect(window.sessionStorage.getItem("bycar_admin_token")).toBe(originalToken);
  });

  it("ends the local session after a confirmed password change", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }))),
    );
    expect(await setCustomAdminPassword("NewPassword!2026")).toBe(true);
    expect(window.sessionStorage.getItem("bycar_admin_token")).toBeNull();
    expect(window.sessionStorage.getItem("bycar_admin_auth")).toBeNull();
  });

  it.each([false, true])(
    "only returns the password form to login after server success (%s)",
    async (success) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () =>
            new Response(JSON.stringify({ ok: success, error: "Synthetic server failure" }), {
              status: success ? 200 : 500,
            }),
        ),
      );
      const onPasswordChanged = vi.fn();
      render(
        <AdminSystemTab
          cmsConfig={getStoredCmsConfig()}
          onSave={vi.fn()}
          onReset={vi.fn()}
          carsCount={0}
          inquiriesCount={0}
          undoSnap={null}
          onRestoreUndo={vi.fn()}
          onSyncServer={async () => {}}
          isSyncing={false}
          onPasswordChanged={onPasswordChanged}
        />,
      );
      fireEvent.change(screen.getByPlaceholderText("En az 6 karakter"), {
        target: { value: "NewPassword!2026" },
      });
      fireEvent.change(screen.getByPlaceholderText("Şifreyi tekrar yazın"), {
        target: { value: "NewPassword!2026" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Şifreyi Güvenle Güncelle/ }));
      if (success) {
        await waitFor(() => expect(onPasswordChanged).toHaveBeenCalledOnce());
        expect(window.sessionStorage.getItem("bycar_admin_token")).toBeNull();
      } else {
        expect(await screen.findByText("Synthetic server failure")).toBeInTheDocument();
        expect(onPasswordChanged).not.toHaveBeenCalled();
        expect(window.sessionStorage.getItem("bycar_admin_token")).toBe(originalToken);
      }
    },
  );
});
