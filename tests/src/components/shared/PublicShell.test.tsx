import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }));
vi.mock("next/navigation", () => ({ usePathname: () => "/perfumes" }));

import { PublicShell } from "@/components/shared/public/PublicShell";
afterEach(cleanup);

describe("PublicShell", () => {
  it("labels public navigation and footer routes", () => {
    render(<PublicShell><p>Page content</p></PublicShell>);
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toHaveTextContent("PerfumesHelp Me Choose");
    expect(within(screen.getByRole("navigation", { name: "Primary navigation" })).getByRole("link", { name: "Perfumes" })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("navigation", { name: "Footer navigation" })).toHaveLength(2);
    screen.getAllByRole("navigation", { name: "Footer navigation" }).forEach((footer) => expect(footer).toHaveTextContent("Perfumes·Help Me Choose·Cart"));
    expect(screen.getByRole("link", { name: "Open cart, 0 items" })).toHaveAttribute("href", "/cart");
  });

  it("opens the mobile menu and closes it with Escape, returning focus", async () => {
    render(<PublicShell><p>Page content</p></PublicShell>);
    const trigger = screen.getByRole("button", { name: "Open menu" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toHaveTextContent("Perfumes");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
