/**
 * @file parser.ts
 * @description Parser Descendente Recursivo para el lenguaje UI-Struct.
 *
 * Implementa la Gramática Libre de Contexto (GLC) LL(1) del lenguaje.
 * Cada símbolo no-terminal de la gramática se convierte en un método
 * privado de esta clase, siguiendo la técnica de Recursive Descent Parsing.
 *
 * Gramática (BNF):
 *   <ui_struct>  ::= <objeto>
 *   <objeto>     ::= "{" "}" | "{" <miembros> "}"
 *   <miembros>   ::= <par> | <par> "," <miembros>
 *   <par>        ::= STRING ":" <valor>
 *   <valor>      ::= STRING | NUMBER | <objeto> | <arreglo> | <booleano> | <nulo>
 *   <arreglo>    ::= "[" "]" | "[" <elementos> "]"
 *   <elementos>  ::= <valor> | <valor> "," <elementos>
 *   <booleano>   ::= "true" | "false"
 *   <nulo>       ::= "null"
 */

import type { Token, TokenType } from './lexer';

// ── Nodos del Árbol Sintáctico Abstracto (AST) ───────────────────────────────

/** Tipos posibles de nodo en el AST, uno por construcción gramatical. */
export type NodoTipo =
    | 'UiStruct'  // raíz del árbol — representa toda la estructura
    | 'Objeto'    // { ... }
    | 'Par'       // "clave": <valor>
    | 'Arreglo'   // [ ... ]
    | 'Cadena'    // "texto"
    | 'Numero'    // 42, -3.14
    | 'Booleano'  // true | false
    | 'Nulo';     // null

/**
 * Nodo genérico del AST.
 * Los campos opcionales se usan según el tipo de nodo:
 *   - Objeto/UiStruct → miembros[]
 *   - Par             → clave + valor
 *   - Arreglo         → elementos[]
 *   - Cadena/Numero/Booleano/Nulo → valorLiteral
 */
export interface NodoAST {
    tipo: NodoTipo;
    linea: number;
    columna: number;
    miembros?: NodoAST[];
    clave?: string;
    valor?: NodoAST;
    elementos?: NodoAST[];
    valorLiteral?: string;
}

/** Error sintáctico: describe qué se esperaba y dónde falló. */
export interface ParseError {
    message: string;
    line: number;
    column: number;
}

/** Resultado del análisis sintáctico completo. */
export interface ParseResult {
    ast: NodoAST | null;  // null si hubo errores
    errors: ParseError[];
    success: boolean;
}

// ── Clase principal ───────────────────────────────────────────────────────────

export class Parser {
    private tokens: Token[];
    private current: number = 0; // índice del token que se está analizando
    private errors: ParseError[] = [];

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    /**
     * Punto de entrada público.
     * Inicia el análisis desde el símbolo inicial <ui_struct> y
     * verifica que no queden tokens sin consumir al final.
     */
    public parse(): ParseResult {
        this.current = 0;
        this.errors = [];

        // UI-Struct exige al menos un objeto en la raíz
        if (this.peek().type === 'FIN_ARCHIVO') {
            this.errors.push({ message: "La entrada está vacía. Se esperaba un objeto '{ }'.", line: 1, column: 1 });
            return { ast: null, errors: this.errors, success: false };
        }

        const ast = this.parseUiStruct();

        // Si quedan tokens después del objeto raíz, es un error estructural
        if (this.peek().type !== 'FIN_ARCHIVO') {
            const tok = this.peek();
            this.errors.push({
                message: `Token inesperado '${tok.value}' después del objeto raíz. UI-Struct solo permite un objeto en la raíz.`,
                line: tok.line,
                column: tok.column,
            });
        }

        return { ast: this.errors.length === 0 ? ast : null, errors: this.errors, success: this.errors.length === 0 };
    }

    // ── Reglas gramaticales ───────────────────────────────────────────────────
    // Cada método implementa exactamente una producción de la gramática.

    /** Regla: <ui_struct> ::= <objeto> — nodo raíz del árbol */
    private parseUiStruct(): NodoAST {
        const tok = this.peek();
        const objeto = this.parseObjeto();
        return { tipo: 'UiStruct', linea: tok.line, columna: tok.column, miembros: objeto?.miembros ?? [] };
    }

    /** Regla: <objeto> ::= "{" "}" | "{" <miembros> "}" */
    private parseObjeto(): NodoAST {
        const tok = this.peek();
        this.consume('LLAVE_ABRE', "Se esperaba '{' para abrir un objeto");

        if (this.peek().type === 'LLAVE_CIERRA') {
            this.advance();
            return { tipo: 'Objeto', linea: tok.line, columna: tok.column, miembros: [] };
        }

        const miembros = this.parseMiembros();
        this.consume('LLAVE_CIERRA', "Se esperaba '}' para cerrar el objeto");
        return { tipo: 'Objeto', linea: tok.line, columna: tok.column, miembros };
    }

