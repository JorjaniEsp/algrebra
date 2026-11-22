// Interfaz: muestra el problema, llama al símplex y presenta un paso a la vez.

import { Fraccion } from "./fraccion.js";
import { resolverSimplex, subindice } from "./simplex.js";
import { verificarRestricciones, verificarDualidad } from "./verificacion.js";
import { EJEMPLOS } from "./ejemplos.js";

const $ = (id) => document.getElementById(id);

// Muestra una fracción con el signo menos tipográfico (−1/4).
const f = (fraccion) => String(fraccion).replace("-", "−");
const x = (j) => `x${subindice(j + 1)}`;
const F = (i) => `F${subindice(i + 1)}`;

let ejemploActual = "servidor";
let pasosHtml = [];
let pasoActual = 0;

// ---------- Elegir y mostrar el problema ----------

function terminoLineal(coeficientes, nombres) {
  // Escribe 4x₁ + 6x₂ + x₃ sin "+ −" ni coeficientes 1 ni términos en 0.
  let texto = "";
  coeficientes.forEach((coef, j) => {
    if (coef.esCero()) return;
    const negativo = coef.esNegativa();
    const valor = negativo ? f(coef).slice(1) : f(coef);
    const numero = valor === "1" ? "" : valor;
    if (texto === "") texto += `${negativo ? "−" : ""}${numero}${nombres[j]}`;
    else texto += ` ${negativo ? "−" : "+"} ${numero}${nombres[j]}`;
  });
  return texto || "0";
}

function mostrarModelo(modelo, etiquetas = null) {
  const n = modelo.c.length;
  const nombres = Array.from({ length: n }, (_, j) => x(j));
  let html = '<div class="modelo">';
  html += `Maximizar Z = ${terminoLineal(modelo.c, nombres)}<br>`;
  html += '<span class="sujeto">sujeto a</span><br>';
  modelo.A.forEach((fila, i) => {
    const etiqueta = etiquetas ? ` <span class="sujeto">(${etiquetas[i]})</span>` : "";
    html += `${terminoLineal(fila, nombres)} ≤ ${f(modelo.b[i])}${etiqueta}<br>`;
  });
  html += `${nombres.join(", ")} ≥ 0</div>`;
  $("modelo").innerHTML = html;
}

function elegirEjemplo(nombre) {
  ejemploActual = nombre;
  document.querySelectorAll("[data-ejemplo]").forEach((boton) => {
    boton.setAttribute("aria-pressed", boton.dataset.ejemplo === nombre ? "true" : "false");
  });
  ocultarSolucion();

  if (nombre === "propio") {
    $("enunciado").innerHTML = "";
    $("editor").hidden = false;
    $("modelo").innerHTML = "";
    if (!$("cuadricula").dataset.n) crearCuadricula(2, 2);
    return;
  }

  $("editor").hidden = true;
  const e = EJEMPLOS[nombre];
  let html = `<h3>${e.titulo}</h3><p class="enunciado">${e.enunciado}</p><ul class="variables">`;
  e.variables.forEach((v, j) => (html += `<li>${x(j)} = ${v}</li>`));
  html += `<li>Z = ${e.objetivo}</li></ul>`;
  $("enunciado").innerHTML = html;
  mostrarModelo(leerEjemplo(e), e.restricciones);
}

function leerEjemplo(e) {
  const aFracciones = (lista) => lista.map((v) => Fraccion.desdeTexto(v));
  return { c: aFracciones(e.c), A: e.A.map(aFracciones), b: aFracciones(e.b) };
}

// ---------- Modelo propio ----------

