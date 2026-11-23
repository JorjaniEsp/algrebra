// Método gráfico (2 variables): rectas, vértices y óptimo con fracciones exactas.
// No dibuja nada: solo calcula. El dibujo está en dibujo-grafico.js.

import { Fraccion, CERO, UNO } from "./fraccion.js";

const OPERADORES = { "<=": "≤", ">=": "≥", "=": "=" };
export const simboloOperador = (op) => OPERADORES[op];

// Sustituye el punto en la restricción y dice si la cumple.
export function evaluar(restriccion, punto) {
  const izquierda = restriccion.a[0].multiplicar(punto[0]).sumar(restriccion.a[1].multiplicar(punto[1]));
  const c = izquierda.comparar(restriccion.b);
  const cumple = restriccion.op === "<=" ? c <= 0 : restriccion.op === ">=" ? c >= 0 : c === 0;
  return { izquierda, cumple };
}

// Las restricciones y los dos ejes (x₁ = 0 y x₂ = 0) son las rectas que se cortan.
function listaRectas(restricciones) {
  const rectas = restricciones.map((r, i) => ({ nombre: `R${i + 1}`, a: r.a, b: r.b }));
  rectas.push({ nombre: "x₁ = 0", a: [UNO, CERO], b: CERO });
  rectas.push({ nombre: "x₂ = 0", a: [CERO, UNO], b: CERO });
  return rectas;
}

// Punto donde se cortan dos rectas (regla de Cramer). Null si son paralelas.
function cortar(r1, r2) {
  const det = r1.a[0].multiplicar(r2.a[1]).restar(r1.a[1].multiplicar(r2.a[0]));
  if (det.esCero()) return null;
  const x = r1.b.multiplicar(r2.a[1]).restar(r1.a[1].multiplicar(r2.b)).dividir(det);
  const y = r1.a[0].multiplicar(r2.b).restar(r1.b.multiplicar(r2.a[0])).dividir(det);
  return [x, y];
}

// Primera restricción que el punto incumple (o null si cumple todas, incluido x ≥ 0).
function primerIncumplimiento(restricciones, punto) {
  if (punto[0].esNegativa()) return { nombre: "x₁ ≥ 0", detalle: `x₁ = ${punto[0]} < 0` };
  if (punto[1].esNegativa()) return { nombre: "x₂ ≥ 0", detalle: `x₂ = ${punto[1]} < 0` };
  for (let i = 0; i < restricciones.length; i++) {
    const { izquierda, cumple } = evaluar(restricciones[i], punto);
    if (!cumple) {
      const signo = restricciones[i].op === "<=" ? ">" : restricciones[i].op === ">=" ? "<" : "≠";
      return { nombre: `R${i + 1}`, detalle: `${izquierda} ${signo} ${restricciones[i].b}` };
    }
  }
  return null;
}

// Punto de prueba para saber de qué lado está la región: el origen, o el primero que no esté sobre la recta.
function puntoDePrueba(restriccion) {
  const candidatos = [[0, 0], [1, 0], [0, 1], [1, 1], [2, 3]];
  for (const [x, y] of candidatos) {
    const p = [new Fraccion(x), new Fraccion(y)];
    if (evaluar(restriccion, p).izquierda.comparar(restriccion.b) !== 0) return p;
  }
  return [CERO, CERO];
}

// Direcciones en las que se puede avanzar sin salir de la región (región no acotada).
function direccionesLibres(restricciones) {
  const candidatas = [[UNO, CERO], [CERO, UNO]];
  restricciones.forEach((r) => {
    const dir = [CERO.restar(r.a[1]), r.a[0]];
    candidatas.push(dir, [CERO.restar(dir[0]), CERO.restar(dir[1])]);
  });
  return candidatas.filter((d) => {
    if (d[0].esNegativa() || d[1].esNegativa()) return false;
    if (d[0].esCero() && d[1].esCero()) return false;
    return restricciones.every((r) => {
      const v = r.a[0].multiplicar(d[0]).sumar(r.a[1].multiplicar(d[1]));
      return r.op === "<=" ? !v.esPositiva() : r.op === ">=" ? !v.esNegativa() : v.esCero();
    });
  });
}

