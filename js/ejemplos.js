// Modelos precargados (los mismos del informe).

export const EJEMPLOS = {
  servidor: {
    titulo: "Caso real: servidor virtual",
    c: ["4", "6", "1"],
    A: [
      ["4", "4", "2"],     // vCPU
      ["8", "16", "4"],    // RAM (GB)
      ["10", "20", "5"],   // disco (decenas de GB)
    ],
    b: ["32", "112", "160"],
  },
  guia: {
    titulo: "Ejemplo guía: empresa de software",
    c: ["40", "30"],
    A: [
      ["1", "1"],   // trabajos en total
      ["2", "1"],   // horas de revisión
      ["0", "1"],   // demanda de mantenimiento
    ],
    b: ["10", "16", "8"],
  },
};