function crearCuadricula(n, m) {
  let html = '<table class="entrada"><tr><th></th>';
  for (let j = 0; j < n; j++) html += `<th>${x(j)}</th>`;
  html += "<th></th><th>b</th></tr><tr><th>c</th>";
  for (let j = 0; j < n; j++) html += `<td><input id="c-${j}" aria-label="c${subindice(j + 1)}"></td>`;
  html += "<td></td><td></td></tr>";
  for (let i = 0; i < m; i++) {
    html += `<tr><th>R${i + 1}</th>`;
    for (let j = 0; j < n; j++) {
      html += `<td><input id="a-${i}-${j}" aria-label="R${i + 1}, ${x(j)}"></td>`;
    }
    html += `<td>≤</td><td><input id="b-${i}" aria-label="b de R${i + 1}"></td></tr>`;
  }
  $("cuadricula").innerHTML = html + "</table>";
  $("cuadricula").dataset.n = n;
  $("cuadricula").dataset.m = m;
}

function leerCampo(id, descripcion) {
  const texto = $(id).value;
  if (texto.trim() === "") throw new Error(`Falta el valor de ${descripcion}.`);
  try {
    return Fraccion.desdeTexto(texto);
  } catch {
    throw new Error(`"${texto}" en ${descripcion} no es un número. Use enteros, decimales o fracciones como 1/2.`);
  }
}

function leerModeloPropio() {
  const n = Number($("cuadricula").dataset.n);
  const m = Number($("cuadricula").dataset.m);
  const c = [];
  const A = [];
  const b = [];
  for (let j = 0; j < n; j++) c.push(leerCampo(`c-${j}`, `c${subindice(j + 1)}`));
  for (let i = 0; i < m; i++) {
    A.push(Array.from({ length: n }, (_, j) => leerCampo(`a-${i}-${j}`, `R${i + 1}, ${x(j)}`)));
    b.push(leerCampo(`b-${i}`, `b de R${i + 1}`));
    if (b[i].esNegativa()) {
      throw new Error(`b de R${i + 1} es negativo. Este programa resuelve modelos con b ≥ 0.`);
    }
  }
  return { c, A, b };
}

// ---------- Dibujo de matrices ----------

// Matriz ampliada con paréntesis. marcas = { columna, fila } para el pivote.
function matriz(tabla, base, nombres, marcas = null) {
  const m = tabla.length - 1;
  let html;
  // Los paréntesis son dos celdas que ocupan todas las filas.
  html = '<div class="desplazable"><div class="matriz"><table>';
  html += '<thead><tr><td class="etiqueta"></td><td></td>';
  nombres.forEach((nombre, j) => (html += `<td class="${marcas && marcas.columna === j ? "columna" : ""}">${nombre}</td>`));
  html += '<td class="b">b</td><td></td></tr></thead><tbody>';

  tabla.forEach((fila, i) => {
    const esZ = i === m;
    const esFilaPivote = marcas && marcas.fila === i;
    const clases = [esZ ? "fila-z" : "", esFilaPivote ? "fila" : ""].join(" ").trim();
    html += `<tr class="${clases}"><td class="etiqueta">${esZ ? "Z" : nombres[base[i]]}</td>`;
    if (i === 0) html += `<td rowspan="${m + 1}" class="parentesis-celda"><div class="parentesis"></div></td>`;
    fila.forEach((valor, j) => {
      const ultima = j === fila.length - 1;
      let clase = ultima ? "b" : "";
      if (marcas && marcas.columna === j) clase += marcas.fila === i ? " pivote" : " columna";
      html += `<td class="${clase.trim()}">${f(valor)}</td>`;
    });
    if (i === 0) html += `<td rowspan="${m + 1}" class="parentesis-celda"><div class="parentesis derecho"></div></td>`;
    html += "</tr>";
  });
  return html + "</tbody></table></div></div>";
}

const vector = (fila) => {
  const valores = fila.map(f);
  const b = valores.pop();
  return `(${valores.join(", ")} | ${b})`;
};

const leyenda = (entra, sale, pivote) => `
  <div class="leyenda">
    <span><span class="muestra" style="background:var(--marcador-celeste)"></span>entra ${entra}</span>
    <span><span class="muestra" style="background:var(--marcador-verde)"></span>sale ${sale}</span>
    <span><span class="muestra" style="background:var(--marcador-rosado)"></span>pivote ${pivote}</span>
  </div>`;

