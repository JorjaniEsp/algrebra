# Método símplex paso a paso

Aplicación programada del Proyecto Programado de **IF0012 Álgebra Lineal para Informática Empresarial** (UCR, Sede del Caribe, II Semestre 2026).
Integrantes: Jorjanie Espinoza Ezpinoza y Angely Pérez Guido.

Página web que resuelve modelos de programación lineal de la forma

> maximizar Z = c·x, sujeto a A·x ≤ b, x ≥ 0, con b ≥ 0

con el método símplex, mostrando cada paso como en clase: tabla inicial, variable que entra, prueba de razones, variable que sale, pivote, operaciones de fila (F₂ ← F₂ ÷ 16, …) y la tabla resultante. Todos los cálculos se hacen con fracciones exactas.

## Estructura

```
├── index.html          página principal
├── css/
│   └── estilos.css
├── js/
│   ├── fraccion.js     fracciones exactas
│   ├── simplex.js      método símplex
│   ├── verificacion.js comprobación de la solución
│   ├── ejemplos.js     modelos del informe
│   └── interfaz.js     lectura de datos y presentación
├── pruebas/
│   └── pruebas.js      pruebas automáticas
├── package.json
└── README.md
```

## Archivos

| Archivo | Qué hace |
|---|---|
| `js/fraccion.js` | Clase `Fraccion` (numerador y denominador con `BigInt`): suma, resta, multiplicación, división y simplificación |
| `js/simplex.js` | El método símplex: tabla inicial, columna pivote, prueba de razones, operaciones de fila y lectura del resultado. No toca la página |
| `js/verificacion.js` | Comprueba la solución: cada restricción y la dualidad (b · precios sombra = Z*) |
| `js/ejemplos.js` | Los dos modelos del informe: el caso del servidor virtual y el ejemplo guía |
| `index.html`, `css/estilos.css`, `js/interfaz.js` | La página: cuadrícula de entrada y presentación de los pasos |
| `pruebas/pruebas.js` | Pruebas automáticas con los resultados de la resolución a mano |

## Cómo usarlo

- En línea: abrir el enlace de Vercel.
- En la computadora: servir la carpeta con cualquier servidor estático (por ejemplo, `npx serve .`) y abrir `index.html`. (Abrir el archivo con doble clic no funciona porque usa módulos de JavaScript.)
- Pruebas: `node pruebas/pruebas.js` (requiere Node.js 18 o superior).

## Resultados esperados

| Modelo | Solución | Z* | Precios sombra |
|---|---|---|---|
| Caso del servidor | (2, 6, 0) | 44 | (1/2, 1/4, 0) |
| Ejemplo guía | (6, 4) | 360 | (20, 10, 0) |
