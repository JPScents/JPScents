export const commerceConfig = {
  currency: "NGN",
  locale: "en-NG",
  sizeUnit: "mL",
  maximumVariantQuantity: 99,
  orderReference: {
    prefix: "JP-",
    minimumDigits: 4,
  },
} as const;

export type CommerceConfig = typeof commerceConfig;
