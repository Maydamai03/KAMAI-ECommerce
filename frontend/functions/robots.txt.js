export async function onRequest({ request, env }) {
  const origin = new URL(request.url).origin;

  const body =
    env.NOINDEX === "true"
      ? "User-agent: *\nDisallow: /\n"
      : `User-agent: *
Allow: /
Disallow: /admin
Disallow: /cart
Disallow: /checkout
Disallow: /account
Disallow: /orders/
Disallow: /login
Disallow: /register

Sitemap: ${origin}/api/sitemap.xml
`;

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}