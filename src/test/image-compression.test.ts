import { afterEach, expect, it, vi } from "vitest";
import { compressImageToWebP } from "../lib/bycar";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function imageEnvironment(
  width: number,
  height: number,
  encoded: Blob | null = new Blob(["converted"], { type: "image/webp" }),
  broken = false,
) {
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: vi.fn() }),
    toBlob: vi.fn((callback: BlobCallback) => callback(encoded)),
  };
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:local-photo"),
    revokeObjectURL: vi.fn(),
  });
  vi.stubGlobal(
    "Image",
    class {
      width = width;
      height = height;
      onload?: () => void;
      onerror?: () => void;
      set src(_: string) {
        queueMicrotask(() => (broken ? this.onerror?.() : this.onload?.()));
      }
    },
  );
  vi.spyOn(document, "createElement").mockReturnValue(canvas as unknown as HTMLCanvasElement);
  return canvas;
}

it.each([
  [4000, 2000, 1600, 800],
  [1200, 4800, 400, 1600],
  [100, 200, 100, 200],
])(
  "bounds both dimensions without enlarging small images (%s x %s)",
  async (width, height, expectedWidth, expectedHeight) => {
    const canvas = imageEnvironment(width, height);
    expect((await compressImageToWebP(new File(["photo"], "photo.png"))).type).toBe("image/webp");
    expect([canvas.width, canvas.height]).toEqual([expectedWidth, expectedHeight]);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/webp", 0.82);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local-photo");
  },
);

it("returns the original bytes when WebP encoding is unavailable", async () => {
  imageEnvironment(100, 100, new Blob(["canvas-png"], { type: "image/png" }));
  const file = new File(["original"], "photo.png", { type: "image/png" });
  expect(await compressImageToWebP(file)).toBe(file);
});

it("rejects an undecodable photo with a readable error", async () => {
  imageEnvironment(0, 0, undefined, true);
  await expect(compressImageToWebP(new File(["broken"], "broken.png"))).rejects.toThrow(
    "Görsel açılamadı",
  );
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local-photo");
});
