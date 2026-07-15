"use client";

import Script from "next/script";

declare global {
  interface Window {
    SwaggerUIBundle?: (configuration: Record<string, unknown>) => unknown;
  }
}

export function ApiDocumentation() {
  function initializeSwagger() {
    window.SwaggerUIBundle?.({
      url: "/api/openapi",
      dom_id: "#swagger-ui",
      deepLinking: true,
      displayRequestDuration: true,
      docExpansion: "list",
      defaultModelsExpandDepth: 1,
      persistAuthorization: true,
    });
  }

  return (
    <>
      {/* Swagger assets are static files copied to public/swagger-ui/ */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/swagger-ui/swagger-ui.css" />
      <div id="swagger-ui" />
      <Script
        src="/swagger-ui/swagger-ui-bundle.js"
        strategy="afterInteractive"
        onReady={initializeSwagger}
      />
    </>
  );
}

