import "server-only";

export { getCustomerById, listCustomers } from "./services/customer.service";
export {
  CustomerIdentityConflict,
  resolveCustomerForOrder,
} from "./repositories/customer.repository";