// ---------- Construcción de los pasos ----------

function construirPasos(r, modelo, datos) {
  const { pasos, nombres } = r;
  const n = modelo.c.length;
  const m = modelo.b.length;
  const lista = [];

  // Paso: forma estándar
  let html = "<h3>Forma estándar</h3>";
  html += "<p>A cada restricción ≤ se le suma una variable de holgura, que mide cuánto sobra del recurso. Así las desigualdades se convierten en igualdades:</p>";
  html += '<div class="ecuaciones">';
  modelo.A.forEach((fila, i) => {
    const holgura = `s${subindice(i + 1)}`;
    html += `${terminoLineal(fila, nombres.slice(0, n))} + ${holgura} = ${f(modelo.b[i])}<br>`;
  });
  const negC = modelo.c.map((cj) => new Fraccion(0).restar(cj));
  const filaZ = terminoLineal(negC, nombres.slice(0, n));
  html += `Z ${filaZ.startsWith("−") ? filaZ.replace("−", "− ") : `+ ${filaZ}`} = 0</div>`;
  if (datos) {
    html += `<p class="nota">${modelo.A.map((_, i) => `s${subindice(i + 1)} = ${datos.restricciones[i]} sin usar`).join("; ")}.</p>`;
  }
  lista.push(html);

  // Paso: matriz ampliada inicial
  const inicial = pasos[0];
  html = "<h3>Matriz ampliada inicial</h3>";
  html += "<p>Se escriben los coeficientes de las ecuaciones en una matriz ampliada. La última fila es la de Z. Las holguras forman la base inicial, así que la primera solución es el origen: todas las x valen 0 y Z = 0.</p>";
  html += matriz(inicial.tabla, inicial.base, nombres);
  lista.push(html);

  let anterior = inicial;
  for (const paso of pasos.slice(1)) {
    const ultima = anterior.tabla[0].length - 1;
    const valorZ = anterior.tabla[m][paso.entra];
    const razones = paso.razones
      .map((razon, i) => {
        if (razon === null) return `${F(i)} no cuenta (no tiene número positivo en la columna)`;
        return `${F(i)}: ${f(anterior.tabla[i][ultima])} ÷ ${f(anterior.tabla[i][paso.entra])} = ${f(razon)}`;
      })
      .join("<br>");

    // Paso: elegir el pivote
    html = `<h3>Iteración ${paso.iteracion}: elegir el pivote</h3>`;
    html += `<p>Entra ${nombres[paso.entra]} porque ${f(valorZ)} es el número más negativo de la fila Z.</p>`;

    if (paso.tipo === "ilimitado") {
      html += `<p>${razones}</p>`;
      html += '<p class="mal">Ningún número de la columna es positivo, así que no hay razón que limite a la variable que entra. El problema es ilimitado: Z puede crecer sin fin.</p>';
      lista.push(html);
      break;
    }

    html += `<p>Prueba de razones (b ÷ número de la columna):<br>${razones}</p>`;
    html += `<p>La menor razón está en ${F(paso.fila)}, así que sale ${nombres[paso.sale]} y el pivote es ${f(paso.pivote)}.</p>`;
    html += '<div class="fila-paso">';
    html += matriz(anterior.tabla, anterior.base, nombres, { columna: paso.entra, fila: paso.fila });
    html += `<div class="operaciones">${paso.operaciones.join("<br>")}</div></div>`;
    html += leyenda(nombres[paso.entra], nombres[paso.sale], f(paso.pivote));
    lista.push(html);

    // Paso: operaciones de fila con el cálculo de cada fila
    html = `<h3>Iteración ${paso.iteracion}: operaciones de fila</h3>`;
    html += "<p>Se deja un 1 en el pivote y 0 en el resto de su columna, igual que en Gauss-Jordan:</p>";
    const filaPivoteNueva = paso.tabla[paso.fila];
    paso.tabla.forEach((filaNueva, k) => {
      const nombreFila = k === m ? "Z" : F(k);
      const vieja = anterior.tabla[k];
      if (k === paso.fila) {
        if (paso.pivote.comparar(new Fraccion(1)) !== 0) {
          html += `<p class="detalle"><span>${nombreFila}</span>${vector(vieja)} ÷ ${f(paso.pivote)} = ${vector(filaNueva)}</p>`;
        }
        return;
      }
      const factor = vieja[paso.entra];
      if (factor.esCero()) {
        html += `<p class="detalle"><span>${nombreFila}</span>ya tiene 0 en la columna, no cambia</p>`;
        return;
      }
      const signo = factor.esNegativa() ? "+" : "−";
      const absoluto = factor.esNegativa() ? new Fraccion(0).restar(factor) : factor;
      html += `<p class="detalle"><span>${nombreFila}</span>${vector(vieja)} ${signo} ${f(absoluto)}·${vector(filaPivoteNueva)} = ${vector(filaNueva)}</p>`;
    });
    html += '<div class="fila-paso"><span class="equivale">∼</span>';
    html += matriz(paso.tabla, paso.base, nombres) + "</div>";
    lista.push(html);

    // Paso: solución actual
    const filaZ = paso.tabla[m];
    const hayNegativos = filaZ.slice(0, n + m).some((v) => v.esNegativa());
    html = `<h3>Iteración ${paso.iteracion}: solución actual</h3>`;
    html += "<p>Las variables básicas toman el valor de b en su fila y las demás valen 0:</p>";
    html += `<p class="resultado">${paso.base.map((col, i) => `${nombres[col]} = ${f(paso.tabla[i][n + m])}`).join(", ")}; Z = ${f(filaZ[n + m])}</p>`;
    html += hayNegativos
      ? "<p>Todavía hay un número negativo en la fila Z, así que Z puede mejorar. Se hace otra iteración.</p>"
      : '<p class="ok">Ya no hay números negativos en la fila Z: esta solución es la óptima.</p>';
    lista.push(html);

    anterior = paso;
  }

  if (r.estado === "optimo") lista.push(pasoResultado(r, modelo, datos));
  if (r.estado === "sin_convergencia") lista.push('<p class="mal">No se llegó al óptimo dentro del límite de iteraciones.</p>');
  return lista;
}

