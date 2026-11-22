// Interfaz: lee la cuadrícula, llama al símplex y muestra cada paso.

import { Fraccion } from "./fraccion.js";
import { resolverSimplex, subindice } from "./simplex.js";
import { verificarRestricciones, verificarDualidad } from "./verificacion.js";
import { EJEMPLOS } from "./ejemplos.js";

const $ = (id) => document.getElementById(id);

// Muestra una fracción con el signo menos tipográfico (−1/4).
const f = (fraccion) => String(fraccion).replace("-", "−");

// ---------- Cuadrícula de entrada ----------

function crearCuadricula(n, m, datos = null) {
  let html = '<div class="tabla-scroll"><table><tr><th></th>';
  for (let j = 0; j < n; j++) html += `<th>x${subindice(j + 1)}</th>`;
  html += "<th></th><th>b</th></tr>";

  html += "<tr><th>c</th>";
  for (let j = 0; j < n; j++) {
    html += `<td><input id="c-${j}" value="${datos ? datos.c[j] : ""}"></td>`;
  }
  html += "<td></td><td></td></tr>";

  for (let i = 0; i < m; i++) {
    html += `<tr><th>R${i + 1}</th>`;
    for (let j = 0; j < n; j++) {
      html += `<td><input id="a-${i}-${j}" value="${datos ? datos.A[i][j] : ""}"></td>`;
    }
    html += `<td>≤</td><td><input id="b-${i}" value="${datos ? datos.b[i] : ""}"></td></tr>`;
  }
  html += "</table></div>";

  $("cuadricula").innerHTML = html;
  $("cuadricula").dataset.n = n;
  $("cuadricula").dataset.m = m;
}

function cargarEjemplo(nombre) {
  const e = EJEMPLOS[nombre];
  $("num-variables").value = e.c.length;
  $("num-restricciones").value = e.b.length;
  crearCuadricula(e.c.length, e.b.length, e);
  limpiarSalida();
}

// Lee un campo y lo convierte en Fraccion; si está mal, lanza un error claro.
function leerCampo(id, descripcion) {
  const texto = $(id).value;
  if (texto.trim() === "") throw new Error(`Falta el valor de ${descripcion}.`);
  try {
    return Fraccion.desdeTexto(texto);
  } catch {
    throw new Error(`El valor de ${descripcion} ("${texto}") no es un número válido.`);
  }
}

function leerModelo() {
  const n = Number($("cuadricula").dataset.n);
  const m = Number($("cuadricula").dataset.m);
  const c = [];
  const A = [];
  const b = [];

  for (let j = 0; j < n; j++) c.push(leerCampo(`c-${j}`, `c${subindice(j + 1)}`));
  for (let i = 0; i < m; i++) {
    const fila = [];
    for (let j = 0; j < n; j++) {
      fila.push(leerCampo(`a-${i}-${j}`, `R${i + 1}, x${subindice(j + 1)}`));
    }
    A.push(fila);
    b.push(leerCampo(`b-${i}`, `b de R${i + 1}`));
    if (b[i].esNegativa()) {
      throw new Error(`b de R${i + 1} es negativo. Este programa solo resuelve modelos con b ≥ 0.`);
    }
  }
  return { c, A, b };
}

// ---------- Salida ----------

function limpiarSalida() {
  $("error").textContent = "";
  $("pasos").innerHTML = "";
  $("resultado").innerHTML = "";
}

// Dibuja una tabla del símplex; resalta la columna y el pivote si se indican.
function dibujarTabla(tabla, base, nombres, resaltar = null) {
  const m = tabla.length - 1;
  let html = '<div class="tabla-scroll"><table><tr><th>Base</th>';
  nombres.forEach((nombre, j) => {
    const clase = resaltar && resaltar.columna === j ? ' class="columna-pivote"' : "";
    html += `<th${clase}>${nombre}</th>`;
  });
  html += "<th>b</th></tr>";

  tabla.forEach((fila, i) => {
    const esZ = i === m;
    html += `<tr${esZ ? ' class="fila-z"' : ""}><th>${esZ ? "Z" : nombres[base[i]]}</th>`;
    fila.forEach((valor, j) => {
      let clase = "";
      if (resaltar && resaltar.columna === j) {
        clase = resaltar.fila === i ? "pivote" : "columna-pivote";
      }
      html += `<td${clase ? ` class="${clase}"` : ""}>${f(valor)}</td>`;
    });
    html += "</tr>";
  });
  return html + "</table></div>";
}

function textoRazones(razones, ultima, tablaAnterior, columna) {
  return razones
    .map((razon, i) => {
      if (razon === null) return `F${subindice(i + 1)}: no cuenta`;
      const b = tablaAnterior[i][ultima];
      const a = tablaAnterior[i][columna];
      return `F${subindice(i + 1)}: ${f(b)} ÷ ${f(a)} = ${f(razon)}`;
    })
    .join(" · ");
}

