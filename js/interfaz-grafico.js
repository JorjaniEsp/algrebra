// Interfaz del método gráfico: elegir el problema, resolverlo y mostrar cada paso con su gráfico.

import { Fraccion } from "./fraccion.js";
import { analizarGrafico, evaluar, simboloOperador } from "./grafico.js";
import { dibujarGrafico } from "./dibujo-grafico.js";
import { EJEMPLOS_GRAFICO } from "./ejemplos.js";

const $ = (id) => document.getElementById(id);
const f = (valor) => String(valor).replace("-", "−");
const par = (p) => `(${f(p[0])}, ${f(p[1])})`;
const SIGNOS = { le: "<=", ge: ">=", eq: "=" };

let ejemploActual = "guia";

// ---------- Cambiar entre símplex y gráfico ----------

function cambiarModo(modo) {
  document.body.dataset.modo = modo;
  document.querySelectorAll("[data-modo]").forEach((boton) => {
    if (boton.tagName === "BUTTON") boton.setAttribute("aria-pressed", boton.dataset.modo === modo ? "true" : "false");
  });
  const titulo = modo === "grafico" ? "Método gráfico" : "Método símplex paso a paso";
  document.querySelector("h1").textContent = titulo;
  document.title = titulo;
}

// ---------- Escribir el modelo ----------

// 40x₁ + 30x₂, sin coeficientes 1 ni términos en 0; las fracciones van entre paréntesis.
function lineal(coeficientes) {
  const nombres = ["x₁", "x₂"];
  let texto = "";
  coeficientes.forEach((coef, j) => {
    if (coef.esCero()) return;
    const negativo = coef.esNegativa();
    const valor = negativo ? f(coef).slice(1) : f(coef);
    const numero = valor === "1" ? "" : valor.includes("/") ? `(${valor})` : valor;
    if (texto === "") texto += `${negativo ? "−" : ""}${numero}${nombres[j]}`;
    else texto += ` ${negativo ? "−" : "+"} ${numero}${nombres[j]}`;
  });
  return texto || "0";
}

const verbo = (sentido) => (sentido === "max" ? "Maximizar" : "Minimizar");

function mostrarModelo(modelo, etiquetas = null) {
  let html = '<div class="modelo">';
  html += `${verbo(modelo.sentido)} Z = ${lineal(modelo.c)}<br>`;
  html += '<span class="sujeto">sujeto a</span><br>';
  modelo.restricciones.forEach((r, i) => {
    const etiqueta = etiquetas ? ` <span class="sujeto">(${etiquetas[i]})</span>` : "";
    html += `${lineal(r.a)} ${simboloOperador(r.op)} ${f(r.b)}${etiqueta}<br>`;
  });
  html += "x₁, x₂ ≥ 0</div>";
  $("g-modelo").innerHTML = html;
}

function modeloDeEjemplo(e) {
  const fr = (v) => Fraccion.desdeTexto(v);
  return {
    sentido: e.sentido,
    c: e.c.map(fr),
    restricciones: e.restricciones.map((r) => ({ a: r.a.map(fr), op: r.op, b: fr(r.b) })),
  };
}

// ---------- Elegir el problema ----------

function ocultarResultado() {
  $("g-resultado").hidden = true;
  $("g-error").textContent = "";
}

function elegirEjemplo(nombre) {
  ejemploActual = nombre;
  document.querySelectorAll("[data-grafico]").forEach((boton) => {
    boton.setAttribute("aria-pressed", boton.dataset.grafico === nombre ? "true" : "false");
  });
  ocultarResultado();

  if (nombre === "propio") {
    $("g-enunciado").innerHTML = "";
    $("g-editor").hidden = false;
    $("g-modelo").innerHTML = "";
    if (!$("g-cuadricula").dataset.m) crearCuadricula(3);
    return;
  }

  $("g-editor").hidden = true;
  const e = EJEMPLOS_GRAFICO[nombre];
  let html = `<h3>${e.titulo}</h3><p class="enunciado">${e.enunciado}</p><ul class="variables">`;
  e.variables.forEach((v, j) => (html += `<li>x${j === 0 ? "₁" : "₂"} = ${v}</li>`));
  html += `<li>Z = ${e.objetivo}</li></ul>`;
  $("g-enunciado").innerHTML = html;
  mostrarModelo(modeloDeEjemplo(e), e.restricciones.map((r) => r.etiqueta));
}

