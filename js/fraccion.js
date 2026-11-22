// Fracción exacta: numerador / denominador, con enteros BigInt.
// Sirve para que las tablas del símplex den 1/16 y no 0.0625000001.

function mcd(a, b) {
  // Máximo común divisor (algoritmo de Euclides).
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

export class Fraccion {
  constructor(numerador, denominador = 1n) {
    numerador = BigInt(numerador);
    denominador = BigInt(denominador);
    if (denominador === 0n) {
      throw new Error("El denominador no puede ser 0");
    }
    // El signo siempre va en el numerador.
    if (denominador < 0n) {
      numerador = -numerador;
      denominador = -denominador;
    }
    // Se guarda simplificada: 4/8 queda como 1/2.
    const divisor = mcd(numerador, denominador) || 1n;
    this.num = numerador / divisor;
    this.den = denominador / divisor;
  }

  // Convierte un texto como "3", "-2.5" o "1/4" en una Fraccion.
  static desdeTexto(texto) {
    const limpio = String(texto).trim().replace(",", ".");
    if (/^-?\d+$/.test(limpio)) {
      return new Fraccion(limpio);
    }
    if (/^-?\d+\/-?\d+$/.test(limpio)) {
      const [n, d] = limpio.split("/");
      return new Fraccion(n, d);
    }
    if (/^-?\d*\.\d+$/.test(limpio)) {
      const negativo = limpio.startsWith("-");
      const [entero, decimales] = limpio.replace("-", "").split(".");
      const den = 10n ** BigInt(decimales.length);
      const num = BigInt(entero || "0") * den + BigInt(decimales);
      return new Fraccion(negativo ? -num : num, den);
    }
    throw new Error(`"${texto}" no es un número válido`);
  }

  sumar(otra) {
    return new Fraccion(this.num * otra.den + otra.num * this.den, this.den * otra.den);
  }

  restar(otra) {
    return new Fraccion(this.num * otra.den - otra.num * this.den, this.den * otra.den);
  }

  multiplicar(otra) {
    return new Fraccion(this.num * otra.num, this.den * otra.den);
  }

  dividir(otra) {
    return new Fraccion(this.num * otra.den, this.den * otra.num);
  }

  esCero() {
    return this.num === 0n;
  }

  esNegativa() {
    return this.num < 0n;
  }

  esPositiva() {
    return this.num > 0n;
  }

  // Devuelve -1 si this < otra, 0 si son iguales y 1 si this > otra.
  comparar(otra) {
    const diferencia = this.restar(otra);
    if (diferencia.esCero()) return 0;
    return diferencia.esNegativa() ? -1 : 1;
  }

  toString() {
    return this.den === 1n ? `${this.num}` : `${this.num}/${this.den}`;
  }
}

export const CERO = new Fraccion(0);
export const UNO = new Fraccion(1);
