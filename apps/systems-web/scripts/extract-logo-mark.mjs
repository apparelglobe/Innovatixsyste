/**
 * One-off asset prep: extract the blue hexagon MARK from the studio logo PNG
 * onto transparency, so it sits cleanly on the dark theme. The mark is the only
 * strongly-saturated-blue element; the gray backdrop and white "INNOVATIX"
 * wordmark are neutral (R≈G≈B), so we key on "blue clearly dominant".
 *
 * Run: node scripts/extract-logo-mark.mjs
 * Out: public/logo-mark.png (trimmed, transparent), public/icon.png (favicon)
 */
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../../../Innovatix Code logo.png');
const OUT_DIR = path.resolve(__dirname, '../public');

// Pre-crop to just the hexagon mark region (excludes the wordmark + the blue
// "RESULTS." in the tagline, which would otherwise key in as a stray artifact).
// Source is 1536×1024; the mark sits upper-center.
const CROP = { left: 560, top: 205, width: 440, height: 405 };
const img = sharp(SRC).extract(CROP).ensureAlpha();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

// Key: keep pixels where blue clearly dominates red & green (the mark).
// Feather alpha by how blue-dominant the pixel is for soft edges.
const DOM = 14; // min (B - max(R,G)) to count as "blue"
const FULL = 55; // dominance at which alpha is fully opaque
for (let i = 0; i < data.length; i += channels) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const dominance = b - Math.max(r, g);
  let alpha;
  if (dominance <= DOM) alpha = 0;
  else if (dominance >= FULL) alpha = 255;
  else alpha = Math.round(((dominance - DOM) / (FULL - DOM)) * 255);
  data[i + 3] = alpha;
}

const keyed = sharp(data, { raw: { width, height, channels } }).png();

// Trim fully-transparent margins, then normalize to a padded square canvas.
const trimmed = await keyed
  .trim({ threshold: 1 })
  .toBuffer();

const meta = await sharp(trimmed).metadata();
const side = Math.max(meta.width, meta.height);
const pad = Math.round(side * 0.06);
const canvas = side + pad * 2;

await sharp({
  create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: trimmed, gravity: 'center' }])
  .png()
  .toFile(path.join(OUT_DIR, 'logo-mark.png'));

// Favicon (512 for crispness; browsers downscale).
await sharp(path.join(OUT_DIR, 'logo-mark.png'))
  .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(OUT_DIR, 'icon.png'));

console.log(`✓ logo-mark.png (${canvas}×${canvas}) + icon.png written to public/`);