function mostrarPasos(r) {
  const { pasos, nombres } = r;
  let html = "";
  let anterior = pasos[0];

  // La tabla inicial se muestra resaltando el pivote de la primera iteración.
  const primera = pasos[1] && pasos[1].tipo === "iteracion" ? pasos[1] : null;
  html += '<div class="tarjeta"><h2>2. Tabla inicial</h2>';
  html += dibujarTabla(anterior.tabla, anterior.base, nombres,
    primera ? { columna: primera.entra, fila: primera.fila } : null);
  html += "</div>";

  for (const paso of pasos.slice(1)) {
    const ultima = anterior.tabla[0].length - 1;
    html += `<div class="tarjeta"><h2>Iteración ${paso.iteracion}</h2>`;
    const valorZ = anterior.tabla[anterior.tabla.length - 1][paso.entra];
    html += `<p class="dato"><b>Entra</b> ${nombres[paso.entra]} (${f(valorZ)}, el número más negativo de la fila Z).</p>`;
    html += `<p class="dato"><b>Razones</b> b ÷ columna: ${textoRazones(paso.razones, ultima, anterior.tabla, paso.entra)}</p>`;

    if (paso.tipo === "ilimitado") {
      html += '<p class="dato mal">Ningún número de la columna pivote es positivo: el problema es ilimitado (Z puede crecer sin límite).</p></div>';
      break;
    }

    html += `<p class="dato"><b>Sale</b> ${nombres[paso.sale]} (menor razón). <b>Pivote</b> = ${f(paso.pivote)}.</p>`;
    html += `<p class="operaciones">${paso.operaciones.join("<br>")}</p>`;

    // Se resalta el pivote de la siguiente iteración, si existe.
    const indice = pasos.indexOf(paso);
    const siguiente = pasos[indice + 1] && pasos[indice + 1].tipo === "iteracion" ? pasos[indice + 1] : null;
    html += "<p>∼</p>";
    html += dibujarTabla(paso.tabla, paso.base, nombres,
      siguiente ? { columna: siguiente.entra, fila: siguiente.fila } : null);
    html += "</div>";
    anterior = paso;
  }

  $("pasos").innerHTML = html;
}

function mostrarResultado(r, modelo) {
  if (r.estado === "ilimitado") {
    $("resultado").innerHTML = '<div class="tarjeta"><h2>3. Resultado</h2><p class="mal">El problema no tiene óptimo: es ilimitado.</p></div>';
    return;
  }
  if (r.estado !== "optimo") {
    $("resultado").innerHTML = '<div class="tarjeta"><h2>3. Resultado</h2><p class="mal">No se llegó al óptimo en el límite de iteraciones.</p></div>';
    return;
  }

  const res = r.resultado;
  const n = res.x.length;
  const lista = (valores) => `(${valores.map(f).join(", ")})`;

  let html = '<div class="tarjeta"><h2>3. Resultado</h2>';
  html += '<p class="dato ok">Ningún número de la fila Z es negativo: la solución es óptima.</p>';
  html += '<div class="resumen">';
  html += `<div><span>Solución (${r.nombres.slice(0, n).join(", ")})</span><strong>${lista(res.x)}</strong></div>`;
  html += `<div><span>Z*</span><strong>${f(res.z)}</strong></div>`;
  html += `<div><span>Holguras</span><strong>${lista(res.holguras)}</strong></div>`;
  html += `<div><span>Precios sombra</span><strong>${lista(res.preciosSombra)}</strong></div>`;
  html += "</div>";

  if (res.multiplesOptimos) {
    html += '<p class="dato aviso">Hay una variable no básica con 0 en la fila Z: existe más de una solución óptima.</p>';
  }

  // Comprobación, igual que en el informe.
  html += "<h2>4. Comprobación</h2>";
  for (const v of verificarRestricciones(modelo.A, modelo.b, res.x)) {
    const estado = v.cumple ? (v.seAgota ? "se agota" : "sobra") : "no cumple";
    html += `<p class="dato ${v.cumple ? "ok" : "mal"}">R${v.restriccion}: ${f(v.izquierda)} ≤ ${f(v.derecha)} ${v.cumple ? "✓" : "✗"} (${estado})</p>`;
  }
  const dual = verificarDualidad(modelo.b, res.preciosSombra, res.z);
  const suma = modelo.b.map((bi, i) => `${f(bi)}·${f(res.preciosSombra[i])}`).join(" + ");
  html += `<p class="dato ${dual.coincide ? "ok" : "mal"}">Dualidad: ${suma} = ${f(dual.valorDual)} ${dual.coincide ? "= Z* ✓" : "≠ Z* ✗"}</p>`;
  html += "</div>";

  $("resultado").innerHTML = html;
}

// ---------- Eventos ----------

document.querySelectorAll("[data-ejemplo]").forEach((boton) => {
  boton.addEventListener("click", () => cargarEjemplo(boton.dataset.ejemplo));
});

$("crear-cuadricula").addEventListener("click", () => {
  const n = Number($("num-variables").value);
  const m = Number($("num-restricciones").value);
  if (!(n >= 1 && n <= 8 && m >= 1 && m <= 8)) {
    $("error").textContent = "Use entre 1 y 8 variables y entre 1 y 8 restricciones.";
    return;
  }
  crearCuadricula(n, m);
  limpiarSalida();
});

$("resolver").addEventListener("click", () => {
  limpiarSalida();
  try {
    const modelo = leerModelo();
    const r = resolverSimplex(modelo.c, modelo.A, modelo.b);
    mostrarPasos(r);
    mostrarResultado(r, modelo);
    $("pasos").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    $("error").textContent = error.message;
  }
});

cargarEjemplo("servidor");
