// Genera el logo de Nexpak con geometria isometrica exacta.
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');
const sharp = require('sharp');
const pngToIco = require('png-to-ico').default || require('png-to-ico');

const OUT = path.join(__dirname, 'marca');
fs.mkdirSync(OUT, { recursive: true });

const AZUL = '#0F2D5E';
const NARANJA = '#E8500A';
const r = (n) => Math.round(n * 100) / 100;

// ---------- Isotipo ----------
// Caja isometrica (bordes a 30 grados, s = tan 30). Ancho 80.
// Tapa: rombo escalado k respecto al rombo superior de la caja.
// N: una sola figura (trazo izquierdo + diagonal + trazo derecho).
function isotipo({ k = 0.8, t = 15, v = 12 } = {}) {
  const s = Math.tan(Math.PI / 6);
  const W = 80, half = W / 2;
  const yL = half * s;                 // altura del vertice lateral del rombo
  // Diagonal: borde superior desde (0,yL) con pendiente s.
  const yDiagTopAtT = yL + t * s;
  const yDiagLowAtT = yDiagTopAtT + v;
  const xR = W - t;                    // borde interno del trazo derecho
  const yDiagLowAtXR = yDiagLowAtT + (xR - t) * s;
  // Altura H de las caras para que la diagonal termine en la esquina inferior del trazo derecho
  const H = yDiagLowAtXR - yL - t * s;
  const yTopRightStem = (yL + half * s) - (xR - half) * s;
  const N = [
    [0, yL],
    [xR, yL + xR * s],
    [xR, yTopRightStem],
    [W, yL],
    [W, yL + H],
    [xR, yL + H + t * s],
    [t, yDiagLowAtT],
    [t, yL + H + t * s],
    [0, yL + H],
  ];
  const cy = yL;
  const tapa = [
    [half, cy - k * half * s],
    [half - k * half, cy],
    [half, cy + k * half * s],
    [half + k * half, cy],
  ];
  // Normalizar para que la tapa toque y=0
  const dy = tapa[0][1];
  const mover = (p) => p.map(([x, y]) => [r(x), r(y - dy)]);
  const n2 = mover(N), t2 = mover(tapa);
  const alto = Math.max(...n2.map((p) => p[1]));
  const pts = (p) => p.map(([x, y]) => `${x} ${y}`).join(' L');
  return {
    ancho: W,
    alto: r(alto),
    tapa: `M${pts(t2)}Z`,
    n: `M${pts(n2)}Z`,
    // altura del cuerpo de la N (para alinear el texto)
    nTop: r(yL - dy),
    nBottom: r(alto),
  };
}

const iso = isotipo();
const isoFav = isotipo({ k: 0.66, t: 17, v: 14 }); // separaciones mas gruesas para 16 px

const colores = {
  color: { tapa: NARANJA, n: AZUL, texto: AZUL },
  blanco: { tapa: NARANJA, n: '#FFFFFF', texto: '#FFFFFF' },
  negro: { tapa: '#000000', n: '#000000', texto: '#000000' },
};

function svgIsotipo(c, g = iso) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.ancho} ${g.alto}" role="img" aria-label="Nexpak"><path fill="${c.tapa}" d="${g.tapa}"/><path fill="${c.n}" d="${g.n}"/></svg>\n`;
}

// ---------- Logotipo (texto convertido a trazos) ----------
const fuente = (w) =>
  opentype.parse(
    fs.readFileSync(require.resolve(`@fontsource/archivo/files/archivo-latin-${w}-normal.woff`)).buffer
      .slice(0)
  );
const archivo800 = fuente(800);
const archivo500 = fuente(500);

function textoAPath(font, texto, { x = 0, baseline, capAltura, tracking = 0 }) {
  const capH = (font.tables.os2.sCapHeight || font.ascender * 0.7) / font.unitsPerEm;
  const size = capAltura / capH;
  let cursor = x;
  const partes = [];
  const glyphs = Array.from(texto).map((ch) => font.charToGlyph(ch));
  glyphs.forEach((gl, i) => {
    const p = gl.getPath(cursor, baseline, size);
    partes.push(p.toPathData(2));
    let adv = (gl.advanceWidth / font.unitsPerEm) * size;
    if (i < glyphs.length - 1) {
      adv += (font.getKerningValue(gl, glyphs[i + 1]) / font.unitsPerEm) * size;
      adv += tracking * size;
    }
    cursor += adv;
  });
  return { d: partes.join(''), ancho: cursor - x, size };
}

// Altura de mayusculas = altura del cuerpo de la N; centrado en el cuerpo de la N.
const cuerpoN = iso.nBottom - iso.nTop;
const capAltura = r(cuerpoN * 0.78);
const centroN = iso.nTop + cuerpoN / 2;
const separacion = 22;
const txt = textoAPath(archivo800, 'NEXPAK', {
  x: iso.ancho + separacion,
  baseline: centroN + capAltura / 2,
  capAltura,
  tracking: 0.06,
});
const anchoHorizontal = r(iso.ancho + separacion + txt.ancho);

function svgHorizontal(c) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${anchoHorizontal} ${iso.alto}" role="img" aria-label="Nexpak"><path fill="${c.tapa}" d="${iso.tapa}"/><path fill="${c.n}" d="${iso.n}"/><path fill="${c.texto}" d="${txt.d}"/></svg>\n`;
}

