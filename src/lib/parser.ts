/**
 * @file parser.ts
 * @description Parser Descendente Recursivo para el lenguaje UI-Struct.
 *
 * Implementa la Gramática Libre de Contexto (GLC) LL(1) factorizada por izquierda.
 * Cada símbolo no-terminal de la gramática se convierte en un método estricto.
 *
 * Gramática Actualizada (LL(1)):
 * 1.  <ui_struct>       ::= <objeto>
 * 2.  <objeto>          ::= LLAVE_ABRE <resto_objeto>
 * 3.  <resto_objeto>    ::= LLAVE_CIERRA | <miembros> LLAVE_CIERRA
 * 4.  <miembros>        ::= <par> <resto_miembros>
 * 5.  <resto_miembros>  ::= COMA <miembros> | ε
 * 6.  <par>             ::= CADENA DOS_PUNTOS <valor>
 * 7.  <valor>           ::= CADENA | NUMERO | BOOLEANO | NULO | <objeto> | <arreglo>
 * 8.  <arreglo>         ::= CORCHETE_ABRE <resto_arreglo>
 * 9.  <resto_arreglo>   ::= CORCHETE_CIERRA | <elementos> CORCHETE_CIERRA
 * 10. <elementos>       ::= <valor> <resto_elementos>
 * 11. <resto_elementos> ::= COMA <elementos> | ε
 */

import type { Token, TokenType } from './lexer';

// ── Nodos del Árbol Sintáctico Abstracto (AST) ───────────────────────────────

export type NodoTipo =
    | 'UiStruct'
    | 'Objeto'
    | 'Par'
    | 'Arreglo'
    | 'Cadena'
    | 'Numero'
    | 'Booleano'
    | 'Nulo';

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

export interface ParseError {
    message: string;
    line: number;
    column: number;
    nivel: 'SINTÁCTICO' | 'SEMÁNTICO';
}

export interface ParseResult {
    ast: NodoAST | null;
    errors: ParseError[];
    success: boolean;
}

// ── Clase principal ───────────────────────────────────────────────────────────

export class Parser {
    private tokens: Token[];
    private current: number = 0;
    private errors: ParseError[] = [];

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    public parse(): ParseResult {
        this.current = 0;
        this.errors = [];

        if (this.peek().type === 'FIN_ARCHIVO') {
            this.errors.push({ message: "La entrada está vacía. Se esperaba un objeto '{ }'.", line: 1, column: 1, nivel: 'SINTÁCTICO' });
            return { ast: null, errors: this.errors, success: false };
        }

        // 1. <ui_struct> ::= <objeto>
        const ast = this.parseUiStruct();

        if (this.peek().type !== 'FIN_ARCHIVO') {
            const tok = this.peek();
            this.errors.push({
                message: `Token inesperado '${tok.value}' después del objeto raíz. UI-Struct solo permite un objeto en la raíz.`,
                line: tok.line,
                column: tok.column,
                nivel: 'SINTÁCTICO'
            });
        }

        return { ast: this.errors.length === 0 ? ast : null, errors: this.errors, success: this.errors.length === 0 };
    }

    // ── Reglas gramaticales LL(1) estrictas ───────────────────────────────────

    // 1. <ui_struct> ::= <objeto>
    private parseUiStruct(): NodoAST {
        const tok = this.peek();
        const objeto = this.parseObjeto();
        return { tipo: 'UiStruct', linea: tok.line, columna: tok.column, miembros: objeto?.miembros ?? [] };
    }

    // 2. <objeto> ::= LLAVE_ABRE <resto_objeto>
    private parseObjeto(): NodoAST {
        const tok = this.peek();
        this.consume('LLAVE_ABRE', "Se esperaba '{' para abrir un objeto");

        const miembros = this.parseRestoObjeto();

        // Validación Semántica exclusiva de UI-Struct
        this.validarSemantica(miembros, tok.line, tok.column);

        return { tipo: 'Objeto', linea: tok.line, columna: tok.column, miembros };
    }

    // 3. <resto_objeto> ::= LLAVE_CIERRA | <miembros> LLAVE_CIERRA
    private parseRestoObjeto(): NodoAST[] {
        if (this.peek().type === 'LLAVE_CIERRA') {
            this.advance(); // consume '}'
            return [];
        }

        const miembros = this.parseMiembros();
        this.consume('LLAVE_CIERRA', "Se esperaba '}' para cerrar el objeto");
        return miembros;
    }

    // 4. <miembros> ::= <par> <resto_miembros>
    private parseMiembros(): NodoAST[] {
        const par = this.parsePar();
        const resto = this.parseRestoMiembros();
        return [par, ...resto]; // Construye el array plano para el AST
    }

    // 5. <resto_miembros> ::= COMA <miembros> | ε
    private parseRestoMiembros(): NodoAST[] {
        if (this.peek().type === 'COMA') {
            this.advance(); // consume ','

            if (this.peek().type === 'LLAVE_CIERRA') {
                const tok = this.peek();
                this.errors.push({ message: "Coma sobrante antes de '}'. UI-Struct no permite comas finales.", line: tok.line, column: tok.column, nivel: 'SINTÁCTICO' });
                return [];
            }

            return this.parseMiembros();
        }
        return []; // Transición vacía (ε)
    }

