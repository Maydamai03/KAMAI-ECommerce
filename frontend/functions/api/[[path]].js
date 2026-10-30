// Meneruskan /api/* ke backend, sehingga browser melihatnya sebagai asal yang sama
// (cookie login menjadi cookie pihak pertama dan tidak diblokir Safari atau Firefox).
export async function onRequest({ request, env }) {
  if (!env.API_ORIGIN) {
    return new Response(
      JSON.stringify({ success: false, error: { code: "PROXY_NOT_CONFIGURED", message: "API_ORIGIN belum diatur" } }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, env.API_ORIGIN);
  return fetch(new Request(target, request));
}