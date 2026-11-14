import { CheckoutDraftEditor } from "../_components/CheckoutDraftEditor";

export default function NewCheckoutDraftPage() {
  return (
    <main className="px-5 py-7 lg:px-admin-content lg:py-10">
      <h1 className="font-display text-4xl">New checkout draft</h1>
      <CheckoutDraftEditor />
    </main>
  );
}
