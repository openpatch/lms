import { drawingBounds, type TurtleDrawing } from "../../../../shared/python-turtle";

/**
 * What a turtle program put on the canvas, as an SVG.
 *
 * The turtle's y axis points up and the SVG's points down, so every y is
 * negated on the way in. The box is fitted to the drawing rather than to the
 * canvas: a small square and a wide spiral both fill the card, which is the
 * point — the player should compare the shapes, not their sizes.
 */
export default function TurtlePicture({
  drawing,
  className = "",
  label,
}: {
  drawing: TurtleDrawing;
  className?: string;
  /** What the picture is called, when nothing around it says so. */
  label?: string;
}) {
  const bounds = drawingBounds(drawing);
  const padding = 12;
  const minX = bounds.minX - padding;
  const minY = -(bounds.maxY + padding);
  const width = Math.max(1, bounds.maxX - bounds.minX + 2 * padding);
  const height = Math.max(1, bounds.maxY - bounds.minY + 2 * padding);

  return (
    <svg
      viewBox={`${minX} ${minY} ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className={`h-full w-full ${className}`}
      // A picture with a name when it is given one; otherwise decoration, for
      // the button or the text around it to name.
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {drawing.strokes.map((stroke, index) => (
        <polyline
          key={`s${index}`}
          points={stroke.points.map((point) => `${point.x},${-point.y}`).join(" ")}
          fill="none"
          stroke={stroke.color === "black" ? "#1e293b" : stroke.color}
          strokeWidth={stroke.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {drawing.dots.map((dot, index) => (
        <circle
          key={`d${index}`}
          cx={dot.x}
          cy={-dot.y}
          r={dot.size / 2}
          fill={dot.color === "black" ? "#1e293b" : dot.color}
        />
      ))}
    </svg>
  );
}
