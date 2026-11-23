// Dibujo SVG del método gráfico. Los decimales se usan solo para dibujar;
// los números que se muestran salen de las fracciones exactas.

const ANCHO = 680;
const ALTO = 500;
const MI = 58; // margen izquierdo
const MD = 28; // margen derecho
const MS = 22; // margen superior
const MINF = 52; // margen inferior

const num = (fr) => Number(fr.num) / Number(fr.den);
const fmt = (fr) => String(fr).replace("-", "−");
const redondear = (v) => Math.round(v * 100) / 100;

// Paso "redondo" para las marcas de los ejes (1, 2, 5, 10, 20...).
function pasoMarcas(maximo) {
  const bruto = maximo / 8;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const f = bruto / potencia;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * potencia;
}

// Hasta dónde llega el gráfico: un poco más allá del vértice más lejano.
function limites(analisis) {
  const xs = [];
  const ys = [];
  if (analisis.vertices.length > 0) {
    analisis.vertices.forEach((v) => {
      xs.push(num(v.punto[0]));
      ys.push(num(v.punto[1]));
    });
  } else {
    analisis.rectas.forEach((r) => {
      if (r.interceptoX1 && num(r.interceptoX1[0]) > 0) xs.push(num(r.interceptoX1[0]));
      if (r.interceptoX2 && num(r.interceptoX2[1]) > 0) ys.push(num(r.interceptoX2[1]));
    });
  }
  let xmax = (xs.length ? Math.max(...xs) : 10) || 1;
  let ymax = (ys.length ? Math.max(...ys) : 10) || 1;
  // Si la región no está acotada, se deja más espacio para que se note que sigue.
  const holgura = analisis.direccion ? 2.2 : 1.3;
  xmax *= holgura;
  ymax *= holgura;
  // Evita un gráfico demasiado aplastado en un solo eje.
  return { xmax: Math.max(xmax, ymax * 0.4), ymax: Math.max(ymax, xmax * 0.4) };
}

// Recorta el polígono con a₁x + a₂y (≤ o ≥) b (Sutherland-Hodgman).
function recortar(poligono, a1, a2, b, op) {
  const signo = op === "<=" ? 1 : -1;
  const valor = (p) => signo * (a1 * p[0] + a2 * p[1] - b);
  const dentro = (p) => valor(p) <= 1e-9;
  const resultado = [];
  poligono.forEach((actual, i) => {
    const siguiente = poligono[(i + 1) % poligono.length];
    if (dentro(actual)) resultado.push(actual);
    if (dentro(actual) !== dentro(siguiente)) {
      const t = valor(actual) / (valor(actual) - valor(siguiente));
      resultado.push([actual[0] + t * (siguiente[0] - actual[0]), actual[1] + t * (siguiente[1] - actual[1])]);
    }
  });
  return resultado;
}

// Región factible dentro del gráfico (null si hay una igualdad: entonces la región es un segmento).
function poligonoRegion(restricciones, xmax, ymax) {
  let poligono = [[0, 0], [xmax, 0], [xmax, ymax], [0, ymax]];
  for (const r of restricciones) {
    if (r.op === "=") return null;
    poligono = recortar(poligono, num(r.a[0]), num(r.a[1]), num(r.b), r.op);
    if (poligono.length === 0) break;
  }
  return poligono;
}

// Parte de la recta a₁x + a₂y = b que cae dentro del gráfico.
function segmentoEnCaja(a1, a2, b, xmax, ymax) {
  const e = 1e-9;
  const puntos = [];
  if (a2 !== 0) {
    [0, xmax].forEach((x) => puntos.push([x, (b - a1 * x) / a2]));
  }
  if (a1 !== 0) {
    [0, ymax].forEach((y) => puntos.push([(b - a2 * y) / a1, y]));
  }
  const dentro = puntos.filter((p) => p[0] >= -e && p[0] <= xmax + e && p[1] >= -e && p[1] <= ymax + e);
  if (dentro.length < 2) return null;
  let mejor = [dentro[0], dentro[1]];
  let distancia = -1;
  for (let i = 0; i < dentro.length; i++) {
    for (let j = i + 1; j < dentro.length; j++) {
      const d = Math.hypot(dentro[i][0] - dentro[j][0], dentro[i][1] - dentro[j][1]);
      if (d > distancia) {
        distancia = d;
        mejor = [dentro[i], dentro[j]];
      }
    }
  }
  return distancia > 1e-9 ? mejor : null;
}

