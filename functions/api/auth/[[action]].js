/**
 * Trujillo AI - Auth Proxy for Rewrite AI (Cloudflare Pages Function)
 * Shares user accounts, sessions, and authentication with ai.trujillomingorance.com
 */

const TRUJILLO_AUTH_UPSTREAM = "https://ai.trujillomingorance.com";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
  "Access-Control-Allow-Credentials": "true",
  "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0"
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function onRequest(context) {
  const { request, params } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const url = new URL(request.url);
    const actionPath = Array.isArray(params.action) ? params.action.join("/") : (params.action || "");
    const upstreamUrl = new URL(`/api/auth/${actionPath}${url.search}`, TRUJILLO_AUTH_UPSTREAM);

    const upstreamHeaders = new Headers(request.headers);
    upstreamHeaders.set("Host", "ai.trujillomingorance.com");
    upstreamHeaders.set("X-Forwarded-Host", url.hostname);
    upstreamHeaders.set("X-Forwarded-Proto", "https");
    upstreamHeaders.set("Origin", "https://ai.trujillomingorance.com");
    upstreamHeaders.set("Referer", "https://ai.trujillomingorance.com/");

    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    let bodyData = undefined;
    if (hasBody) {
      bodyData = await request.arrayBuffer();
    }

    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      method: request.method,
      headers: upstreamHeaders,
      body: bodyData,
      redirect: "follow",
      cache: "no-store",
      cf: { cacheTtl: 0, cacheEverything: false }
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => {
      responseHeaders.set(k, v);
    });

    const resBody = await upstreamResponse.arrayBuffer();

    return new Response(resBody, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Error en el servicio de autenticacin" }), {
      status: 500,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json"
      }
    });
  }
}