    /** Regla: <miembros> ::= <par> | <par> "," <miembros> — lista de pares clave:valor */
    private parseMiembros(): NodoAST[] {
        const miembros: NodoAST[] = [this.parsePar()];

        while (this.peek().type === 'COMA') {
            this.advance(); // consumir la coma

            // Detectar trailing comma: coma seguida directamente de cierre
            if (this.peek().type === 'LLAVE_CIERRA') {
                const tok = this.peek();
                this.errors.push({ message: "Coma sobrante antes de '}'. UI-Struct no permite comas finales.", line: tok.line, column: tok.column });
                break;
            }
            miembros.push(this.parsePar());
        }

        return miembros;
    }

    /** Regla: <par> ::= STRING ":" <valor> — un par clave:valor */
    private parsePar(): NodoAST {
        const tok = this.peek();

        if (tok.type !== 'CADENA') {
            this.errors.push({ message: `Se esperaba una clave de tipo cadena (ej. "nombre"), se encontró '${tok.value}'.`, line: tok.line, column: tok.column });
            this.sincronizar(['COMA', 'LLAVE_CIERRA', 'FIN_ARCHIVO']);
            return { tipo: 'Par', linea: tok.line, columna: tok.column, clave: '?', valor: undefined };
        }

        const clave = this.advance().value;
        this.consume('DOS_PUNTOS', `Se esperaba ':' después de la clave ${clave}`);
        const valor = this.parseValor();
        return { tipo: 'Par', linea: tok.line, columna: tok.column, clave, valor };
    }

    /** Regla: <valor> ::= STRING | NUMBER | <objeto> | <arreglo> | <booleano> | <nulo> */
    private parseValor(): NodoAST {
        const tok = this.peek();

        switch (tok.type) {
            case 'CADENA': this.advance(); return { tipo: 'Cadena', linea: tok.line, columna: tok.column, valorLiteral: tok.value };
            case 'NUMERO': this.advance(); return { tipo: 'Numero', linea: tok.line, columna: tok.column, valorLiteral: tok.value };
            case 'BOOLEANO': this.advance(); return { tipo: 'Booleano', linea: tok.line, columna: tok.column, valorLiteral: tok.value };
            case 'NULO': this.advance(); return { tipo: 'Nulo', linea: tok.line, columna: tok.column, valorLiteral: tok.value };
            case 'LLAVE_ABRE': return this.parseObjeto();
            case 'CORCHETE_ABRE': return this.parseArreglo();
            default:
                this.errors.push({ message: `Se esperaba un valor (cadena, número, objeto, arreglo, true, false o null), se encontró '${tok.value}'.`, line: tok.line, column: tok.column });
                this.sincronizar(['COMA', 'LLAVE_CIERRA', 'CORCHETE_CIERRA', 'FIN_ARCHIVO']);
                return { tipo: 'Nulo', linea: tok.line, columna: tok.column, valorLiteral: 'null' };
        }
    }

    /** Regla: <arreglo> ::= "[" "]" | "[" <elementos> "]" */
    private parseArreglo(): NodoAST {
        const tok = this.peek();
        this.consume('CORCHETE_ABRE', "Se esperaba '[' para abrir un arreglo");

        if (this.peek().type === 'CORCHETE_CIERRA') {
            this.advance();
            return { tipo: 'Arreglo', linea: tok.line, columna: tok.column, elementos: [] };
        }

        const elementos = this.parseElementos();
        this.consume('CORCHETE_CIERRA', "Se esperaba ']' para cerrar el arreglo");
        return { tipo: 'Arreglo', linea: tok.line, columna: tok.column, elementos };
    }

    /** Regla: <elementos> ::= <valor> | <valor> "," <elementos> — lista de valores */
    private parseElementos(): NodoAST[] {
        const elementos: NodoAST[] = [this.parseValor()];

        while (this.peek().type === 'COMA') {
            this.advance();

            if (this.peek().type === 'CORCHETE_CIERRA') {
                const tok = this.peek();
                this.errors.push({ message: "Coma sobrante antes de ']'. UI-Struct no permite comas finales.", line: tok.line, column: tok.column });
                break;
            }
            elementos.push(this.parseValor());
        }

        return elementos;
    }

    // ── Utilidades internas ───────────────────────────────────────────────────

    /** Devuelve el token actual sin consumirlo (lookahead de 1). */
    private peek(): Token {
        return this.tokens[this.current] ?? { type: 'FIN_ARCHIVO', value: '', line: 0, column: 0 };
    }

    /** Consume y devuelve el token actual, avanzando al siguiente. */
    private advance(): Token {
        const tok = this.tokens[this.current];
        if (this.current < this.tokens.length - 1) this.current++;
        return tok;
    }

    /**
     * Intenta consumir un token del tipo esperado.
     * Si no coincide, registra el error y devuelve null (sin lanzar excepción).
     */
    private consume(expected: TokenType, errorMsg: string): Token | null {
        if (this.peek().type === expected) return this.advance();
        const tok = this.peek();
        this.errors.push({ message: errorMsg, line: tok.line, column: tok.column });
        return null;
    }

    /**
     * Recuperación de errores por modo pánico:
     * avanza en los tokens hasta encontrar uno que permita retomar el análisis.
     * Evita que un error único genere una cascada de falsos errores.
     */
    private sincronizar(stopAt: TokenType[]) {
        while (!stopAt.includes(this.peek().type) && this.peek().type !== 'FIN_ARCHIVO') {
            this.advance();
        }
    }
}