export function dibujarGrafico(modelo, analisis) {
  const { xmax, ymax } = limites(analisis);
  const X = (x) => MI + (x / xmax) * (ANCHO - MI - MD);
  const Y = (y) => ALTO - MINF - (y / ymax) * (ALTO - MINF - MS);
  const puntosSvg = (lista) => lista.map((p) => `${redondear(X(p[0]))},${redondear(Y(p[1]))}`).join(" ");

  let s = `<svg class="grafico-svg" viewBox="0 0 ${ANCHO} ${ALTO}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Gráfico de las restricciones, la región factible y sus vértices">`;

  // Cuadrícula y marcas
  const pasoX = pasoMarcas(xmax);
  const pasoY = pasoMarcas(ymax);
  for (let x = 0; x <= xmax + 1e-9; x += pasoX) {
    s += `<line class="g-malla" x1="${redondear(X(x))}" y1="${Y(0)}" x2="${redondear(X(x))}" y2="${Y(ymax)}"/>`;
    s += `<text class="g-marca" x="${redondear(X(x))}" y="${Y(0) + 20}" text-anchor="middle">${redondear(x)}</text>`;
  }
  for (let y = 0; y <= ymax + 1e-9; y += pasoY) {
    s += `<line class="g-malla" x1="${X(0)}" y1="${redondear(Y(y))}" x2="${X(xmax)}" y2="${redondear(Y(y))}"/>`;
    s += `<text class="g-marca" x="${X(0) - 8}" y="${redondear(Y(y)) + 5}" text-anchor="end">${redondear(y)}</text>`;
  }

  // Región factible (sombreada) o, si hay una igualdad, el segmento factible
  const region = poligonoRegion(modelo.restricciones, xmax, ymax);
  if (region && region.length >= 3) {
    s += `<polygon class="g-region" points="${puntosSvg(region)}"/>`;
  } else if (!region && analisis.vertices.length >= 2) {
    const ordenados = analisis.vertices.map((v) => [num(v.punto[0]), num(v.punto[1])]).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    s += `<polyline class="g-segmento" points="${puntosSvg(ordenados)}"/>`;
  }

  // Rectas de las restricciones
  modelo.restricciones.forEach((r, i) => {
    const seg = segmentoEnCaja(num(r.a[0]), num(r.a[1]), num(r.b), xmax, ymax);
    if (!seg) return;
    s += `<line class="g-recta" x1="${redondear(X(seg[0][0]))}" y1="${redondear(Y(seg[0][1]))}" x2="${redondear(X(seg[1][0]))}" y2="${redondear(Y(seg[1][1]))}"/>`;
    // Etiqueta cerca del extremo más alejado del origen, un poco hacia adentro
    const lejos = Math.hypot(seg[0][0] / xmax, seg[0][1] / ymax) > Math.hypot(seg[1][0] / xmax, seg[1][1] / ymax) ? 0 : 1;
    const e = seg[lejos];
    const o = seg[1 - lejos];
    const px = X(e[0]) + (X(o[0]) - X(e[0])) * 0.08;
    const py = Y(e[1]) + (Y(o[1]) - Y(e[1])) * 0.08;
    s += `<text class="g-etiqueta" x="${redondear(Math.min(px, ANCHO - MD - 4))}" y="${redondear(Math.max(py, MS + 12))}" text-anchor="${px > ANCHO - 90 ? "end" : "start"}">R${i + 1}</text>`;
  });

  // Recta de nivel de Z que pasa por el óptimo
  if (analisis.optimo) {
    const c1 = num(modelo.c[0]);
    const c2 = num(modelo.c[1]);
    const z = num(analisis.optimo.z);
    const seg = segmentoEnCaja(c1, c2, z, xmax, ymax);
    if (seg) {
      s += `<line class="g-nivel" x1="${redondear(X(seg[0][0]))}" y1="${redondear(Y(seg[0][1]))}" x2="${redondear(X(seg[1][0]))}" y2="${redondear(Y(seg[1][1]))}"/>`;
    }
    const optimos = analisis.optimo.puntos;
    if (optimos.length > 1) {
      const par = optimos.map((p) => [num(p[0]), num(p[1])]);
      s += `<polyline class="g-segmento-optimo" points="${puntosSvg(par)}"/>`;
    }
  }

  // Ejes
  s += `<line class="g-eje" x1="${X(0)}" y1="${Y(0)}" x2="${X(xmax)}" y2="${Y(0)}"/>`;
  s += `<line class="g-eje" x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(ymax)}"/>`;
  s += `<text class="g-titulo-eje" x="${X(xmax)}" y="${Y(0) + 40}" text-anchor="end">x₁</text>`;
  s += `<text class="g-titulo-eje" x="${X(0) - 40}" y="${MS - 4}">x₂</text>`;

  // Vértices con su coordenada
  analisis.vertices.forEach((v) => {
    const px = X(num(v.punto[0]));
    const py = Y(num(v.punto[1]));
    s += `<circle class="${v.esOptimo ? "g-optimo" : "g-vertice"}" cx="${redondear(px)}" cy="${redondear(py)}" r="${v.esOptimo ? 7 : 5}"/>`;
    const texto = `(${fmt(v.punto[0])}, ${fmt(v.punto[1])})`;
    const alinear = px > ANCHO - 110 ? "end" : "start";
    const dx = alinear === "end" ? -10 : 10;
    s += `<text class="${v.esOptimo ? "g-etiqueta-optimo" : "g-etiqueta-vertice"}" x="${redondear(px + dx)}" y="${redondear(Math.max(py - 10, MS + 4))}" text-anchor="${alinear}">${texto}</text>`;
  });

  return s + "</svg>";
}