// ---------- Modelo propio ----------

function crearCuadricula(m) {
  // Cada línea se escribe como una ecuación: Z = [ ]x₁ + [ ]x₂ y R1: [ ]x₁ + [ ]x₂ ≤ [ ]
  const campo = (id, etiqueta, j) =>
    `<span class="termino">${j > 0 ? '<span class="signo">+</span> ' : ""}<input id="${id}" aria-label="${etiqueta}"><span class="variable">x${j === 0 ? "₁" : "₂"}</span></span>`;
  let html = '<div class="ecuacion"><span class="etq-fila">Z =</span>' + campo("g-c-0", "c₁", 0) + campo("g-c-1", "c₂", 1) + "</div>";
  for (let i = 0; i < m; i++) {
    html += `<div class="ecuacion"><span class="etq-fila">R${i + 1}:</span>`;
    html += campo(`g-a-${i}-0`, `R${i + 1}, x₁`, 0) + campo(`g-a-${i}-1`, `R${i + 1}, x₂`, 1);
    html += `<span class="termino"><select id="g-op-${i}" aria-label="Signo de R${i + 1}"><option value="le">≤</option><option value="ge">≥</option><option value="eq">=</option></select> `;
    html += `<input id="g-b-${i}" aria-label="b de R${i + 1}"></span></div>`;
  }
  $("g-cuadricula").innerHTML = html;
  $("g-cuadricula").dataset.m = m;
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
  const m = Number($("g-cuadricula").dataset.m);
  const c = [leerCampo("g-c-0", "c₁"), leerCampo("g-c-1", "c₂")];
  if (c[0].esCero() && c[1].esCero()) throw new Error("La función objetivo necesita algún coeficiente distinto de 0.");
  const restricciones = [];
  for (let i = 0; i < m; i++) {
    const a = [leerCampo(`g-a-${i}-0`, `R${i + 1}, x₁`), leerCampo(`g-a-${i}-1`, `R${i + 1}, x₂`)];
    const b = leerCampo(`g-b-${i}`, `b de R${i + 1}`);
    if (a[0].esCero() && a[1].esCero()) throw new Error(`R${i + 1} necesita algún coeficiente distinto de 0.`);
    restricciones.push({ a, op: SIGNOS[$(`g-op-${i}`).value], b });
  }
  return { sentido: $("g-sentido").value, c, restricciones };
}

// ---------- Resultado paso a paso ----------

const tabla = (encabezados, filas) =>
  '<div class="desplazable"><table class="tabla"><thead><tr>' +
  encabezados.map((h) => `<th>${h}</th>`).join("") +
  "</tr></thead><tbody>" +
  filas.join("") +
  "</tbody></table></div>";

// Escribe c₁(x) + c₂(y) con los valores puestos, por ejemplo 40(6) + 30(4).
function sustituido(c, p) {
  const t1 = `${f(c[0])}(${f(p[0])})`;
  const negativo = c[1].esNegativa();
  const t2 = `${f(negativo ? new Fraccion(0).restar(c[1]) : c[1])}(${f(p[1])})`;
  return `${t1} ${negativo ? "−" : "+"} ${t2}`;
}

function pasoRectas(modelo, analisis) {
  let html = "<h3>Paso 1. Dibujar cada restricción como recta</h3>";
  html += "<p>Se cambia cada signo por = y se buscan los puntos donde la recta corta los ejes:</p>";
  const filas = modelo.restricciones.map((r, i) => {
    const t = analisis.rectas[i];
    const x1 = t.interceptoX1 ? par(t.interceptoX1) : "no lo corta";
    const x2 = t.interceptoX2 ? par(t.interceptoX2) : "no lo corta";
    return `<tr><td>R${i + 1}: ${lineal(r.a)} = ${f(r.b)}</td><td>${x1}</td><td>${x2}</td></tr>`;
  });
  html += tabla(["Recta", "Corta el eje x₁ en", "Corta el eje x₂ en"], filas);
  return html;
}

