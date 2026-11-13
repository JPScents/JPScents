import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DeliverySetting } from "@/modules/delivery";

const { save } = vi.hoisted(() => ({ save: vi.fn() }));

vi.mock("@/app/(admin)/admin/delivery/_actions/save-delivery-settings.admin.action", () => ({
  updateDeliverySettings: save,
}));

import { DeliverySettingsForm } from "@/app/(admin)/admin/delivery/_components/DeliverySettingsForm";

const settings = [
  { state: "Lagos", enabled: false, feeMinor: null, version: 0 },
  { state: "Ogun", enabled: false, feeMinor: 100000, version: 0 },
  { state: "FCT", enabled: true, feeMinor: 300000, version: 2 },
] satisfies DeliverySetting[];

afterEach(() => {
  save.mockReset();
  cleanup();
});

describe("Admin delivery settings", () => {
  it("applies a region selection without overriding other states or stored fees", async () => {
    save.mockResolvedValue({
      ok: true,
      settings: [
        { ...settings[0], enabled: true, feeMinor: 123450, version: 1 },
        { ...settings[1], enabled: true, version: 1 },
      ],
    });
    render(<DeliverySettingsForm settings={settings} />);

    fireEvent.click(screen.getByRole("button", { name: "Enable all in South West" }));
    fireEvent.click(screen.getByRole("button", { name: "Save delivery settings" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid NGN fee for Lagos.");
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox", { name: "Lagos delivery fee (NGN)" }), {
      target: { value: "1234.50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save delivery settings" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Delivery settings saved.");
    expect(save).toHaveBeenCalledWith([
      { ...settings[0], enabled: true, feeMinor: 123450 },
      { ...settings[1], enabled: true },
    ]);
    expect(screen.getByRole("checkbox", { name: "FCT" })).toBeChecked();
  });

  it("shows the stale edit and keeps the entered fee for recovery", async () => {
    save.mockResolvedValue({
      ok: false,
      conflict: true,
      message: "Delivery settings changed. Refresh and reapply your edits.",
    });
    render(<DeliverySettingsForm settings={settings} />);

    const fee = screen.getByRole("textbox", { name: "Ogun delivery fee (NGN)" });
    fireEvent.change(fee, { target: { value: "1100.25" } });
    fireEvent.click(screen.getByRole("button", { name: "Save delivery settings" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Delivery settings changed.");
    expect(fee).toHaveValue("1100.25");
  });
});
