export type CustomerInput = {
  name: string;
  whatsappNumber: string;
  email?: string;
  deliveryState: string;
  deliveryCity: string;
  deliveryAddress: string;
};

export type CustomerActionState = { errors?: Record<string, string> };
