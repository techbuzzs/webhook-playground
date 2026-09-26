"use client";

import Link from "next/link";
import Script from "next/script";

declare global {
  interface Window {
    SwaggerUIBundle?: (options: Record<string, unknown>) => unknown;
  }
}

function renderSwagger() {
  window.SwaggerUIBundle?.({ url: "/api/openapi", dom_id: "#swagger-ui", deepLinking: true });
}

export default function ApiDocsPage() {
  return (
    <main className="docs-page">
      <div className="docs-bar shell"><Link className="brand" href="/"><span className="brand-mark">W/</span><span>Webhook Playground</span></Link><span>OpenAPI 3.1</span></div>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
      <Script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" onLoad={renderSwagger} />
      <div id="swagger-ui" className="swagger-shell" />
    </main>
  );
}
