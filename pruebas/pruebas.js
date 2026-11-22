// Pruebas: se ejecutan con "node pruebas.js".
// Comprueban que el programa da los mismos resultados que la resolución a mano.

import { Fraccion } from "../js/fraccion.js";
import { resolverSimplex } from "../js/simplex.js";
import { verificarRestricciones, verificarDualidad } from "../js/verificacion.js";
import { EJEMPLOS } from "../js/ejemplos.js";

let fallos = 0;
function revisar(descripcion, obtenido, esperado) {
  const ok = obtenido === esperado;
  if (!ok) fallos++;
  console.log(`${ok ? "OK   " : "FALLA"} ${descripcion}: ${obtenido}${ok ? "" : ` (se esperaba ${esperado})`}`);
}

const aFracciones = (lista) => lista.map((v) => Fraccion.desdeTexto(v));
const texto = (lista) => lista.map(String).join(", ");

function probarEjemplo(nombre, esperado) {
  const e = EJEMPLOS[nombre];
  const c = aFracciones(e.c);
  const A = e.A.map(aFracciones);
  const b = aFracciones(e.b);
  const r = resolverSimplex(c, A, b);
  const iteraciones = r.pasos.filter((p) => p.tipo === "iteracion").length;

  console.log(`\n${e.titulo}`);
  revisar("estado", r.estado, "optimo");
  revisar("iteraciones", iteraciones, esperado.iteraciones);
  revisar("x", texto(r.resultado.x), esperado.x);
  revisar("Z*", String(r.resultado.z), esperado.z);
  revisar("holguras", texto(r.resultado.holguras), esperado.holguras);
  revisar("precios sombra", texto(r.resultado.preciosSombra), esperado.precios);
  revisar("restricciones", verificarRestricciones(A, b, r.resultado.x).every((v) => v.cumple), true);
  revisar("dualidad", verificarDualidad(b, r.resultado.preciosSombra, r.resultado.z).coincide, true);
  return r;
}

const servidor = probarEjemplo("servidor", {
  iteraciones: 2, x: "2, 6, 0", z: "44", holguras: "0, 0, 20", precios: "1/2, 1/4, 0",
});
probarEjemplo("guia", {
  iteraciones: 2, x: "6, 4", z: "360", holguras: "0, 0, 4", precios: "20, 10, 0",
});

// La primera iteración del caso real debe coincidir con la Tabla 11 del informe.
const it1 = servidor.pasos[1];
console.log("\nIteración 1 del caso real");
revisar("operaciones", it1.operaciones.join("; "), "F₂ ← F₂ ÷ 16; F₁ ← F₁ − 4·F₂; F₃ ← F₃ − 20·F₂; Z ← Z + 6·F₂");
revisar("fila Z", texto(it1.tabla[3]), "-1, 0, 1/2, 0, 3/8, 0, 42");

// Problema ilimitado: maximizar x₁ con solo x₁ − x₂ ≤ 1.
const ilimitado = resolverSimplex(aFracciones(["1", "0"]), [aFracciones(["1", "-1"])], aFracciones(["1"]));
console.log("\nProblema ilimitado");
revisar("estado", ilimitado.estado, "ilimitado");

// Fracciones
console.log("\nFracciones");
revisar("1/2 + 1/3", String(Fraccion.desdeTexto("1/2").sumar(Fraccion.desdeTexto("1/3"))), "5/6");
revisar("0,25 como fracción", String(Fraccion.desdeTexto("0,25")), "1/4");
revisar("-6/8 simplificada", String(Fraccion.desdeTexto("-6/8")), "-3/4");

console.log(fallos === 0 ? "\nTodas las pruebas pasaron." : `\n${fallos} prueba(s) fallaron.`);
process.exit(fallos === 0 ? 0 : 1);