function pasoResultado(r, modelo, datos) {
  const res = r.resultado;
  const n = res.x.length;
  const mayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);
  const nombreRestriccion = (i) => (datos ? mayuscula(datos.restricciones[i]) : `R${i + 1}`);

  let html = "<h3>Resultado</h3>";
  html += `<p class="resultado">${res.x.map((v, j) => `${x(j)} = ${f(v)}`).join(", ")}; Z* = ${f(res.z)}</p>`;
  if (datos) {
    html += `<p>Conviene ${res.x.map((v, j) => `${f(v)} ${datos.variables[j]}`).join(", ")}, con un valor de ${f(res.z)} ${datos.objetivo}.</p>`;
  }
  if (res.multiplesOptimos) {
    html += "<p>Una variable no básica tiene 0 en la fila Z: hay más de una solución óptima con el mismo Z.</p>";
  }

  html += "<h3>Qué recursos limitan</h3><p>";
  html += res.holguras
    .map((h, i) => (h.esCero() ? `${nombreRestriccion(i)}: se agota.` : `${nombreRestriccion(i)}: sobran ${f(h)}.`))
    .join("<br>");
  html += "</p>";

  html += "<h3>Precios sombra</h3>";
  html += "<p>Son los números de la fila Z bajo las holguras. Indican cuánto aumenta Z con una unidad más de cada recurso:</p><p>";
  html += res.preciosSombra
    .map((p, i) => `${nombreRestriccion(i)}: ${f(p)}${p.esCero() ? " (ampliarlo no mejora Z)" : ""}`)
    .join("<br>");
  html += "</p>";

  html += "<h3>Comprobación</h3><p>";
  html += verificarRestricciones(modelo.A, modelo.b, res.x)
    .map((v) => `<span class="${v.cumple ? "ok" : "mal"}">R${v.restriccion}: ${f(v.izquierda)} ≤ ${f(v.derecha)} ${v.cumple ? "✓" : "✗"}</span>`)
    .join("<br>");
  const dual = verificarDualidad(modelo.b, res.preciosSombra, res.z);
  const suma = modelo.b.map((bi, i) => `${f(bi)}(${f(res.preciosSombra[i])})`).join(" + ");
  html += `<br><span class="${dual.coincide ? "ok" : "mal"}">Dualidad: ${suma} = ${f(dual.valorDual)} ${dual.coincide ? "= Z* ✓" : "≠ Z* ✗"}</span></p>`;
  return html;
}

