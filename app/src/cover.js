// Draws the poster cover: several photo panels over a sunset/neon grade, with a bold
// caption band along the foot. Pure canvas 2D, no network, no libraries.
// drawCover(canvas, state, width, height) paints at the canvas's own pixel size;
// the preview and the PNG export both call it, so what you see is what you get.

export const GRADES = {
  sunset: { top: '#ff9a3d', mid: '#ff5e7a', bottom: '#c22a8f', accent: '#ffb347', band: '#1d0b33' },
  neon: { top: '#19d3e6', mid: '#7b5cff', bottom: '#ff2e88', accent: '#39e6ff', band: '#0d1030' },
  dusk: { top: '#b06cff', mid: '#6a3df0', bottom: '#1d2f7a', accent: '#d9a7ff', band: '#150f2e' },
};

export const LAYOUTS = {
  hero: { panels: 3 },
  triptych: { panels: 3 },
  grid: { panels: 4 },
};

/** Panel rectangles for a layout, as fractions of the panel area (x, y, w, h). */
export function panelRects(layout, areaW, areaH) {
  if (layout === 'triptych') {
    return [0, 1, 2].map((i) => ({ x: (i * areaW) / 3, y: 0, w: areaW / 3, h: areaH }));
  }
  if (layout === 'grid') {
    return [
      { x: 0, y: 0, w: areaW / 2, h: areaH / 2 },
      { x: areaW / 2, y: 0, w: areaW / 2, h: areaH / 2 },
      { x: 0, y: areaH / 2, w: areaW / 2, h: areaH / 2 },
      { x: areaW / 2, y: areaH / 2, w: areaW / 2, h: areaH / 2 },
    ];
  }
  // hero: one big panel on top, two small ones below it.
  return [
    { x: 0, y: 0, w: areaW, h: areaH * 0.62 },
    { x: 0, y: areaH * 0.62, w: areaW / 2, h: areaH * 0.38 },
    { x: areaW / 2, y: areaH * 0.62, w: areaW / 2, h: areaH * 0.38 },
  ];
}

/** Deterministic pseudo-random heights for the skyline silhouette, so every size matches. */
function skylineHeights(count, seed) {
  let s = seed;
  const out = [];
  for (let i = 0; i < count; i++) {
    s = (s * 16807) % 2147483647;
    out.push(0.25 + (s / 2147483647) * 0.75);
  }
  return out;
}

