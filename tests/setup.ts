import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
