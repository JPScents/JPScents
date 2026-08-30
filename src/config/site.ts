const fallbackSiteUrl = "http://localhost:3000";

function resolveSiteUrl(value = process.env.NEXT_PUBLIC_SITE_URL): URL {
  try {
    const url = new URL(value?.trim() || fallbackSiteUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Unsupported URL");
    return url;
  } catch {
    return new URL(fallbackSiteUrl);
  }
}

export const siteConfig = {
  name: "JPScents",
  description: "Perfume, chosen with care.",
  locale: "en-NG",
  url: resolveSiteUrl(),
  routes: {
    home: "/",
    perfumes: "/perfumes",
    perfume: (slug: string) => `/perfume/${slug}` as const,
    cart: "/cart",
    checkout: "/checkout",
    checkoutConfirmation: "/checkout/confirm",
    helpMeChoose: "/help-me-choose",
    admin: "/admin",
    adminLogin: "/admin/login",
    authConfirm: "/auth/confirm",
    adminPerfumes: "/admin/perfumes",
    adminNewPerfume: "/admin/perfumes/new",
    adminPerfume: (id: string) => `/admin/perfumes/${id}` as const,
    adminOrders: "/admin/orders",
    adminOrder: (reference: string) => `/admin/orders/${reference}` as const,
  },
} as const;

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}

export function isProductionDeployment() {
  return process.env.VERCEL_ENV
    ? process.env.VERCEL_ENV === "production"
    : process.env.NODE_ENV === "production";
}

export type SiteConfig = typeof siteConfig;
