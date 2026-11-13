import "server-only";

export function deploymentContext() {
  const buildContext = process.env.JPSCENTS_NETLIFY_BUILD_CONTEXT;
  if (buildContext || process.env.SITE_ID || process.env.NETLIFY === "true") {
    const configured = process.env.JPSCENTS_DEPLOYMENT;
    if (configured === "production" && buildContext === "production") {
      return "production";
    }
    if (configured === "preview" && buildContext === "deploy-preview") {
      return "preview";
    }
    return null;
  }

  const vercel = process.env.VERCEL_ENV;
  if (vercel) {
    return vercel === "production" ? "production" : "preview";
  }
  return "local";
}
