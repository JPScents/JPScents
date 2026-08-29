import { Confirmation, getOrderConfirmation, readConfirmationCookie } from "@/features/orders";
export default async function ConfirmationPage() { return <Confirmation order={await getOrderConfirmation(await readConfirmationCookie())} businessNumber={process.env.JP_SCENTS_WHATSAPP_NUMBER} />; }
