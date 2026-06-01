"use client";

import { useCamera, useFullScreen, useSigma } from "@react-sigma/core";
import { Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut } from "@/lib/icons";

interface CtrlBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: React.ReactNode;
}

function CtrlBtn({ label, children, ...rest }: CtrlBtnProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/80 text-[var(--color-fg-muted)] backdrop-blur transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-overlay)] hover:text-[var(--color-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 sm:h-9 sm:w-9"
      {...rest}
    >
      {children}
    </button>
  );
}

export function GraphControls() {
  const { zoomIn, zoomOut, reset } = useCamera({ duration: 300, factor: 1.5 });
  const { isFullScreen, toggle } = useFullScreen();
  const sigma = useSigma();

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-10 flex items-center gap-1 sm:bottom-4 sm:left-4 sm:gap-1.5">
      <CtrlBtn label="Acercar" onClick={() => zoomIn()}>
        <ZoomIn size={16} />
      </CtrlBtn>
      <CtrlBtn label="Alejar" onClick={() => zoomOut()}>
        <ZoomOut size={16} />
      </CtrlBtn>
      <CtrlBtn
        label="Centrar vista"
        onClick={() => {
          reset();
          sigma.getCamera().animate({ x: 0.5, y: 0.5, ratio: 1.1 }, { duration: 400 });
        }}
      >
        <RotateCcw size={16} />
      </CtrlBtn>
      <CtrlBtn label={isFullScreen ? "Salir pantalla completa" : "Pantalla completa"} onClick={toggle}>
        {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </CtrlBtn>
    </div>
  );
}
