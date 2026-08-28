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
    helpMeChooseResults: "/help-me-choose/results",
  },
} as const;

export type SiteConfig = typeof siteConfig;
