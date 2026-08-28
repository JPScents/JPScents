export const commerceConfig = {
  currency: "NGN",
  locale: "en-NG",
  sizeUnit: "mL",
  paymentMode: "manual",
  whatsappHandoff: "post-order",
  orderReference: {
    prefix: "JP-",
    minimumDigits: 4,
  },
} as const;

export type CommerceConfig = typeof commerceConfig;