    // 6. <par> ::= CADENA DOS_PUNTOS <valor>
    private parsePar(): NodoAST {
        const tok = this.peek();

        if (tok.type !== 'CADENA') {
            this.errors.push({ message: `Se esperaba una clave de tipo cadena (ej. "nombre"), se encontró '${tok.value}'.`, line: tok.line, column: tok.column, nivel: 'SINTÁCTICO' });
            this.sincronizar(['COMA', 'LLAVE_CIERRA', 'FIN_ARCHIVO']);
            return { tipo: 'Par', linea: tok.line, columna: tok.column, clave: '?', valor: undefined };
        }

        const clave = this.advance().value;
        this.consume('DOS_PUNTOS', `Se esperaba ':' después de la clave ${clave}`);
        const valor = this.parseValor();
        return { tipo: 'Par', linea: tok.line, columna: tok.column, clave, valor };
    }

    // 7. <valor> ::= CADENA | NUMERO | BOOLEANO | NULO | <objeto> | <arreglo>
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
                this.errors.push({ message: `Se esperaba un valor válido, se encontró '${tok.value}'.`, line: tok.line, column: tok.column, nivel: 'SINTÁCTICO' });
                this.sincronizar(['COMA', 'LLAVE_CIERRA', 'CORCHETE_CIERRA', 'FIN_ARCHIVO']);
                return { tipo: 'Nulo', linea: tok.line, columna: tok.column, valorLiteral: 'null' };
        }
    }

    // 8. <arreglo> ::= CORCHETE_ABRE <resto_arreglo>
    private parseArreglo(): NodoAST {
        const tok = this.peek();
        this.consume('CORCHETE_ABRE', "Se esperaba '[' para abrir un arreglo");

        const elementos = this.parseRestoArreglo();
        return { tipo: 'Arreglo', linea: tok.line, columna: tok.column, elementos };
    }

    // 9. <resto_arreglo> ::= CORCHETE_CIERRA | <elementos> CORCHETE_CIERRA
    private parseRestoArreglo(): NodoAST[] {
        if (this.peek().type === 'CORCHETE_CIERRA') {
            this.advance(); // consume ']'
            return [];
        }

        const elementos = this.parseElementos();
        this.consume('CORCHETE_CIERRA', "Se esperaba ']' para cerrar el arreglo");
        return elementos;
    }

    // 10. <elementos> ::= <valor> <resto_elementos>
    private parseElementos(): NodoAST[] {
        const valor = this.parseValor();
        const resto = this.parseRestoElementos();
        return [valor, ...resto];
    }

    // 11. <resto_elementos> ::= COMA <elementos> | ε
    private parseRestoElementos(): NodoAST[] {
        if (this.peek().type === 'COMA') {
            this.advance(); // consume ','

            if (this.peek().type === 'CORCHETE_CIERRA') {
                const tok = this.peek();
                this.errors.push({ message: "Coma sobrante antes de ']'. UI-Struct no permite comas finales.", line: tok.line, column: tok.column, nivel: 'SINTÁCTICO' });
                return [];
            }

            return this.parseElementos();
        }
        return []; // Transición vacía (ε)
    }

    // ── Validación Semántica UI-Struct ────────────────────────────────────────

    private validarSemantica(miembros: NodoAST[], linea: number, columna: number) {
        let tieneTipo = false;
        const componentesValidos = ['"Contenedor"', '"Boton"', '"Texto"', '"Input"', '"Imagen"'];

        for (const par of miembros) {
            if (par.tipo === 'Par' && par.clave) {
                if (par.clave === '"tipo"') {
                    tieneTipo = true;
                    if (par.valor && par.valor.tipo === 'Cadena') {
                        if (!componentesValidos.includes(par.valor.valorLiteral || "")) {
                            this.errors.push({
                                message: `Componente UI inválido: ${par.valor.valorLiteral}. Permitidos: Contenedor, Boton, Texto, Input, Imagen.`,
                                line: par.linea,
                                column: par.columna,
                                nivel: 'SEMÁNTICO'
                            });
                        }
                    }
                }

                if (par.clave === '"visible"' || par.clave === '"activo"') {
                    if (par.valor && par.valor.tipo !== 'Booleano') {
                        this.errors.push({
                            message: `La propiedad ${par.clave} exige un valor BOOLEANO (true/false).`,
                            line: par.valor?.linea || par.linea,
                            column: par.valor?.columna || par.columna,
                            nivel: 'SEMÁNTICO'
                        });
                    }
                }

                if (par.clave === '"margen"' || par.clave === '"padding"') {
                    if (par.valor && par.valor.tipo !== 'Numero') {
                        this.errors.push({
                            message: `La propiedad ${par.clave} exige un valor NUMERICO.`,
                            line: par.valor?.linea || par.linea,
                            column: par.valor?.columna || par.columna,
                            nivel: 'SEMÁNTICO'
                        });
                    }
                }
            }
        }

        if (!tieneTipo) {
            this.errors.push({
                message: 'Todo nodo visual debe poseer obligatoriamente la clave "tipo".',
                line: linea,
                column: columna,
                nivel: 'SEMÁNTICO'
            });
        }
    }

    // ── Utilidades internas ───────────────────────────────────────────────────

    private peek(): Token {
        return this.tokens[this.current] ?? { type: 'FIN_ARCHIVO', value: '', line: 0, column: 0 };
    }

    private advance(): Token {
        const tok = this.tokens[this.current];
        if (this.current < this.tokens.length - 1) this.current++;
        return tok;
    }

    private consume(expected: TokenType, errorMsg: string): Token | null {
        if (this.peek().type === expected) return this.advance();
        const tok = this.peek();
        this.errors.push({ message: errorMsg, line: tok.line, column: tok.column, nivel: 'SINTÁCTICO' });
        return null;
    }

    private sincronizar(stopAt: TokenType[]) {
        while (!stopAt.includes(this.peek().type) && this.peek().type !== 'FIN_ARCHIVO') {
            this.advance();
        }
    }
}