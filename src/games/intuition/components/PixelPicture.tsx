import { useEffect, useRef } from "react";

/**
 * A glyph drawn at `level` blocks across.
 *
 * Nothing is loaded and nothing ships: the picture is an emoji the system
 * already has, drawn once at full size and then squeezed through a canvas of
 * `level` by `level` pixels and blown back up with smoothing off. The squeeze
 * averages each block, the blow-up keeps the edges hard, and the result is the
 * blocky picture — with no image file anywhere in the repository.
 */
export default function PixelPicture({
  glyph,
  level,
  className = "",
}: {
  glyph: string;
  level: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const size = 256;
    const blocks = Math.max(2, Math.round(level));

    // Full size first, so the squeeze has something to average.
    const full = document.createElement("canvas");
    full.width = size;
    full.height = size;
    const fullContext = full.getContext("2d");
    if (!fullContext) return;
    fullContext.textAlign = "center";
    fullContext.textBaseline = "middle";
    fullContext.font = `${Math.round(size * 0.8)}px serif`;
    fullContext.fillText(glyph, size / 2, size / 2 + size * 0.04);

    const small = document.createElement("canvas");
    small.width = blocks;
    small.height = blocks;
    const smallContext = small.getContext("2d");
    if (!smallContext) return;
    smallContext.imageSmoothingEnabled = true;
    smallContext.drawImage(full, 0, 0, blocks, blocks);

    context.clearRect(0, 0, size, size);
    context.imageSmoothingEnabled = false;
    context.drawImage(small, 0, 0, size, size);
  }, [glyph, level]);

  return (
    <canvas
      ref={canvasRef}
      width={256}
      height={256}
      className={`rounded-xl border-2 border-gray-200 bg-white ${className}`}
    />
  );
}
