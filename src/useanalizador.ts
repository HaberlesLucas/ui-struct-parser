/**
 * @file useAnalizador.ts
 * @description Hook personalizado que centraliza la lógica de análisis de UI-Struct.
 *
 * Separa la lógica del Lexer + Parser de los componentes visuales.
 * Implementa debounce para no analizar en cada tecla, sino 300ms después
 * de que el usuario deja de escribir — mejora el rendimiento notablemente.
 */

import { useState, useEffect, useCallback } from 'react';
import { Lexer, type LexerError, type Token } from './lib/lexer';
import { Parser, type NodoAST, type ParseError } from './lib/parser';

/** Estado completo del analizador expuesto al componente. */
export interface EstadoAnalizador {
    tokens: Token[];
    lexerErrors: LexerError[];
    ast: NodoAST | null;
    parseErrors: ParseError[];
    esValido: boolean | null;  // null = aún no se analizó
    totalTokens: number;
    totalErrores: number;
}

/**
 * Ejecuta el Lexer y el Parser sobre el código de entrada.
 * Si el Lexer encuentra errores, el Parser no se ejecuta
 * (no tendría sentido analizar tokens mal formados).
 */
function ejecutarAnalisis(codigo: string): EstadoAnalizador {
    const lexer = new Lexer(codigo);
    const { tokens, errors: lexerErrors } = lexer.tokenize();

    const tokensVisibles = tokens.filter(t => t.type !== 'FIN_ARCHIVO');

    // Si hay errores léxicos, detenemos aquí
    if (lexerErrors.length > 0) {
        return {
            tokens, lexerErrors, ast: null,
            parseErrors: [], esValido: false,
            totalTokens: tokensVisibles.length,
            totalErrores: lexerErrors.length,
        };
    }

    // Sin errores léxicos: ejecutar el Parser
    const parser = new Parser(tokens);
    const resultado = parser.parse();

    return {
        tokens, lexerErrors: [],
        ast: resultado.ast,
        parseErrors: resultado.errors,
        esValido: resultado.success,
        totalTokens: tokensVisibles.length,
        totalErrores: resultado.errors.length,
    };
}

/**
 * Hook principal del analizador.
 * @param codigo - El texto UI-Struct ingresado por el usuario.
 * @param debounceMs - Milisegundos de espera antes de analizar (por defecto 300ms).
 */
export function useAnalizador(codigo: string, debounceMs = 300): EstadoAnalizador {
    const [estado, setEstado] = useState<EstadoAnalizador>({
        tokens: [], lexerErrors: [], ast: null,
        parseErrors: [], esValido: null,
        totalTokens: 0, totalErrores: 0,
    });

    // Memoizamos la función de análisis para no recrearla en cada render
    const analizar = useCallback((c: string) => {
        setEstado(ejecutarAnalisis(c));
    }, []);

    // Debounce: esperamos a que el usuario termine de escribir
    useEffect(() => {
        const timer = setTimeout(() => analizar(codigo), debounceMs);
        return () => clearTimeout(timer); // cancela el timer si el usuario sigue escribiendo
    }, [codigo, debounceMs, analizar]);

    return estado;
}