function pasoLados(modelo, analisis) {
  let html = "<h3>Paso 2. Elegir el lado correcto de cada recta</h3>";
  html += "<p>Se prueba un punto que no esté sobre la recta (el origen, si se puede) y se mira si cumple la desigualdad:</p><p>";
  html += analisis.lados
    .map((lado, i) => {
      if (lado.igualdad) return `R${i + 1} es una igualdad: los puntos factibles están sobre la recta.`;
      const r = modelo.restricciones[i];
      const veredicto = lado.cumple
        ? "es verdadero, así que el lado factible es el que contiene a ese punto."
        : "es falso, así que el lado factible es el contrario.";
      return `R${i + 1}: en ${par(lado.punto)}, ${f(lado.izquierda)} ${simboloOperador(r.op)} ${f(r.b)} ${veredicto}`;
    })
    .join("<br>");
  html += "</p><p>Además, x₁ ≥ 0 y x₂ ≥ 0 dejan la región en el primer cuadrante. La región factible es donde coinciden todos los lados.</p>";
  return html;
}

function pasoGrafico(modelo, analisis) {
  let html = "<h3>Paso 3. Región factible</h3>";
  html += `<div class="figura">${dibujarGrafico(modelo, analisis)}</div>`;
  html += '<div class="leyenda">';
  html += '<span><span class="muestra region"></span>región factible</span>';
  if (analisis.optimo) {
    html += `<span><span class="punto"></span>óptimo</span>`;
    html += `<span><span class="linea"></span>recta de nivel Z = ${f(analisis.optimo.z)}</span>`;
  }
  html += "</div>";
  if (analisis.estado === "no_acotado" || (analisis.direccion && analisis.estado === "multiple")) {
    html += '<p class="nota">La región no está acotada: el gráfico la corta en el borde del dibujo.</p>';
  }
  if (analisis.estado === "infactible") {
    html += '<p class="nota">Los lados factibles de las restricciones no tienen ningún punto en común, por eso no hay región sombreada.</p>';
  }
  return html;
}

function pasoVertices(analisis) {
  let html = "<h3>Paso 4. Calcular los vértices</h3>";
  html += "<p>Cada vértice es la intersección de dos rectas (restricciones o ejes). Se resuelve cada sistema de 2 × 2 y se comprueba el punto en todas las restricciones: una intersección que incumple alguna <strong>no es vértice</strong>.</p>";
  const filas = analisis.intersecciones.map((e) => {
    const cumple = e.factible ? "Sí, cumple todas" : `No: incumple ${e.incumple.nombre} (${f(e.incumple.detalle)})`;
    return `<tr class="${e.factible ? "" : "descartado"}"><td>${par(e.punto)}</td><td>${e.rectas.join(", ")}</td><td class="explica">${cumple}</td></tr>`;
  });
  html += tabla(["Punto", "Rectas que se cortan", "¿Es vértice?"], filas);
  return html;
}

function pasoEvaluar(modelo, analisis) {
  let html = `<h3>Paso 5. Evaluar Z en cada vértice</h3>`;
  html += `<p>Z = ${lineal(modelo.c)}. El óptimo está en un vértice, así que basta comparar estos valores:</p>`;
  const filas = analisis.vertices.map(
    (v) => `<tr class="${v.esOptimo ? "optimo" : ""}"><td>${par(v.punto)}</td><td>${sustituido(modelo.c, v.punto)}</td><td>${f(v.z)}</td></tr>`
  );
  html += tabla(["Vértice (x₁, x₂)", "Cálculo", "Z"], filas);
  return html;
}

function queLimita(modelo, analisis, datos) {
  const p = analisis.optimo.puntos[0];
  const nombre = (i) => (datos ? `${modelo.restricciones[i] && datos.restricciones[i].etiqueta}` : `R${i + 1}`);
  const mayuscula = (t) => (t.startsWith("vCPU") ? t : t.charAt(0).toUpperCase() + t.slice(1));
  const lineas = modelo.restricciones.map((r, i) => {
    const { izquierda } = evaluar(r, p);
    const diferencia = izquierda.restar(r.b);
    if (r.op === "=") return `${mayuscula(nombre(i))}: se cumple con igualdad.`;
    if (diferencia.esCero()) return `${mayuscula(nombre(i))}: se agota (${f(izquierda)} ${simboloOperador(r.op)} ${f(r.b)} con igualdad).`;
    const resto = diferencia.esNegativa() ? new Fraccion(0).restar(diferencia) : diferencia;
    return r.op === "<=" ? `${mayuscula(nombre(i))}: sobran ${f(resto)}.` : `${mayuscula(nombre(i))}: se supera por ${f(resto)}.`;
  });
  return `<h3>Qué restricciones limitan</h3><p>${lineas.join("<br>")}</p>`;
}

