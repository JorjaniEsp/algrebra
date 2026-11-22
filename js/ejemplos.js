// Modelos precargados (los mismos del informe), con su enunciado.

export const EJEMPLOS = {
  servidor: {
    titulo: "Caso real: servidor virtual",
    enunciado:
      "La Coordinación de Informática de la sede administra un servidor con VMware. " +
      "Sobre él se crean máquinas virtuales de tres tipos, y cada una consume procesador, " +
      "memoria y disco. ¿Cuántas máquinas de cada tipo conviene crear para obtener el mayor " +
      "valor para la sede sin pasarse de la capacidad del servidor?",
    variables: [
      "máquinas de aplicaciones web",
      "máquinas de base de datos",
      "máquinas de laboratorio",
    ],
    restricciones: ["vCPU", "RAM (GB)", "disco (decenas de GB)"],
    objetivo: "puntos de prioridad",
    c: ["4", "6", "1"],
    A: [
      ["4", "4", "2"],
      ["8", "16", "4"],
      ["10", "20", "5"],
    ],
    b: ["32", "112", "160"],
  },
  guia: {
    titulo: "Ejemplo guía: empresa de software",
    enunciado:
      "Una empresa pequeña de desarrollo de software puede aceptar cada mes sitios web a la medida " +
      "(₡40 mil de ganancia cada uno) y contratos de mantenimiento (₡30 mil cada uno). ¿Cuántos " +
      "de cada uno conviene aceptar para ganar lo más posible?",
    variables: ["sitios web", "contratos de mantenimiento"],
    restricciones: ["trabajos en total", "horas de revisión", "demanda de mantenimiento"],
    objetivo: "miles de colones",
    c: ["40", "30"],
    A: [
      ["1", "1"],
      ["2", "1"],
      ["0", "1"],
    ],
    b: ["10", "16", "8"],
  },
};