/** Draws one photo into a panel rect, cover-fit, with the panel's zoom and pan. */
function drawPanelPhoto(ctx, photo, rect, panel, gap) {
  const px = rect.x + gap / 2;
  const py = rect.y + gap / 2;
  const pw = rect.w - gap;
  const ph = rect.h - gap;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  if (!photo) {
    const g = ctx.createLinearGradient(px, py, px + pw, py + ph);
    g.addColorStop(0, '#3a2350');
    g.addColorStop(1, '#1c0f2e');
    ctx.fillStyle = g;
    ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `400 ${Math.max(14, pw * 0.07)}px "Bebas Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', px + pw / 2, py + ph / 2);
    ctx.restore();
    return;
  }
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const zoom = panel.zoom || 1;
  const base = Math.max(pw / iw, ph / ih) * zoom;
  const dw = iw * base;
  const dh = ih * base;
  const overX = Math.max(0, (dw - pw) / 2);
  const overY = Math.max(0, (dh - ph) / 2);
  const dx = px + (pw - dw) / 2 - (panel.panX || 0) * overX;
  const dy = py + (ph - dh) / 2 - (panel.panY || 0) * overY;
  ctx.drawImage(photo, dx, dy, dw, dh);
  ctx.restore();
}

/** Sunset / neon colour grade over one panel: warm top light, coloured foot, vignette. */
function gradePanel(ctx, rect, grade, gap, scale) {
  const px = rect.x + gap / 2;
  const py = rect.y + gap / 2;
  const pw = rect.w - gap;
  const ph = rect.h - gap;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  const wash = ctx.createLinearGradient(px, py, px + pw, py + ph);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(0.55, grade.mid);
  wash.addColorStop(1, grade.bottom);
  ctx.globalAlpha = 0.22;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(px, py, pw, ph);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  const foot = ctx.createLinearGradient(0, py + ph * 0.55, 0, py + ph);
  foot.addColorStop(0, 'rgba(20,8,32,0)');
  foot.addColorStop(1, 'rgba(20,8,32,0.38)');
  ctx.fillStyle = foot;
  ctx.fillRect(px, py, pw, ph);
  const vig = ctx.createRadialGradient(
    px + pw / 2, py + ph / 2, Math.min(pw, ph) * 0.35,
    px + pw / 2, py + ph / 2, Math.max(pw, ph) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,4,20,0.32)');
  ctx.fillStyle = vig;
  ctx.fillRect(px, py, pw, ph);
  ctx.restore();
  // Thin white frame so the panels read as a poster grid.
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.strokeRect(px, py, pw, ph);
}

/** The caption band: deep band, setting sun, skyline silhouette, title + tagline. */
function drawCaptionBand(ctx, state, grade, bandY, bandH, w, scale) {
  const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  band.addColorStop(0, grade.band);
  band.addColorStop(1, '#0d0518');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, w, bandH);

  // Setting sun, low on the right, mostly sunk behind the skyline so it never
  // sits behind the tagline text.
  const sunR = bandH * 0.5;
  const sunX = w - sunR * 0.85;
  const sunY = bandY + bandH * 0.78;
  const sun = ctx.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR * 1.5);
  sun.addColorStop(0, grade.top);
  sun.addColorStop(0.45, grade.mid);
  sun.addColorStop(1, 'rgba(194,42,143,0)');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = grade.top;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // Skyline silhouette along the band's foot.
  const heights = skylineHeights(26, 20260611);
  const bw = w / heights.length;
  ctx.fillStyle = 'rgba(8,3,16,0.85)';
  heights.forEach((h, i) => {
    const bh = h * bandH * 0.34;
    ctx.fillRect(i * bw, bandY + bandH - bh, bw * 0.82, bh);
  });

  // Title: Bebas Neue, auto-fit, white with a hard offset shadow.
  const title = (state.title || '').trim().toUpperCase();
  const tagline = (state.tagline || '').trim().toUpperCase();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (title) {
    let size = bandH * 0.52;
    ctx.font = `400 ${size}px "Bebas Neue", "Anton", sans-serif`;
    const maxW = w * 0.86;
    while (ctx.measureText(title).width > maxW && size > 10) {
      size -= 2;
      ctx.font = `400 ${size}px "Bebas Neue", "Anton", sans-serif`;
    }
    const ty = bandY + bandH * (tagline ? 0.38 : 0.5);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText(title, w / 2 + size * 0.045, ty + size * 0.05);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, w / 2, ty);
    // Thin accent rule under the title.
    ctx.fillStyle = grade.accent;
    const ruleW = Math.min(maxW, ctx.measureText(title).width * 0.6);
    ctx.fillRect((w - ruleW) / 2, ty + size * 0.52, ruleW, Math.max(2, 3 * scale));
  }
  if (tagline) {
    let size = bandH * 0.16;
    ctx.font = `400 ${size}px "Anton", "Bebas Neue", sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.max(2, size * 0.28)}px`;
    const maxW = w * 0.8;
    while (ctx.measureText(tagline).width > maxW && size > 8) {
      size -= 1;
      ctx.font = `400 ${size}px "Anton", "Bebas Neue", sans-serif`;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(tagline, w / 2 + 1, bandY + bandH * 0.82 + 1);
    ctx.fillStyle = grade.accent;
    ctx.fillText(tagline, w / 2, bandY + bandH * 0.82);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
}

/** Paints the whole cover onto `canvas` at its current pixel size. */
export function drawCover(canvas, state, width, height) {
  const w = width || canvas.width;
  const h = height || canvas.height;
  const ctx = canvas.getContext('2d');
  const scale = w / 1080;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const gap = Math.max(4, 10 * scale);

  // Poster paper: warm off-white gaps between panels.
  ctx.fillStyle = '#fdf6ee';
  ctx.fillRect(0, 0, w, h);

  const bandH = h * 0.18;
  const areaH = h - bandH;
  const rects = panelRects(state.layout || 'hero', w, areaH);
  const count = rects.length;
  rects.forEach((rect, i) => {
    const panel = (state.panels && state.panels[i]) || { photo: 0, zoom: 1, panX: 0, panY: 0 };
    const photoIndex = state.useOnePhoto ? 0 : panel.photo;
    const photo = state.photos ? state.photos[photoIndex] || null : null;
    drawPanelPhoto(ctx, photo, rect, panel, gap);
    gradePanel(ctx, rect, grade, gap, scale);
  });

  drawCaptionBand(ctx, state, grade, areaH, bandH, w, scale);
  return { panels: count };
}

/** The export sizes the bounty asks for. */
export const EXPORT_SIZES = [
  { label: '1080 × 1080', w: 1080, h: 1080 },
  { label: '1080 × 1350', w: 1080, h: 1350 },
  { label: '1920 × 1080', w: 1920, h: 1080 },
];