function pasoConclusion(modelo, analisis, datos) {
  const palabra = modelo.sentido === "max" ? "máximo" : "mínimo";
  let html = "<h3>Paso 6. Conclusión</h3>";
  if (analisis.estado === "infactible") {
    return html + '<p class="mal">No hay ningún punto que cumpla todas las restricciones a la vez: la región factible está vacía y el problema no tiene solución.</p>';
  }
  if (analisis.estado === "no_acotado") {
    return html + `<p class="mal">La región no está acotada y Z mejora sin límite al avanzar en la dirección ${par(analisis.direccion)}. El problema no tiene un ${palabra} finito.</p>`;
  }
  const z = f(analisis.optimo.z);
  if (analisis.estado === "multiple") {
    if (analisis.optimo.puntos.length > 1) {
      html += `<p>Hay más de una solución óptima: todos los puntos del segmento que une ${analisis.optimo.puntos.map(par).join(" y ")} dan el mismo ${palabra}, Z* = ${z}.</p>`;
    } else {
      html += `<p>Hay infinitas soluciones óptimas: desde ${par(analisis.optimo.puntos[0])} en la dirección ${par(analisis.direccion)} Z se mantiene en su ${palabra}, Z* = ${z}.</p>`;
    }
    return html;
  }
  const p = analisis.optimo.puntos[0];
  html += `<p class="resultado final">${palabra.charAt(0).toUpperCase() + palabra.slice(1)} en el vértice ${par(p)}: Z* = ${z}</p>`;
  if (datos) {
    html += `<p>Conviene ${f(p[0])} ${datos.variables[0]} y ${f(p[1])} ${datos.variables[1]}, con un valor de ${z} ${datos.objetivo}.</p>`;
    html += queLimita(modelo, analisis, datos);
  } else {
    html += queLimita(modelo, analisis, null);
  }
  return html;
}

function construirResultado(modelo, analisis, datos) {
  const partes = [pasoRectas(modelo, analisis), pasoLados(modelo, analisis), pasoGrafico(modelo, analisis)];
  if (analisis.intersecciones.length > 0) partes.push(pasoVertices(analisis));
  if (analisis.vertices.length > 0) partes.push(pasoEvaluar(modelo, analisis));
  partes.push(pasoConclusion(modelo, analisis, datos));
  return partes.map((p) => `<div class="paso">${p}</div>`).join("");
}

function resolver() {
  $("g-error").textContent = "";
  $("g-resultado").hidden = true;
  try {
    const datos = ejemploActual === "propio" ? null : EJEMPLOS_GRAFICO[ejemploActual];
    const modelo = datos ? modeloDeEjemplo(datos) : leerModeloPropio();
    if (!datos) mostrarModelo(modelo);
    const analisis = analizarGrafico(modelo);
    $("g-resultado").innerHTML = construirResultado(modelo, analisis, datos);
    $("g-resultado").hidden = false;
    if (document.activeElement) document.activeElement.blur();
    $("g-resultado").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    if (ejemploActual === "propio") $("g-modelo").innerHTML = "";
    $("g-error").textContent = error.message;
  }
}

// ---------- Eventos ----------

document.querySelectorAll("button[data-modo]").forEach((boton) => {
  boton.addEventListener("click", () => cambiarModo(boton.dataset.modo));
});
document.querySelectorAll("[data-grafico]").forEach((boton) => {
  boton.addEventListener("click", () => elegirEjemplo(boton.dataset.grafico));
});
$("g-crear-cuadricula").addEventListener("click", () => {
  const m = Number($("g-num-restricciones").value);
  if (!(m >= 1 && m <= 6)) {
    $("g-error").textContent = "Use entre 1 y 6 restricciones.";
    return;
  }
  crearCuadricula(m);
  ocultarResultado();
});
$("g-resolver").addEventListener("click", resolver);
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter" && evento.target.closest && evento.target.closest("#g-cuadricula") && evento.target.tagName === "INPUT") resolver();
});

elegirEjemplo("guia");
