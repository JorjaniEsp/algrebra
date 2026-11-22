// Comprobación de la solución, igual que la "comprobación a mano" del informe.

import { CERO } from "./fraccion.js";

// Sustituye x en cada restricción: A_i·x ≤ b_i.
export function verificarRestricciones(A, b, x) {
  return A.map((fila, i) => {
    const izquierda = fila.reduce((suma, a, j) => suma.sumar(a.multiplicar(x[j])), CERO);
    return {
      restriccion: i + 1,
      izquierda,
      derecha: b[i],
      cumple: izquierda.comparar(b[i]) <= 0,
      seAgota: izquierda.comparar(b[i]) === 0,
    };
  });
}

// Dualidad: si la solución es óptima, b · (precios sombra) = Z*.
export function verificarDualidad(b, preciosSombra, z) {
  const valorDual = b.reduce((suma, bi, i) => suma.sumar(bi.multiplicar(preciosSombra[i])), CERO);
  return { valorDual, coincide: valorDual.comparar(z) === 0 };
}
