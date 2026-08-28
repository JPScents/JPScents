import { Confirmation, getOrderConfirmation } from "@/features/orders";
import { readConfirmationCookie } from "@/features/orders/actions";
export default async function ConfirmationPage() { return <Confirmation order={await getOrderConfirmation(await readConfirmationCookie())} businessNumber={process.env.JP_SCENTS_WHATSAPP_NUMBER} />; }
