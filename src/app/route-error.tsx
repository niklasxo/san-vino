import { RotateCcw } from "lucide-react";
import * as React from "react";
import { isRouteErrorResponse, useRouteError } from "react-router";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const RELOAD_FLAG = "vino-chunk-reload";

/** Nach einem Update fehlen die Dateien der alten Version → einmal automatisch neu laden. */
export function isChunkLoadError(error: unknown): boolean {
  const msg = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? "");
  return /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|ChunkLoadError|Loading chunk .* failed/i.test(msg);
}

function readFlag() {
  try {
    return sessionStorage.getItem(RELOAD_FLAG);
  } catch {
    return null;
  }
}

function setFlag() {
  try {
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  } catch {
    /* ignorieren */
  }
}

export function RouteError() {
  const error = useRouteError();
  const chunk = isChunkLoadError(error);
  // Nur einmal pro Minute automatisch neu laden – verhindert Endlosschleifen.
  const recentlyReloaded = Number(readFlag() ?? 0) > Date.now() - 60_000;
  const autoReload = chunk && !recentlyReloaded;

  React.useEffect(() => {
    if (!autoReload) return;
    setFlag();
    window.location.reload();
  }, [autoReload]);

  if (autoReload) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ivory" role="status">
        <div className="flex flex-col items-center gap-4">
          <Logo className="text-[26px]" />
          <p className="text-[15px] text-taupe">Neue Version wird geladen …</p>
        </div>
      </div>
    );
  }

  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <div className="grid min-h-dvh place-items-center bg-ivory px-8 text-center">
      <div className="flex max-w-sm flex-col items-center">
        <Logo className="text-[26px]" />
        <h1 className="mt-8 font-serif text-[26px] leading-tight text-charcoal">
          {notFound ? "Diese Seite gibt es nicht" : chunk ? "SAN VINO wurde aktualisiert" : "Da ist etwas schiefgelaufen"}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-taupe">
          {chunk ? "Lade die App einmal neu, dann geht es mit der neuen Version weiter." : "Lade die Seite neu. Deine Daten sind sicher gespeichert."}
        </p>
        <Button className="mt-8" onClick={() => window.location.reload()}>
          <RotateCcw /> Neu laden
        </Button>
      </div>
    </div>
  );
}
