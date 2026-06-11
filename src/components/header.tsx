/**
 * @file Header.tsx
 * @description Barra superior de la aplicación.
 * Muestra el nombre del analizador y un resumen del estado actual:
 * cantidad de tokens, errores y si la estructura es válida o no.
 */

interface HeaderProps {
  totalTokens: number;
  totalErrores: number;
  esValido: boolean | null;
}

/** Pequeña etiqueta de estado con color semántico. */
function Pill({ texto, color }: { texto: string; color: string }) {
  return (
    <span
      className="text-[10px] px-3 py-1 rounded-full border"
      style={{ color, borderColor: color + "44", background: color + "18" }}
    >
      {texto}
    </span>
  );
}

export function Header({ totalTokens, totalErrores, esValido }: HeaderProps) {
  // El color del indicador refleja el estado general del análisis
  const dotColor =
    esValido === null ? "#475569" : esValido ? "#22c55e" : "#ef4444";

  const dotGlow =
    esValido === true
      ? "0 0 8px #22c55e88"
      : esValido === false
        ? "0 0 8px #ef444488"
        : "none";

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-ui-border bg-ui-surface">
      {/* Marca e indicador de estado */}
      <div className="flex items-center gap-3">
        <div
          className="w-2 h-2 rounded-full transition-all duration-300"
          style={{ background: dotColor, boxShadow: dotGlow }}
        />
        <span className="text-[13px] font-bold text-violet-400 tracking-widest">
          UI-STRUCT
        </span>
        <span className="text-[10px] text-ui-muted tracking-widest">
          ANALIZADOR LÉXICO–SINTÁCTICO
        </span>
      </div>

      {/* Resumen rápido de métricas */}
      <div className="flex items-center gap-3">
        <Pill
          texto={`${totalTokens} token${totalTokens !== 1 ? "s" : ""}`}
          color="#60a5fa"
        />
        <Pill
          texto={
            totalErrores === 0
              ? "sin errores"
              : `${totalErrores} error${totalErrores !== 1 ? "es" : ""}`
          }
          color={totalErrores === 0 ? "#22c55e" : "#ef4444"}
        />
        {esValido !== null && (
          <Pill
            texto={esValido ? "✓ válido" : "✗ inválido"}
            color={esValido ? "#22c55e" : "#ef4444"}
          />
        )}
      </div>
    </header>
  );
}
