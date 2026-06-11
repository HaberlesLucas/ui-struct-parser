/**
 * @file constants.ts
 * @description Constantes globales del proyecto UI-Struct.
 * Centralizar estos valores evita "magic strings" dispersos en el código.
 */

/** Código de ejemplo que se muestra al cargar la aplicación. */
export const EJEMPLO_INICIAL = `{
  "tipo": "Contenedor",
  "visible": true,
  "margen": 15,
  "hijos": [
    {
      "tipo": "Boton",
      "texto": "Enviar",
      "activo": false,
      "estilo": null
    },
    {
      "tipo": "Texto",
      "contenido": "Hola mundo",
      "negrita": true
    }
  ]
}`;

/**
 * Colores asociados a cada tipo de token.
 * Usados en la tabla de tokens para diferenciar visualmente cada categoría.
 */
export const TOKEN_COLORS: Record<string, string> = {
  LLAVE_ABRE:      '#e879f9', // magenta — delimitadores de objeto
  LLAVE_CIERRA:    '#e879f9',
  CORCHETE_ABRE:   '#fb923c', // naranja — delimitadores de arreglo
  CORCHETE_CIERRA: '#fb923c',
  DOS_PUNTOS:      '#94a3b8', // gris — separadores
  COMA:            '#94a3b8',
  CADENA:          '#34d399', // verde — valores de texto
  NUMERO:          '#60a5fa', // azul — valores numéricos
  BOOLEANO:        '#facc15', // amarillo — true/false
  NULO:            '#f87171', // rojo — null
  FIN_ARCHIVO:     '#475569', // gris oscuro
};

/**
 * Colores asociados a cada tipo de nodo del AST.
 * Usados en el visualizador del árbol sintáctico.
 */
export const NODO_COLORS: Record<string, string> = {
  UiStruct: '#a78bfa', // violeta — raíz
  Objeto:   '#e879f9', // magenta
  Par:      '#34d399', // verde
  Arreglo:  '#fb923c', // naranja
  Cadena:   '#34d399', // verde
  Numero:   '#60a5fa', // azul
  Booleano: '#facc15', // amarillo
  Nulo:     '#f87171', // rojo
};