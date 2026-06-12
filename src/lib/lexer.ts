/**
 * @file lexer.ts
 * @description Analizador Léxico (Tokenizador) para el lenguaje UI-Struct.
 *
 * Convierte una cadena de texto cruda en una lista de tokens tipados.
 * Cada token representa la unidad léxica mínima del lenguaje:
 * llaves, corchetes, cadenas, números, booleanos, nulos, etc.
 *
 * En lugar de lanzar excepciones, el Lexer acumula todos los errores
 * encontrados y los devuelve junto con los tokens válidos, permitiendo
 * al Parser continuar el análisis incluso ante errores léxicos.
 */

// ── Tipos de tokens del lenguaje UI-Struct ───────────────────────────────────
// Todos los nombres están en español según la convención del proyecto.
export type TokenType =
    | 'LLAVE_ABRE'      // {
    | 'LLAVE_CIERRA'    // }
    | 'CORCHETE_ABRE'   // [
    | 'CORCHETE_CIERRA' // ]
    | 'DOS_PUNTOS'      // :
    | 'COMA'            // ,
    | 'CADENA'          // "texto entre comillas"
    | 'NUMERO'          // 42, -3.14, 1.5e10
    | 'BOOLEANO'        // true | false
    | 'NULO'            // null
    | 'FIN_ARCHIVO';    // marcador de fin — siempre el último token

/** Representa un token extraído del código fuente. */
export interface Token {
    type: TokenType;
    value: string;   // texto original tal como aparece en el código
    line: number;    // línea donde comienza (base 1)
    column: number;  // columna donde comienza (base 1)
}

/** Un error léxico: caracter o secuencia inválida encontrada durante el escaneo. */
export interface LexerError {
    message: string;
    line: number;
    column: number;
}

/** Resultado completo del análisis léxico. */
export interface LexerResult {
    tokens: Token[];
    errors: LexerError[];
}

// ── Clase principal ───────────────────────────────────────────────────────────

export class Lexer {
    private input: string;
    private position: number = 0; // índice actual en la cadena
    private line: number = 1;
    private column: number = 1;

    constructor(input: string) {
        this.input = input;
    }

    /**
     * Recorre todo el texto de entrada y genera la lista de tokens.
     * Nunca lanza excepciones: los errores se acumulan en el array `errors`.
     *
     * @returns {LexerResult} tokens válidos + errores encontrados
     */
    public tokenize(): LexerResult {
        const tokens: Token[] = [];
        const errors: LexerError[] = [];

        while (this.position < this.input.length) {
            const char = this.input[this.position];

            // ── 1. Ignorar espacios en blanco ─────────────────────────────────────
            // Los saltos de línea actualizan el contador de línea/columna.
            if (/\s/.test(char)) {
                if (char === '\n') {
                    // \n: sirve para contar líneas, pero no se incluye como token
                    this.line++;
                    this.column = 1;
                } else {
                    this.column++;
                }
                this.position++;
                continue;
            }

            // ── 2. Símbolos de un solo caracter ───────────────────────────────────
            const symbols: Record<string, TokenType> = {
                '{': 'LLAVE_ABRE',
                '}': 'LLAVE_CIERRA',
                '[': 'CORCHETE_ABRE',
                ']': 'CORCHETE_CIERRA',
                ':': 'DOS_PUNTOS',
                ',': 'COMA',
            };

            if (symbols[char]) {
                tokens.push({ type: symbols[char], value: char, line: this.line, column: this.column });
                this.position++;
                this.column++;
                continue;
            }

            // Para el resto usamos el "trozo restante" de la entrada
            const remaining = this.input.slice(this.position);

            // ── 3. Cadenas de texto ───────────────────────────────────────────────
            // Acepta secuencias de escape (\n, \", \\, etc.)
            if (char === '"') {
                const match = remaining.match(/^"([^"\\]|\\.)*"/);
                if (match) {
                    tokens.push({ type: 'CADENA', value: match[0], line: this.line, column: this.column });
                    this.advance(match[0].length);
                } else {
                    // Cadena no cerrada: reportar hasta fin de línea y continuar
                    const endOfLine = remaining.indexOf('\n');
                    const badStr = endOfLine === -1 ? remaining : remaining.slice(0, endOfLine);
                    errors.push({ message: `Cadena de texto no cerrada: ${badStr}`, line: this.line, column: this.column });
                    this.advance(badStr.length);
                }
                continue;
            }

            // ── 4. Números ────────────────────────────────────────────────────────
            // Soporta negativos, decimales y notación científica (ej. -3.14, 1.5e10)
            const numMatch = remaining.match(/^-?\d+(\.\d+)?([eE][+-]?\d+)?/);
            if (numMatch) {
                tokens.push({ type: 'NUMERO', value: numMatch[0], line: this.line, column: this.column });
                this.advance(numMatch[0].length);
                continue;
            }

            // ── 5. Booleanos ──────────────────────────────────────────────────────
            // El \b asegura que "truecolor" no se reconozca como BOOLEANO
            const boolMatch = remaining.match(/^(true|false)\b/);
            if (boolMatch) {
                tokens.push({ type: 'BOOLEANO', value: boolMatch[0], line: this.line, column: this.column });
                this.advance(boolMatch[0].length);
                continue;
            }

            // ── 6. Nulo ───────────────────────────────────────────────────────────
            const nullMatch = remaining.match(/^null\b/);
            if (nullMatch) {
                tokens.push({ type: 'NULO', value: nullMatch[0], line: this.line, column: this.column });
                this.advance(nullMatch[0].length);
                continue;
            }

            // ── 7. Identificadores desconocidos ───────────────────────────────────
            // Ej: True, False, NULL, undefined — sugerimos la alternativa correcta
            const identMatch = remaining.match(/^[a-zA-Z_]\w*/);
            if (identMatch) {
                errors.push({
                    message: `Identificador desconocido '${identMatch[0]}' (¿quiso escribir true, false o null?)`,
                    line: this.line,
                    column: this.column,
                });
                this.advance(identMatch[0].length);
                continue;
            }

            // ── 8. Caracter completamente inválido ────────────────────────────────
            errors.push({ message: `Caracter inesperado '${char}'`, line: this.line, column: this.column });
            this.position++;
            this.column++;
        }

        // Siempre agregamos el marcador de fin de archivo al final
        tokens.push({ type: 'FIN_ARCHIVO', value: '', line: this.line, column: this.column });
        return { tokens, errors };
    }

    /**
     * Avanza el cursor `length` posiciones en la entrada,
     * actualizando solo la columna (no maneja saltos de línea).
     */
    private advance(length: number) {
        this.position += length;
        this.column += length;
    }
}