import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { ModalShell } from "@/components/shared/ModalShell";

function Fixture() {
  const [open, setOpen] = useState(false);
  return (
    <ModalShell
      open={open}
      onOpenChange={setOpen}
      trigger={<button type="button">Open details</button>}
      title="Details"
      description="Accessible details"
    >
      <p>Modal content</p>
    </ModalShell>
  );
}

describe("ModalShell", () => {
  it("closes with Escape and restores focus to its trigger", async () => {
    render(<Fixture />);
    const trigger = screen.getByRole("button", { name: "Open details" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Details" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
