import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  replace: vi.fn(),
  removeRecord: vi.fn(),
}));
vi.mock("@/modules/catalogue/repositories/perfume-image.repository", () => ({
  replacePrimaryImage: mocks.replace,
  removePrimaryImageRecord: mocks.removeRecord,
}));
import {
  savePrimaryImageAsset,
  removePrimaryImageAsset,
} from "@/modules/catalogue/services/perfume-images.service";

const createClient = async () => ({
  storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.replace.mockResolvedValue(["perfumes/old.png", "/perfume-placeholders/demo.svg"]);
});

describe("image storage and metadata coordination", () => {
  const file = new File(["image"], "photo.png", { type: "image/png" });
  it("keeps the existing image when uploading its replacement fails", async () => {
    mocks.upload.mockResolvedValue({ error: { message: "Storage unavailable" } });
    expect(await savePrimaryImageAsset("perfume", file, "Bottle", createClient)).toHaveProperty(
      "error",
    );
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("cleans only the new upload on metadata failure and never claims unverified cleanup", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.replace.mockRejectedValue(new Error("Database unavailable"));
    mocks.remove.mockResolvedValue({ error: { message: "Storage unavailable" } });
    const result = await savePrimaryImageAsset("perfume", file, "Bottle", createClient);
    expect(result.error).toContain("metadata could not be saved");
    expect(result.error).not.toContain("file was removed");
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]]);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("cleanup failed"));
    log.mockRestore();
  });
  it("removes replaced storage objects after metadata commits and leaves local assets alone", async () => {
    expect(await savePrimaryImageAsset("perfume", file, "Bottle", createClient)).toEqual({
      ok: true,
    });
    expect(mocks.remove).toHaveBeenCalledWith(["perfumes/old.png"]);
    expect(mocks.replace.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.remove.mock.invocationCallOrder[0],
    );
  });
  it("never deletes a file when the repository rejects published-image removal", async () => {
    mocks.removeRecord.mockResolvedValue({ error: "Unpublish this perfume first." });
    expect(await removePrimaryImageAsset("perfume", createClient)).toEqual({
      error: "Unpublish this perfume first.",
    });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
