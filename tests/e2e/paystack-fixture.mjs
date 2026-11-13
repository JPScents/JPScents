// Loaded only by the isolated commerce browser project.
import { randomUUID } from "node:crypto";

const originalFetch = globalThis.fetch;
const attempts = new Map();
const requests = new Map();
const refunds = new Map();
const emails = new Map();
let identity = 0;

globalThis.fetch = async function fixtureFetch(input, init) {
  const url = new URL(input instanceof Request ? input.url : input, "http://localhost:3000");
  if (url.origin === "https://places.googleapis.com") {
    const request = JSON.parse(String(init.body));
    if (
      process.env.GOOGLE_PLACES_API_KEY !== "synthetic-browser-places-key" ||
      url.pathname !== "/v1/places:autocomplete" ||
      request.includedRegionCodes?.join(",") !== "ng"
    ) {
      throw new Error("Unexpected address fixture request.");
    }
    if (request.input.startsWith("Provider outage")) {
      return new Response(null, { status: 503 });
    }
    return Response.json({
      suggestions: [
        {
          placePrediction: {
            text: { text: "12 Synthetic Street, Ikeja, Lagos, Nigeria" },
            structuredFormat: { mainText: { text: "12 Synthetic Street" } },
            types: ["street_address"],
          },
        },
      ],
    });
  }
  if (url.origin === "https://api.resend.com") {
    if (process.env.RESEND_API_KEY !== "re_browser_fixture" || url.pathname !== "/emails") {
      throw new Error("Unexpected email fixture request.");
    }
    const key = new Headers(init.headers).get("Idempotency-Key");
    const body = String(init.body);
    const previous = emails.get(key);
    if (previous && previous.body !== body) {
      return Response.json({ name: "invalid_idempotent_request" }, { status: 409 });
    }
    if (!previous) {
      emails.set(key, { body, id: randomUUID() });
      if (JSON.parse(body).to === "email-retry@example.test") {
        throw new Error("Synthetic lost email response");
      }
    }
    return Response.json({ id: emails.get(key).id });
  }
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
  if (url.pathname === "/refund" && init.method === "GET") {
    const refund = refunds.get(url.searchParams.get("reference"));
    return Response.json({ status: true, data: refund ? [refund] : [] });
  }
  if (url.pathname === "/refund" && init.method === "POST") {
    const { reference, amount, transaction } = JSON.parse(String(init.body));
    const payment = attempts.get(transaction);
    if (!payment || refunds.has(reference)) {
      return Response.json({ status: false }, { status: 409 });
    }
    const refund = {
      reference,
      amount,
      transaction: { id: payment.id, reference: transaction },
      status: "processed",
      currency: payment.currency,
      domain: payment.domain,
    };
    refunds.set(reference, refund);
    return Response.json({ status: true, data: refund });
  }
  throw new Error("Unexpected endpoint in the isolated Paystack fixture.");
};
