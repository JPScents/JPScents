import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/image", () => ({
  default: ({ alt }: { alt?: string }) => <span data-image-alt={alt} />,
}));

import { HelpMeChoose } from "@/features/catalogue/components/public/HelpMeChoose";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("public catalogue controls", () => {
  it("requires at least one preference before showing recommendations", () => {
    push.mockReset();
    render(<HelpMeChoose initial={{ scentCharacters: [], occasions: [] }} submitted={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Recommend perfumes" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Choose at least one preference");
    expect(push).not.toHaveBeenCalled();
  });

  it("focuses the results announcement and lets the customer adjust preferences after no match", () => {
    render(
      <HelpMeChoose
        initial={{ scentCharacters: ["FRESH"], occasions: ["DATE_NIGHT"], timeOfDay: "NIGHT" }}
        submitted
        results={[]}
      />,
    );
    expect(screen.getByRole("heading", { name: "No exact match yet." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse all perfumes" })).toHaveAttribute(
      "href",
      "/perfumes",
    );
    expect(screen.getByRole("heading", { name: /Perfumes chosen around/ })).toHaveFocus();
    fireEvent.click(screen.getAllByRole("button", { name: "Adjust preferences" })[0]);
    expect(push).toHaveBeenCalledWith("/help-me-choose");
  });

  it("does not offer recommendations before an available catalogue exists", () => {
    render(
      <HelpMeChoose
        initial={{ scentCharacters: [], occasions: [] }}
        submitted={false}
        catalogueAvailable={false}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Recommendations will begin with the collection." }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Recommend perfumes" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/");
  });
});