// ---------- Navegación entre pasos ----------

function mostrarPaso(indice) {
  pasoActual = Math.max(0, Math.min(indice, pasosHtml.length - 1));
  $("pasos").innerHTML = `<div class="paso">${pasosHtml[pasoActual]}</div>`;
  $("contador").textContent = `Paso ${pasoActual + 1} de ${pasosHtml.length}`;
  $("anterior").disabled = pasoActual === 0;
  $("siguiente").disabled = pasoActual === pasosHtml.length - 1;
}

function mostrarTodo() {
  $("pasos").innerHTML = pasosHtml.map((p) => `<div class="paso">${p}</div>`).join("");
  $("contador").textContent = `Los ${pasosHtml.length} pasos`;
  $("anterior").disabled = false;
  $("siguiente").disabled = false;
  pasoActual = -1;
}

function ocultarSolucion() {
  $("solucion").hidden = true;
  $("error").textContent = "";
}

function resolver() {
  $("error").textContent = "";
  try {
    const datos = ejemploActual === "propio" ? null : EJEMPLOS[ejemploActual];
    const modelo = datos ? leerEjemplo(datos) : leerModeloPropio();
    if (!datos) mostrarModelo(modelo);
    const r = resolverSimplex(modelo.c, modelo.A, modelo.b);
    pasosHtml = construirPasos(r, modelo, datos);
    $("solucion").hidden = false;
    mostrarPaso(0);
    $("solucion").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    $("error").textContent = error.message;
  }
}

// ---------- Eventos ----------

document.querySelectorAll("[data-ejemplo]").forEach((boton) => {
  boton.addEventListener("click", () => elegirEjemplo(boton.dataset.ejemplo));
});

$("crear-cuadricula").addEventListener("click", () => {
  const n = Number($("num-variables").value);
  const m = Number($("num-restricciones").value);
  if (!(n >= 1 && n <= 6 && m >= 1 && m <= 6)) {
    $("error").textContent = "Use entre 1 y 6 variables y entre 1 y 6 restricciones.";
    return;
  }
  crearCuadricula(n, m);
  ocultarSolucion();
});

$("resolver").addEventListener("click", resolver);
$("anterior").addEventListener("click", () => mostrarPaso(pasoActual === -1 ? 0 : pasoActual - 1));
$("siguiente").addEventListener("click", () => mostrarPaso(pasoActual === -1 ? 0 : pasoActual + 1));
$("ver-todo").addEventListener("click", mostrarTodo);

// Flechas del teclado para avanzar durante la exposición.
document.addEventListener("keydown", (evento) => {
  if ($("solucion").hidden || evento.target.tagName === "INPUT") return;
  if (evento.key === "ArrowRight") mostrarPaso(pasoActual + 1);
  if (evento.key === "ArrowLeft") mostrarPaso(pasoActual - 1);
});

elegirEjemplo("servidor");
