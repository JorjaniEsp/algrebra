// Pruebas del método gráfico: se ejecutan con "node pruebas/pruebas-grafico.js".

import { Fraccion } from "../js/fraccion.js";
import { analizarGrafico } from "../js/grafico.js";

let fallos = 0;
function revisar(descripcion, obtenido, esperado) {
  const ok = obtenido === esperado;
  if (!ok) fallos++;
  console.log(`${ok ? "OK   " : "FALLA"} ${descripcion}: ${obtenido}${ok ? "" : ` (se esperaba ${esperado})`}`);
}

const F = (t) => Fraccion.desdeTexto(t);
const modelo = (sentido, c, restricciones) => ({
  sentido,
  c: c.map(F),
  restricciones: restricciones.map(([a1, a2, op, b]) => ({ a: [F(a1), F(a2)], op, b: F(b) })),
});
const par = (p) => `(${p[0]}, ${p[1]})`;
const lista = (puntos) => puntos.map(par).sort().join(" ");

// Ejemplo guía del escrito.
console.log("\nEjemplo guía");
const guia = analizarGrafico(modelo("max", ["40", "30"], [["1", "1", "<=", "10"], ["2", "1", "<=", "16"], ["0", "1", "<=", "8"]]));
revisar("estado", guia.estado, "optimo");
revisar("vértices", lista(guia.vertices.map((v) => v.punto)), lista([[F("0"), F("0")], [F("8"), F("0")], [F("6"), F("4")], [F("2"), F("8")], [F("0"), F("8")]]));
revisar("óptimo", `${guia.optimo.puntos.map(par)} Z=${guia.optimo.z}`, "(6, 4) Z=360");
const cuatroOcho = guia.intersecciones.find((e) => par(e.punto) === "(4, 8)");
revisar("(4, 8) se descarta por R1", `${cuatroOcho.factible} ${cuatroOcho.incumple.nombre} ${cuatroOcho.incumple.detalle}`, "false R1 12 > 10");
revisar("Z en cada vértice", guia.vertices.map((v) => `${par(v.punto)}=${v.z}`).sort().join(" "), "(0, 0)=0 (0, 8)=240 (2, 8)=320 (6, 4)=360 (8, 0)=320");
revisar("intercepto de R2 con x₁", par(guia.rectas[1].interceptoX1), "(8, 0)");
revisar("lado factible de R1", `${par(guia.lados[0].punto)} ${guia.lados[0].cumple}`, "(0, 0) true");

// Minimización con restricciones ≥ (formato del ejercicio de instancias en la nube).
console.log("\nMinimizar con ≥");
const nube = analizarGrafico(modelo("min", ["3", "2"], [["4", "2", ">=", "20"], ["2", "4", ">=", "16"], ["1", "1", "<=", "7"]]));
revisar("estado", nube.estado, "optimo");
revisar("vértices", lista(nube.vertices.map((v) => v.punto)), lista([[F("4"), F("2")], [F("3"), F("4")], [F("6"), F("1")]]));
revisar("óptimo", `${nube.optimo.puntos.map(par)} Z=${nube.optimo.z}`, "(4, 2) Z=16");

console.log("\nCasos especiales");
revisar("no acotado", analizarGrafico(modelo("max", ["1", "1"], [["-1", "1", "<=", "1"]])).estado, "no_acotado");
revisar("sin solución", analizarGrafico(modelo("max", ["1", "1"], [["1", "1", "<=", "2"], ["1", "1", ">=", "5"]])).estado, "infactible");
const multiple = analizarGrafico(modelo("max", ["1", "1"], [["1", "1", "<=", "4"], ["1", "0", "<=", "3"]]));
revisar("varios óptimos", `${multiple.estado} ${lista(multiple.optimo.puntos)} Z=${multiple.optimo.z}`, "multiple (0, 4) (3, 1) Z=4");
revisar("semirrecta de óptimos", analizarGrafico(modelo("max", ["1", "0"], [["1", "0", "<=", "3"]])).estado, "multiple");
const igualdad = analizarGrafico(modelo("max", ["1", "2"], [["1", "1", "=", "4"], ["1", "0", "<=", "3"]]));
revisar("igualdad", `${igualdad.estado} ${lista(igualdad.optimo.puntos)} Z=${igualdad.optimo.z}`, "optimo (0, 4) Z=8");
const fracciones = analizarGrafico(modelo("max", ["1", "1"], [["2", "3", "<=", "7"], ["3", "1", "<=", "5"]]));
revisar("vértice con fracciones", lista(fracciones.vertices.map((v) => v.punto)), lista([[F("0"), F("0")], [F("5/3"), F("0")], [F("8/7"), F("11/7")], [F("0"), F("7/3")]]));

console.log(fallos === 0 ? "\nTodas las pruebas del método gráfico pasaron." : `\n${fallos} prueba(s) fallaron.`);
process.exit(fallos === 0 ? 0 : 1);
