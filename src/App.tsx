import { useState, useEffect, useRef, useCallback } from "react";
import { Lexer, type LexerError, type Token } from "./lib/lexer";
import { Parser, type NodoAST, type ParseError } from "./lib/parser";

// ── Tipos de tab del panel derecho ──────────────────────────
type TabType = "tokens" | "ast" | "errores";

// ── Colores por tipo de token ────────────────────────────────
const TOKEN_COLORS: Record<string, string> = {
  LLAVE_ABRE: "#e879f9",
  LLAVE_CIERRA: "#e879f9",
  CORCHETE_ABRE: "#fb923c",
  CORCHETE_CIERRA: "#fb923c",
  DOS_PUNTOS: "#94a3b8",
  COMA: "#94a3b8",
  CADENA: "#34d399",
  NUMERO: "#60a5fa",
  BOOLEANO: "#facc15",
  NULO: "#f87171",
  FIN_ARCHIVO: "#475569",
};

// ── Componente: Nodo del AST (recursivo) ─────────────────────
function NodoASTVista({ nodo, depth = 0 }: { nodo: NodoAST; depth?: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const indent = depth * 16;

  const tipoColor: Record<string, string> = {
    UiStruct: "#a78bfa",
    Objeto: "#e879f9",
    Par: "#34d399",
    Arreglo: "#fb923c",
    Cadena: "#34d399",
    Numero: "#60a5fa",
    Booleano: "#facc15",
    Nulo: "#f87171",
  };

  const color = tipoColor[nodo.tipo] ?? "#94a3b8";
  const hasChildren =
    (nodo.miembros && nodo.miembros.length > 0) ||
    (nodo.elementos && nodo.elementos.length > 0) ||
    nodo.valor;

  return (
    <div style={{ marginLeft: indent, marginBottom: 2 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: hasChildren ? "pointer" : "default",
        }}
        onClick={() => hasChildren && setCollapsed(!collapsed)}
      >
        {hasChildren && (
          <span
            style={{
              color: "#475569",
              fontSize: 10,
              userSelect: "none",
              width: 10,
            }}
          >
            {collapsed ? "▶" : "▼"}
          </span>
        )}
        {!hasChildren && <span style={{ width: 10 }} />}

        <span
          style={{
            background: color + "22",
            color,
            fontSize: 11,
            fontWeight: 600,
            padding: "1px 7px",
            borderRadius: 4,
            border: `1px solid ${color}44`,
            fontFamily: "monospace",
          }}
        >
          {nodo.tipo}
        </span>

        {nodo.clave && (
          <span
            style={{ color: "#94a3b8", fontSize: 12, fontFamily: "monospace" }}
          >
            {nodo.clave}
          </span>
        )}
        {nodo.valorLiteral !== undefined && (
          <span style={{ color, fontSize: 12, fontFamily: "monospace" }}>
            = {nodo.valorLiteral}
          </span>
        )}
        <span style={{ color: "#334155", fontSize: 10 }}>
          L{nodo.linea}:{nodo.columna}
        </span>
      </div>

      {!collapsed && (
        <>
          {nodo.valor && <NodoASTVista nodo={nodo.valor} depth={depth + 1} />}
          {nodo.miembros?.map((m, i) => (
            <NodoASTVista key={i} nodo={m} depth={depth + 1} />
          ))}
          {nodo.elementos?.map((e, i) => (
            <NodoASTVista key={i} nodo={e} depth={depth + 1} />
          ))}
        </>
      )}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────
function App() {
  const EJEMPLO_INICIAL = `{
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
      "contenido": "Hola mundo"
    }
  ]
}`;

  const [inputCode, setInputCode] = useState(EJEMPLO_INICIAL);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [lexerErrors, setLexerErrors] = useState<LexerError[]>([]);
  const [ast, setAst] = useState<NodoAST | null>(null);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [tab, setTab] = useState<TabType>("tokens");
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const analyze = useCallback((code: string) => {
    const lexer = new Lexer(code);
    const { tokens: toks, errors: lErrors } = lexer.tokenize();
    setTokens(toks);
    setLexerErrors(lErrors);

    if (lErrors.length > 0) {
      setAst(null);
      setParseErrors([]);
      setIsValid(false);
      setTab("errores");
      return;
    }

    const parser = new Parser(toks);
    const result = parser.parse();
    setAst(result.ast);
    setParseErrors(result.errors);
    setIsValid(result.success);

    if (!result.success) setTab("errores");
  }, []);

  // Análisis en tiempo real con debounce
  useEffect(() => {
    const timer = setTimeout(() => analyze(inputCode), 300);
    return () => clearTimeout(timer);
  }, [inputCode, analyze]);

  const totalErrors = lexerErrors.length + parseErrors.length;
  const tokenCount = tokens.filter((t) => t.type !== "FIN_ARCHIVO").length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0e1a",
        color: "#e2e8f0",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid #1e2d3d",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#0d1320",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background:
                isValid === null ? "#475569" : isValid ? "#22c55e" : "#ef4444",
              boxShadow:
                isValid === null
                  ? "none"
                  : isValid
                    ? "0 0 8px #22c55e88"
                    : "0 0 8px #ef444488",
            }}
          />
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#a78bfa",
              letterSpacing: "0.05em",
            }}
          >
            UI-STRUCT
          </span>
          <span
            style={{ fontSize: 12, color: "#334155", letterSpacing: "0.1em" }}
          >
            ANALIZADOR LÉXICO–SINTÁCTICO
          </span>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Pill label={`${tokenCount} tokens`} color="#60a5fa" />
          <Pill
            label={
              totalErrors === 0
                ? "sin errores"
                : `${totalErrors} error${totalErrors !== 1 ? "es" : ""}`
            }
            color={totalErrors === 0 ? "#22c55e" : "#ef4444"}
          />
          {isValid !== null && (
            <Pill
              label={isValid ? "✓ válido" : "✗ inválido"}
              color={isValid ? "#22c55e" : "#ef4444"}
            />
          )}
        </div>
      </header>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Panel izquierdo — Editor */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #1e2d3d",
          }}
        >
          <div
            style={{
              padding: "8px 16px",
              borderBottom: "1px solid #1e2d3d",
              fontSize: 11,
              color: "#475569",
              background: "#0d1320",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>ENTRADA — código UI-Struct</span>
            <button
              onClick={() => setInputCode(EJEMPLO_INICIAL)}
              style={{
                background: "none",
                border: "none",
                color: "#475569",
                cursor: "pointer",
                fontSize: 11,
                backgroundColor: "#d9d9d922",
                borderRadius: 4,
              }}
            >
              restablecer ejemplo
            </button>
          </div>

          <div style={{ position: "relative", flex: 1 }}>
            {/* Números de línea */}
            <LineNumbers code={inputCode} />
            <textarea
              ref={textareaRef}
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              spellCheck={false}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                padding: "12px 16px 12px 52px",
                background: "transparent",
                color: "#e2e8f0",
                fontSize: 13,
                lineHeight: "1.7",
                fontFamily: "inherit",
                border: "none",
                resize: "none",
                outline: "none",
                caretColor: "#a78bfa",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Status bar editor */}
          <div
            style={{
              padding: "6px 16px",
              borderTop: "1px solid #1e2d3d",
              fontSize: 10,
              color: "#334155",
              background: "#0d1320",
              display: "flex",
              gap: 16,
            }}
          >
            <span>análisis en tiempo real</span>
            <span>GLC LL(1) — Parser Descendente Recursivo</span>
          </div>
        </div>

        {/* Panel derecho — Resultados */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Tabs */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid #1e2d3d",
              background: "#0d1320",
            }}
          >
            {(["tokens", "ast", "errores"] as TabType[]).map((t) => {
              const labels: Record<TabType, string> = {
                tokens: `TOKENS (${tokenCount})`,
                ast: "AST",
                errores: `ERRORES (${totalErrors})`,
              };
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: "10px 20px",
                    fontSize: 11,
                    background: "none",
                    border: "none",
                    borderBottom:
                      tab === t ? "2px solid #a78bfa" : "2px solid transparent",
                    color: tab === t ? "#a78bfa" : "#475569",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    letterSpacing: "0.08em",
                  }}
                >
                  {labels[t]}
                </button>
              );
            })}
          </div>

          {/* Contenido del panel */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 16,
              background: "#0a0e1a",
            }}
          >
            {tab === "tokens" && <TabTokens tokens={tokens} />}
            {tab === "ast" && <TabAST ast={ast} isValid={isValid} />}
            {tab === "errores" && (
              <TabErrores lexerErrors={lexerErrors} parseErrors={parseErrors} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-componentes de tabs ──────────────────────────────────

function TabTokens({ tokens }: { tokens: Token[] }) {
  const visible = tokens.filter((t) => t.type !== "FIN_ARCHIVO");
  if (visible.length === 0) {
    return (
      <EmptyState message="Sin tokens — escribí código UI-Struct en el editor" />
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {visible.map((tok, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "28px 140px 1fr 80px",
            alignItems: "center",
            gap: 8,
            padding: "4px 8px",
            borderRadius: 4,
            background: i % 2 === 0 ? "#0d1320" : "transparent",
            fontSize: 12,
          }}
        >
          <span style={{ color: "#334155", textAlign: "right" }}>{i + 1}</span>
          <span
            style={{
              color: TOKEN_COLORS[tok.type] ?? "#94a3b8",
              fontWeight: 600,
              fontSize: 11,
            }}
          >
            {tok.type}
          </span>
          <span
            style={{
              color: "#94a3b8",
              fontFamily: "monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {tok.value || "ε"}
          </span>
          <span style={{ color: "#334155", fontSize: 10, textAlign: "right" }}>
            {tok.line}:{tok.column}
          </span>
        </div>
      ))}
    </div>
  );
}

function TabAST({
  ast,
  isValid,
}: {
  ast: NodoAST | null;
  isValid: boolean | null;
}) {
  if (!isValid || !ast) {
    return (
      <EmptyState
        message={
          isValid === false
            ? "El AST no se genera cuando hay errores sintácticos. Corregí los errores primero."
            : "El AST se construirá cuando el código sea sintácticamente válido."
        }
        icon={isValid === false ? "error" : "wait"}
      />
    );
  }
  return (
    <div>
      <div style={{ marginBlockEnd: 12, fontSize: 11, color: "#334155" }}>
        Árbol Sintáctico Abstracto — hacé clic en los nodos para
        expandir/colapsar
      </div>
      <NodoASTVista nodo={ast} />
    </div>
  );
}

// function TabErrores({
//   lexerErrors,
//   parseErrors,
// }: {
//   lexerErrors: LexerError[];
//   parseErrors: ParseError[];
// }) {
//   const total = lexerErrors.length + parseErrors.length;
//   if (total === 0) {
//     return (
//       <EmptyState
//         message="Sin errores — la estructura es sintácticamente válida ✓"
//         icon="ok"
//       />
//     );
//   }
//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//       {lexerErrors.map((e, i) => (
//         <ErrorCard key={`lex-${i}`} tipo="LÉXICO" error={e} />
//       ))}
//       {parseErrors.map((e, i) => (
//         <ErrorCard key={`par-${i}`} tipo="SINTÁCTICO" error={e} />
//       ))}
//     </div>
//   );
// }

// function ErrorCard({
//   tipo,
//   error,
// }: {
//   tipo: "LÉXICO" | "SINTÁCTICO";
//   color?: string;
//   error: { message: string; line: number; column: number };
// }) {
//   const c = tipo === "LÉXICO" ? "#f59e0b" : "#ef4444";
//   return (
//     <div
//       style={{
//         borderInlineStart: `3px solid ${c}`,
//         background: c + "11",
//         borderRadius: "0 6px 6px 0",
//         padding: "10px 14px",
//       }}
//     >
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           gap: 8,
//           marginBottom: 4,
//         }}
//       >
//         <span
//           style={{
//             fontSize: 10,
//             fontWeight: 700,
//             color: c,
//             background: c + "22",
//             padding: "2px 6px",
//             borderRadius: 3,
//           }}
//         >
//           {tipo}
//         </span>
//         <span style={{ fontSize: 11, color: "#475569" }}>
//           línea {error.line}, columna {error.column}
//         </span>
//       </div>
//       <p style={{ fontSize: 12, color: "#e2e8f0", margin: 0 }}>
//         {error.message}
//       </p>
//     </div>
//   );
// }

function TabErrores({
  lexerErrors,
  parseErrors,
}: {
  lexerErrors: LexerError[];
  parseErrors: ParseError[];
}) {
  const total = lexerErrors.length + parseErrors.length;
  if (total === 0) {
    return (
      <EmptyState
        message="Sin errores — la estructura es sintácticamente válida ✓"
        icon="ok"
      />
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {lexerErrors.map((e, i) => (
        <ErrorCard key={`lex-${i}`} tipo="LÉXICO" error={e} />
      ))}
      {parseErrors.map((e, i) => (
        // Utilizamos el nivel dinámico que viene del parser
        <ErrorCard
          key={`par-${i}`}
          tipo={e.nivel as "SINTÁCTICO" | "SEMÁNTICO"}
          error={e}
        />
      ))}
    </div>
  );
}

function ErrorCard({
  tipo,
  error,
}: {
  tipo: "LÉXICO" | "SINTÁCTICO" | "SEMÁNTICO"; // Agregamos SEMÁNTICO al tipado
  color?: string;
  error: { message: string; line: number; column: number };
}) {
  // Ajustamos los colores según el tipo
  const c =
    tipo === "LÉXICO"
      ? "#f59e0b"
      : tipo === "SINTÁCTICO"
        ? "#ef4444"
        : "#a855f7"; // Color morado/lila para semántica

  return (
    <div
      style={{
        borderInlineStart: `3px solid ${c}`,
        background: c + "11",
        borderRadius: "0 6px 6px 0",
        padding: "10px 14px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: c,
            background: c + "22",
            padding: "2px 6px",
            borderRadius: 3,
          }}
        >
          {tipo}
        </span>
        <span style={{ fontSize: 11, color: "#475569" }}>
          línea {error.line}, columna {error.column}
        </span>
      </div>
      <p style={{ fontSize: 12, color: "#e2e8f0", margin: 0 }}>
        {error.message}
      </p>
    </div>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        color,
        background: color + "18",
        border: `1px solid ${color}33`,
        padding: "3px 10px",
        borderRadius: 20,
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </span>
  );
}

function EmptyState({ message, icon }: { message: string; icon?: string }) {
  const emoji = icon === "error" ? "✗" : icon === "ok" ? "✓" : "…";
  const c =
    icon === "error" ? "#ef4444" : icon === "ok" ? "#22c55e" : "#475569";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: 200,
        gap: 12,
        color: "#334155",
      }}
    >
      <span style={{ fontSize: 28, color: c }}>{emoji}</span>
      <p
        style={{
          fontSize: 12,
          textAlign: "center",
          maxWidth: 300,
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        {message}
      </p>
    </div>
  );
}

function LineNumbers({ code }: { code: string }) {
  const lines = code.split("\n"); // Contar líneas por salto de línea
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 44,
        padding: "12px 8px",
        fontSize: 13,
        lineHeight: "1.7",
        color: "#283548",
        textAlign: "right",
        userSelect: "none",
        pointerEvents: "none",
        fontFamily: "inherit",
        boxSizing: "border-box",
      }}
    >
      {lines.map((_, i) => (
        <div key={i}>{i + 1}</div>
      ))}
    </div>
  );
}

export default App;
