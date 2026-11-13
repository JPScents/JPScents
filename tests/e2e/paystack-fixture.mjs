// Loaded only by the isolated commerce browser project. It never contacts Paystack.
const originalFetch = globalThis.fetch;
const attempts = new Map();
const requests = new Map();
let identity = 0;

globalThis.fetch = async function fixtureFetch(input, init) {
  const url = new URL(input instanceof Request ? input.url : input, "http://localhost:3000");
  if (url.origin !== "https://api.paystack.co") {
    return originalFetch(input, init);
  }
  if (process.env.PAYSTACK_SECRET_KEY !== "sk_test_browser_fixture") {
    throw new Error("The Paystack fixture requires the isolated browser configuration.");
  }
  if (url.pathname === "/transaction/initialize") {
    const { email, amount, currency, reference } = JSON.parse(String(init.body));
    const count = (requests.get(email) ?? 0) + 1;
    requests.set(email, count);
    if (email.startsWith("uncertain") && count === 1) {
      throw new Error("Synthetic transport interruption");
    }
    const status = email.startsWith("retry") && count === 1 ? "failed" : "success";
    attempts.set(reference, {
      id: ++identity,
      domain: "test",
      status,
      amount: Number(amount),
      currency,
      reference,
    });
    return Response.json({
      status: true,
      data: { reference, authorization_url: "https://checkout.paystack.com/synthetic-checkout" },
    });
  }
  if (url.pathname.startsWith("/transaction/verify/")) {
    const data = attempts.get(url.pathname.split("/").at(-1));
    return data
      ? Response.json({ status: true, data })
      : Response.json({ status: false }, { status: 404 });
  }
  throw new Error("Unexpected endpoint in the isolated Paystack fixture.");
};
