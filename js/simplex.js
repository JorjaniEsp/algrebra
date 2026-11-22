// Método símplex para: maximizar Z = c·x, sujeto a A·x ≤ b, x ≥ 0, con b ≥ 0.
// Sigue los mismos pasos que en clase: tabla inicial, columna pivote,
// prueba de razones, operaciones de fila (Gauss-Jordan) y parada.
// Este archivo no toca la página: solo calcula y devuelve los pasos.

import { Fraccion, CERO, UNO } from "./fraccion.js";

const MAX_ITERACIONES = 50;

// Nombres de las columnas: x₁, x₂, … y s₁, s₂, …
const SUBINDICES = "₀₁₂₃₄₅₆₇₈₉";
export function subindice(numero) {
  return String(numero).split("").map((d) => SUBINDICES[d]).join("");
}

function copiarTabla(tabla) {
  return tabla.map((fila) => [...fila]);
}

// Paso 1. Tabla inicial: [A | I | b] y abajo la fila Z = [−c | 0 | 0].
function construirTablaInicial(c, A, b) {
  const m = A.length;    // número de restricciones
  const n = c.length;    // número de variables
  const tabla = [];

  for (let i = 0; i < m; i++) {
    const holguras = Array.from({ length: m }, (_, j) => (i === j ? UNO : CERO));
    tabla.push([...A[i], ...holguras, b[i]]);
  }

  const filaZ = [
    ...c.map((cj) => CERO.restar(cj)),        // −c
    ...Array.from({ length: m }, () => CERO), // 0 bajo las holguras
    CERO,                                     // Z empieza en 0
  ];
  tabla.push(filaZ);

  // Al inicio, las variables básicas son las holguras (columnas n … n+m−1).
  const base = Array.from({ length: m }, (_, i) => n + i);
  return { tabla, base };
}

// Paso 2. Columna pivote: la del número más negativo de la fila Z.
// Si no hay negativos, la solución ya es óptima (devuelve -1).
function elegirColumnaPivote(filaZ, totalVariables) {
  let columna = -1;
  for (let j = 0; j < totalVariables; j++) {
    if (filaZ[j].esNegativa() && (columna === -1 || filaZ[j].comparar(filaZ[columna]) < 0)) {
      columna = j;
    }
  }
  return columna;
}

// Paso 3. Prueba de razones: b ÷ (número positivo de la columna pivote).
// La fila con la menor razón es la fila pivote. Las filas sin número
// positivo no cuentan (su razón queda en null).
function elegirFilaPivote(tabla, columna) {
  const m = tabla.length - 1;
  const ultima = tabla[0].length - 1;
  const razones = [];
  let fila = -1;

  for (let i = 0; i < m; i++) {
    const coeficiente = tabla[i][columna];
    if (coeficiente.esPositiva()) {
      const razon = tabla[i][ultima].dividir(coeficiente);
      razones.push(razon);
      if (fila === -1 || razon.comparar(razones[fila]) < 0) {
        fila = i;
      }
    } else {
      razones.push(null);
    }
  }
  return { fila, razones };
}

// Paso 4. Operaciones de fila: deja un 1 en el pivote y 0 en el resto de
// la columna. Devuelve la tabla nueva y el texto de cada operación.
function pivotear(tabla, fila, columna) {
  const nueva = copiarTabla(tabla);
  const filaZ = tabla.length - 1;
  const nombreFila = (i) => (i === filaZ ? "Z" : `F${subindice(i + 1)}`);
  const operaciones = [];

  // F_pivote ← F_pivote ÷ pivote
  const pivote = tabla[fila][columna];
  nueva[fila] = tabla[fila].map((valor) => valor.dividir(pivote));
  if (pivote.comparar(UNO) !== 0) {
    operaciones.push(`${nombreFila(fila)} ← ${nombreFila(fila)} ÷ ${pivote}`);
  }

  // F_k ← F_k − (número de la columna)·F_pivote, para las demás filas
  for (let k = 0; k < tabla.length; k++) {
    if (k === fila) continue;
    const factor = tabla[k][columna];
    if (factor.esCero()) continue;
    nueva[k] = tabla[k].map((valor, j) => valor.restar(factor.multiplicar(nueva[fila][j])));

    const signo = factor.esNegativa() ? "+" : "−";
    const absoluto = factor.esNegativa() ? CERO.restar(factor) : factor;
    const multiplo = absoluto.comparar(UNO) === 0 ? "" : `${absoluto}·`;
    operaciones.push(`${nombreFila(k)} ← ${nombreFila(k)} ${signo} ${multiplo}${nombreFila(fila)}`);
  }

  return { tabla: nueva, operaciones };
}

// Lee la solución de la tabla final.
function leerResultado(tabla, base, n, m) {
  const ultima = tabla[0].length - 1;
  const filaZ = tabla[m];

  const valores = Array.from({ length: n + m }, () => CERO);
  base.forEach((columna, i) => {
    valores[columna] = tabla[i][ultima];
  });

  // Hay más de un óptimo si una variable no básica tiene 0 en la fila Z.
  const multiplesOptimos = filaZ
    .slice(0, n + m)
    .some((valor, j) => !base.includes(j) && valor.esCero());

  return {
    x: valores.slice(0, n),
    holguras: valores.slice(n),
    z: filaZ[ultima],
    // Los precios sombra son los números de la fila Z bajo las holguras.
    preciosSombra: filaZ.slice(n, n + m),
    multiplesOptimos,
  };
}

export function nombresColumnas(n, m) {
  const x = Array.from({ length: n }, (_, j) => `x${subindice(j + 1)}`);
  const s = Array.from({ length: m }, (_, i) => `s${subindice(i + 1)}`);
  return [...x, ...s];
}

// Función principal. c: lista de n Fracciones; A: m listas de n Fracciones;
// b: lista de m Fracciones. Devuelve los pasos y el resultado.
export function resolverSimplex(c, A, b) {
  const n = c.length;
  const m = A.length;
  const nombres = nombresColumnas(n, m);

  let { tabla, base } = construirTablaInicial(c, A, b);
  const pasos = [{ tipo: "inicial", tabla: copiarTabla(tabla), base: [...base] }];

  for (let iteracion = 1; iteracion <= MAX_ITERACIONES; iteracion++) {
    const columna = elegirColumnaPivote(tabla[m], n + m);
    if (columna === -1) {
      return { estado: "optimo", pasos, nombres, resultado: leerResultado(tabla, base, n, m) };
    }

    const { fila, razones } = elegirFilaPivote(tabla, columna);
    if (fila === -1) {
      // Ningún número positivo en la columna: Z puede crecer sin límite.
      pasos.push({ tipo: "ilimitado", iteracion, entra: columna, razones });
      return { estado: "ilimitado", pasos, nombres };
    }

    const pivote = tabla[fila][columna];
    const sale = base[fila];
    const resultado = pivotear(tabla, fila, columna);
    tabla = resultado.tabla;
    base[fila] = columna;

    pasos.push({
      tipo: "iteracion",
      iteracion,
      entra: columna,
      sale,
      fila,
      pivote,
      razones,
      operaciones: resultado.operaciones,
      tabla: copiarTabla(tabla),
      base: [...base],
    });
  }

  return { estado: "sin_convergencia", pasos, nombres };
}
