// Bot media sosial tidak menjalankan JavaScript, jadi mereka diberi HTML berisi tag Open Graph
// dari backend. Pengunjung biasa tetap mendapat aplikasi React.
const BOTS =
  /WhatsApp|facebookexternalhit|Facebot|Twitterbot|TelegramBot|LinkedInBot|Slackbot|Discordbot|Pinterest|SkypeUriPreview/i;

export async function onRequest(context) {
  const { request, env, params } = context;
  const userAgent = request.headers.get("user-agent") || "";

  if (request.method === "GET" && env.API_ORIGIN && BOTS.test(userAgent)) {
    try {
      const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
      const res = await fetch(`${env.API_ORIGIN}/api/og/products/${encodeURIComponent(slug)}`, {
        headers: { accept: "text/html" },
      });
      return new Response(res.body, {
        status: res.status,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" },
      });
    } catch {
      // gagal menghubungi backend: jatuh ke halaman biasa
    }
  }

  return context.next();
}