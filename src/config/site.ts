export const siteConfig = {
  name: "JPScents",
  description: "Perfume, chosen with care.",
  locale: "en-NG",
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
    adminOrder: (reference: string) =>
      `/admin/orders/${reference}` as const,
  },
} as const;

export type SiteConfig = typeof siteConfig;
