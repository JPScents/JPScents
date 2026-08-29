"use server";

import { resolveCartItems } from "../services/cart.query.service";
import type { CartRequestLine } from "../types";

export async function resolveCart(lines: CartRequestLine[]) {
  return resolveCartItems(lines);
}