// modelo = { sentido: "max" | "min", c: [Fraccion, Fraccion], restricciones: [{ a: [F, F], op, b: F }] }
export function analizarGrafico(modelo) {
  const { sentido, c, restricciones } = modelo;
  const rectas = listaRectas(restricciones);

  // Cada restricción: interceptos con los ejes y lado factible.
  const tablaRectas = restricciones.map((r, i) => ({
    nombre: `R${i + 1}`,
    interceptoX1: r.a[0].esCero() ? null : [r.b.dividir(r.a[0]), CERO],
    interceptoX2: r.a[1].esCero() ? null : [CERO, r.b.dividir(r.a[1])],
  }));
  const lados = restricciones.map((r, i) => {
    if (r.op === "=") return { nombre: `R${i + 1}`, igualdad: true };
    const punto = puntoDePrueba(r);
    const { izquierda, cumple } = evaluar(r, punto);
    return { nombre: `R${i + 1}`, igualdad: false, punto, izquierda, cumple };
  });

  // Todos los puntos donde se cortan dos rectas, sin repetir.
  const mapa = new Map();
  for (let i = 0; i < rectas.length; i++) {
    for (let j = i + 1; j < rectas.length; j++) {
      const punto = cortar(rectas[i], rectas[j]);
      if (!punto) continue;
      const clave = `${punto[0]}|${punto[1]}`;
      if (!mapa.has(clave)) mapa.set(clave, { punto, rectas: [] });
      const nombres = mapa.get(clave).rectas;
      [rectas[i].nombre, rectas[j].nombre].forEach((n) => nombres.includes(n) || nombres.push(n));
    }
  }
  const intersecciones = [...mapa.values()].map((e) => {
    const incumple = primerIncumplimiento(restricciones, e.punto);
    return { ...e, factible: incumple === null, incumple };
  });

  const valorZ = (p) => c[0].multiplicar(p[0]).sumar(c[1].multiplicar(p[1]));
  const vertices = intersecciones.filter((e) => e.factible).map((e) => ({ punto: e.punto, z: valorZ(e.punto), esOptimo: false }));

  const resultado = { sentido, rectas: tablaRectas, lados, intersecciones, vertices, estado: "infactible", optimo: null, direccion: null };
  if (vertices.length === 0) return resultado;

  // ¿Se puede mejorar Z sin límite? ¿O hay una semirrecta de soluciones óptimas?
  const mejora = (v) => (sentido === "max" ? v.esPositiva() : v.esNegativa());
  const libres = direccionesLibres(restricciones);
  const mejoran = libres.find((d) => mejora(c[0].multiplicar(d[0]).sumar(c[1].multiplicar(d[1]))));
  if (mejoran) {
    resultado.estado = "no_acotado";
    resultado.direccion = mejoran;
    return resultado;
  }
  const neutra = libres.find((d) => c[0].multiplicar(d[0]).sumar(c[1].multiplicar(d[1])).esCero());

  let mejor = vertices[0].z;
  vertices.forEach((v) => {
    const cmp = v.z.comparar(mejor);
    if (sentido === "max" ? cmp > 0 : cmp < 0) mejor = v.z;
  });
  vertices.forEach((v) => (v.esOptimo = v.z.comparar(mejor) === 0));
  const optimos = vertices.filter((v) => v.esOptimo);
  resultado.optimo = { z: mejor, puntos: optimos.map((v) => v.punto) };
  if (optimos.length > 1) resultado.estado = "multiple";
  else if (neutra) {
    resultado.estado = "multiple";
    resultado.direccion = neutra;
  } else resultado.estado = "optimo";
  return resultado;
}
