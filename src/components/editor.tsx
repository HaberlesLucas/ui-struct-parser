/**
 * @file Editor.tsx
 * @description Panel izquierdo: editor de código UI-Struct.
 *
 * Incluye números de línea sincronizados con el scroll del textarea,
 * y un botón para restablecer el código de ejemplo.
 */

import { useRef } from "react";

interface EditorProps {
  codigo: string;
  onChange: (valor: string) => void;
  onReset: () => void;
}

/**
 * Genera los números de línea alineados con el contenido del textarea.
 * Se re-renderiza cada vez que cambia el código para mantener el conteo correcto.
 */
function NumerosDeLinea({ codigo }: { codigo: string }) {
  const lineas = codigo.split("\n");
  return (
    <div className="absolute top-0 left-0 w-10 pt-3 pb-3 font-mono text-xs leading-[1.7] text-ui-dim text-right pr-2 select-none pointer-events-none">
      {lineas.map((_, i) => (
        <div key={i}>{i + 1}</div>
      ))}
    </div>
  );
}

export function Editor({ codigo, onChange, onReset }: EditorProps) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const numsRef = useRef<HTMLDivElement>(null);

  /** Sincroniza el scroll de los números de línea con el del textarea. */
  const sincronizarScroll = () => {
    if (areaRef.current && numsRef.current) {
      numsRef.current.scrollTop = areaRef.current.scrollTop;
    }
  };

  return (
    <div className="flex flex-col flex-1 border-r border-ui-border">
      {/* Barra superior del panel */}
      <div className="flex items-center justify-between px-4 py-2 bg-ui-surface border-b border-ui-border">
        <span className="text-[10px] text-ui-muted tracking-widest">
          ENTRADA — código UI-Struct
        </span>
        <button
          onClick={onReset}
          className="text-[10px] text-ui-muted hover:text-violet-400 transition-colors"
        >
          restablecer ejemplo
        </button>
      </div>

      {/* Área de edición con números de línea */}
      <div className="relative flex-1">
        {/* Números de línea — superpuestos sobre el textarea */}
        <div
          ref={numsRef}
          className="absolute inset-y-0 left-0 w-10 overflow-hidden"
        >
          <NumerosDeLinea codigo={codigo} />
        </div>

        {/* Textarea transparente — el texto va por encima del fondo */}
        <textarea
          ref={areaRef}
          value={codigo}
          onChange={(e) => onChange(e.target.value)}
          onScroll={sincronizarScroll}
          spellCheck={false}
          className="
            absolute inset-0 w-full h-full
            bg-transparent text-ui-text
            font-mono text-[13px] leading-[1.7]
            pl-12 pr-4 pt-3 pb-3
            border-none outline-none resize-none
            caret-violet-400
          "
        />
      </div>

      {/* Barra de estado del editor */}
      <div className="px-4 py-1.5 border-t border-ui-border bg-ui-surface text-[10px] text-ui-dim flex gap-4">
        <span>análisis en tiempo real</span>
        <span>GLC LL(1) — Parser Descendente Recursivo</span>
      </div>
    </div>
  );
}