// ---------- Icono cuadrado (fondo azul, N blanca, tapa naranja) ----------
function svgIcono(lado, { margen = 0.2, radio = 0.22, g = iso } = {}) {
  const util = lado * (1 - margen * 2);
  const esc = util / Math.max(g.ancho, g.alto);
  const tx = (lado - g.ancho * esc) / 2;
  const ty = (lado - g.alto * esc) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}"><rect width="${lado}" height="${lado}" rx="${r(lado * radio)}" fill="${AZUL}"/><g transform="translate(${r(tx)} ${r(ty)}) scale(${r(esc * 1000) / 1000})"><path fill="${NARANJA}" d="${g.tapa}"/><path fill="#FFFFFF" d="${g.n}"/></g></svg>\n`;
}

// ---------- Imagen para compartir (1200x630) ----------
function svgOg() {
  const W = 1200, Hh = 630;
  const esc = 680 / anchoHorizontal;
  const anchoLogo = anchoHorizontal * esc;
  const lx = (W - anchoLogo) / 2;
  const ly = 205;
  const lema = textoAPath(archivo500, 'Rastrea tu envío internacional en tiempo real', {
    x: 0, baseline: 0, capAltura: 26, tracking: 0.01,
  });
  const lemaX = (W - lema.ancho) / 2;
  const lemaFinal = textoAPath(archivo500, 'Rastrea tu envío internacional en tiempo real', {
    x: lemaX, baseline: ly + iso.alto * esc + 75, capAltura: 26, tracking: 0.01,
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${Hh}"><rect width="${W}" height="${Hh}" fill="${AZUL}"/><g transform="translate(${r(lx)} ${ly}) scale(${esc})"><path fill="${NARANJA}" d="${iso.tapa}"/><path fill="#FFFFFF" d="${iso.n}"/><path fill="#FFFFFF" d="${txt.d}"/></g><path fill="#C9D3E3" d="${lemaFinal.d}"/><rect x="0" y="${Hh - 10}" width="${W}" height="10" fill="${NARANJA}"/></svg>\n`;
}

// ---------- Escribir archivos ----------
const escribir = (nombre, contenido) => fs.writeFileSync(path.join(OUT, nombre), contenido);

for (const [tono, c] of Object.entries(colores)) {
  const suf = tono === 'color' ? '' : `-${tono}`;
  escribir(`isotipo${suf}.svg`, svgIsotipo(c));
  escribir(`logo-horizontal${suf}.svg`, svgHorizontal(c));
}
escribir('favicon.svg', svgIcono(64, { margen: 0.14, radio: 0.2, g: isoFav }));
escribir('og-image.svg', svgOg());

(async () => {
  const png = (svg, size, file) => sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(OUT, file));
  await png(svgIcono(180, { margen: 0.2, radio: 0 }), 180, 'apple-touch-icon.png');
  await png(svgIcono(192), 192, 'icon-192.png');
  await png(svgIcono(512), 512, 'icon-512.png');
  await png(svgIcono(512, { margen: 0.28, radio: 0 }), 512, 'icon-maskable-512.png');
  await sharp(Buffer.from(svgOg())).png().toFile(path.join(OUT, 'og-image.png'));
  fs.unlinkSync(path.join(OUT, 'og-image.svg'));
  const icoPngs = [];
  for (const s of [16, 32, 48]) {
    const f = path.join(OUT, `_fav${s}.png`);
    await sharp(Buffer.from(svgIcono(s * 4, { margen: 0.1, radio: 0.2, g: isoFav }))).resize(s, s).png().toFile(f);
    icoPngs.push(f);
  }
  fs.writeFileSync(path.join(OUT, 'favicon.ico'), await pngToIco(icoPngs));
  icoPngs.forEach((f) => fs.unlinkSync(f));

  // Hoja de prueba para revisar visualmente
  const hoja = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900" viewBox="0 0 1400 900">
<rect width="1400" height="900" fill="#FFFFFF"/>
<g transform="translate(60 60) scale(3)">${svgIsotipo(colores.color).replace(/<\/?svg[^>]*>/g, '')}</g>
<g transform="translate(400 90) scale(2)">${svgHorizontal(colores.color).replace(/<\/?svg[^>]*>/g, '')}</g>
<rect x="0" y="330" width="1400" height="260" fill="${AZUL}"/>
<g transform="translate(60 380) scale(2)">${svgHorizontal(colores.blanco).replace(/<\/?svg[^>]*>/g, '')}</g>
<g transform="translate(60 640) scale(2)">${svgHorizontal(colores.negro).replace(/<\/?svg[^>]*>/g, '')}</g>
${[16, 32, 64, 128].map((s, i) => `<g transform="translate(${820 + i * 150} 680)">${svgIcono(s, { margen: s < 40 ? 0.1 : 0.2, g: s < 40 ? isoFav : iso }).replace('<svg ', `<svg width="${s}" height="${s}" `)}</g>`).join('')}
</svg>`;
  await sharp(Buffer.from(hoja)).png().toFile(path.join(__dirname, 'hoja-marca.png'));
  console.log('ok', { anchoHorizontal, alto: iso.alto, capAltura, fuente: txt.size });
})();
