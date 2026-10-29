const CLOUDINARY = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;
// Gambar contoh dari seed (hanya untuk uji); rasio 4:5
const PICSUM = /^(https:\/\/picsum\.photos\/seed\/[^/]+)\/\d+\/\d+$/;

/** Kecilkan ke lebar tertentu (Cloudinary dan gambar contoh). URL lain dikembalikan apa adanya */
export function sizedImage(url: string | null | undefined, width: number): string | undefined {
  if (!url) return undefined;
  if (CLOUDINARY.test(url)) return url.replace("/upload/", `/upload/w_${width},c_limit/`);
  const picsum = PICSUM.exec(url);
  if (picsum) return `${picsum[1]}/${width}/${Math.round(width * 1.25)}`;
  return url;
}

export function responsiveImage(url: string | null | undefined, widths: number[]) {
  if (!url) return { src: undefined as string | undefined, srcSet: undefined as string | undefined };
  if (!CLOUDINARY.test(url) && !PICSUM.test(url)) {
    return { src: url, srcSet: undefined as string | undefined };
  }

  return {
    src: sizedImage(url, widths[Math.floor(widths.length / 2)]),
    srcSet: widths.map((w) => `${sizedImage(url, w)} ${w}w`).join(", "),
  };
}