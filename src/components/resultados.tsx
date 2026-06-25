/**
 * @file Resultados.tsx
 * @description Panel derecho: visualización de los resultados del análisis.
 *
 * Contiene tres vistas intercambiables mediante tabs:
 *   1. TabTokens  — tabla con todos los tokens generados por el Lexer
 *   2. TabAST     — árbol sintáctico abstracto colapsable
 *   3. TabErrores — lista de errores léxicos y sintácticos
 */

import { useState } from "react";

import { TOKEN_COLORS, NODO_COLORS } from "../constants";
import type { LexerError, Token } from "../lib/lexer";
import type { NodoAST, ParseError } from "../lib/parser";
// ── Tipos ─────────────────────────────────────────────────────────────────────

export type TabActiva = "tokens" | "ast" | "errores";

interface ResultadosProps {
  tokens: Token[];
  lexerErrors: LexerError[];
  ast: NodoAST | null;
  parseErrors: ParseError[];
  esValido: boolean | null;
  totalTokens: number;
  totalErrores: number;
}

// ── Componente raíz del panel derecho ─────────────────────────────────────────

export function Resultados(props: ResultadosProps) {
  const [tab, setTab] = useState<TabActiva>("tokens");

  const tabs: { id: TabActiva; label: string }[] = [
    { id: "tokens", label: `TOKENS (${props.totalTokens})` },
    { id: "ast", label: "AST" },
    { id: "errores", label: `ERRORES (${props.totalErrores})` },
  ];

  return (
    <div className="flex flex-col flex-1">
      {/* Selector de tabs */}
      <div className="flex bg-ui-surface border-b border-ui-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`
              px-5 py-2.5 text-[10px] tracking-widest border-b-2 transition-colors
              ${
                tab === t.id
                  ? "border-violet-400 text-violet-400"
                  : "border-transparent text-ui-muted hover:text-ui-text"
              }
            `}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido de la tab activa */}
      <div className="flex-1 overflow-y-auto p-4 bg-ui-bg">
        {tab === "tokens" && <TabTokens tokens={props.tokens} />}
        {tab === "ast" && <TabAST ast={props.ast} esValido={props.esValido} />}
        {tab === "errores" && (
          <TabErrores
            lexerErrors={props.lexerErrors}
            parseErrors={props.parseErrors}
          />
        )}
      </div>
    </div>
  );
}

// ── Tab 1: Tokens ─────────────────────────────────────────────────────────────

function TabTokens({ tokens }: { tokens: Token[] }) {
  const visibles = tokens.filter((t) => t.type !== "FIN_ARCHIVO");

  if (!visibles.length) {
    return (
      <EstadoVacio mensaje="Sin tokens — escribí código UI-Struct en el editor" />
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {visibles.map((tok, i) => (
        <div
          key={i}
          className={`grid gap-2 px-2 py-1 rounded text-[11px] font-mono ${i % 2 === 0 ? "bg-ui-surface" : ""}`}
          style={{ gridTemplateColumns: "24px 140px 1fr 70px" }}
        >
          {/* Número de orden */}
          <span className="text-ui-dim text-right">{i + 1}</span>

          {/* Tipo de token coloreado */}
          <span
            style={{ color: TOKEN_COLORS[tok.type] ?? "#94a3b8" }}
            className="font-semibold text-[10px]"
          >
            {tok.type}
          </span>

          {/* Valor original */}
          <span className="text-slate-400 truncate">{tok.value || "ε"}</span>

          {/* Posición en el código fuente */}
          <span className="text-ui-dim text-[10px] text-right">
            {tok.line}:{tok.column}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Tab 2: AST ────────────────────────────────────────────────────────────────

function TabAST({
  ast,
  esValido,
}: {
  ast: NodoAST | null;
  esValido: boolean | null;
}) {
  if (!ast || !esValido) {
    return (
      <EstadoVacio
        icono={esValido === false ? "✗" : "…"}
        color={esValido === false ? "#ef4444" : "#475569"}
        mensaje={
          esValido === false
            ? "El AST no se genera cuando hay errores. Corregí los errores primero."
            : "El AST se construirá cuando el código sea sintácticamente válido."
        }
      />
    );
  }

  return (
    <div>
      <p className="text-[10px] text-ui-muted mb-3">
        Árbol Sintáctico Abstracto — hacé clic en los nodos para
        colapsar/expandir
      </p>
      <NodoVista nodo={ast} />
    </div>
  );
}

/**
 * Nodo recursivo del AST.
 * Cada nodo puede tener hijos (miembros, elementos o valor),
 * y se puede colapsar/expandir con un clic.
 */
function NodoVista({
  nodo,
  profundidad = 0,
}: {
  nodo: NodoAST;
  profundidad?: number;
}) {
  const [colapsado, setColapsado] = useState(false);
  const color = NODO_COLORS[nodo.tipo] ?? "#94a3b8";

  // Recopilar todos los nodos hijos en un array plano
  const hijos: NodoAST[] = [
    ...(nodo.miembros ?? []),
    ...(nodo.elementos ?? []),
    ...(nodo.valor ? [nodo.valor] : []),
  ];
  const tieneHijos = hijos.length > 0;

  return (
    <div style={{ marginLeft: profundidad * 14 }} className="mb-0.5">
      {/* Fila del nodo */}
      <div
        className="flex items-center gap-1.5 py-0.5"
        style={{ cursor: tieneHijos ? "pointer" : "default" }}
        onClick={() => tieneHijos && setColapsado(!colapsado)}
      >
        {/* Indicador de colapso */}
        <span className="text-[9px] text-ui-muted w-2.5 select-none">
          {tieneHijos ? (colapsado ? "▶" : "▼") : ""}
        </span>

        {/* Badge con el tipo de nodo */}
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded border font-mono"
          style={{ color, background: color + "22", borderColor: color + "44" }}
        >
          {nodo.tipo}
        </span>

        {/* Clave (para nodos Par) */}
        {nodo.clave && (
          <span className="text-[11px] text-slate-400 font-mono">
            {nodo.clave}
          </span>
        )}

        {/* Valor literal (para nodos hoja) */}
        {nodo.valorLiteral !== undefined && (
          <span className="text-[11px] font-mono" style={{ color }}>
            = {nodo.valorLiteral}
          </span>
        )}

        {/* Posición en el código fuente */}
        <span className="text-[10px] text-ui-dim">
          L{nodo.linea}:{nodo.columna}
        </span>
      </div>

      {/* Hijos — ocultos si el nodo está colapsado */}
      {!colapsado &&
        hijos.map((h, i) => (
          <NodoVista key={i} nodo={h} profundidad={profundidad + 1} />
        ))}
    </div>
  );
}

// ── Tab 3: Errores ────────────────────────────────────────────────────────────

interface ErrorItem {
  message: string;
  line: number;
  column: number;
}

function TabErrores({
  lexerErrors,
  parseErrors,
}: {
  lexerErrors: LexerError[];
  parseErrors: ParseError[];
}) {
  const hayErrores = lexerErrors.length > 0 || parseErrors.length > 0;

  if (!hayErrores) {
    return (
      <EstadoVacio
        icono="✓"
        color="#22c55e"
        mensaje="Sin errores — la estructura es semántica y sintácticamente válida"
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {lexerErrors.map((e, i) => (
        <TarjetaError key={`lex-${i}`} tipo="LÉXICO" error={e} />
      ))}
      {/* Acá mapeamos el nivel exacto que viene del parser (Sintáctico o Semántico) */}
      {parseErrors.map((e, i) => (
        <TarjetaError key={`par-${i}`} tipo={e.nivel} error={e} />
      ))}
    </div>
  );
}

function TarjetaError({
  tipo,
  error,
}: {
  tipo: "LÉXICO" | "SINTÁCTICO" | "SEMÁNTICO";
  error: { message: string; line: number; column: number };
}) {
  // Colores: Léxico (Naranja), Sintáctico (Rojo), Semántico (Morado/Lila)
  const color = 
    tipo === "LÉXICO" ? "#f59e0b" : 
    tipo === "SINTÁCTICO" ? "#ef4444" : 
    "#a855f7"; // Color lila para semántica
    
  return (
    <div
      className="border-l-[3px] rounded-r-md px-3 py-2"
      style={{ borderColor: color, background: color + "11" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-widest"
          style={{ color, background: color + "22" }}
        >
          {tipo}
        </span>
        <span className="text-[10px] text-ui-muted">
          línea {error.line}, columna {error.column}
        </span>
      </div>
      <p className="text-[11px] text-ui-text m-0">{error.message}</p>
    </div>
  );
}

// ── Estado vacío genérico ─────────────────────────────────────────────────────

/**
 * Pantalla de estado vacío reutilizable para las tres tabs.
 * Muestra un ícono y un mensaje descriptivo centrados.
 */
function EstadoVacio({
  mensaje,
  icono = "…",
  color = "#475569",
}: {
  mensaje: string;
  icono?: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-3">
      <span className="text-3xl" style={{ color }}>
        {icono}
      </span>
      <p className="text-[11px] text-ui-muted text-center max-w-xs leading-relaxed">
        {mensaje}
      </p>
    </div>
  );
}
