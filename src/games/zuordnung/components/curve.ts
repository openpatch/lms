import type { GraphCurve } from "../../../../shared/games/zuordnung";

/** What one curve of the graph station is, as a function PlotCanvas can sample. */
export function curveFunction(curve: GraphCurve): (x: number) => number {
  switch (curve.type) {
    case "proportional":
      return (x) => (curve.k ?? 1) * x;
    case "linear":
      return (x) => (curve.k ?? 1) * x + (curve.d ?? 0);
    case "antiproportional":
      // At x = 0 the function is infinite, which PlotCanvas drops — the
      // hyperbola simply starts at the left edge of the window.
      return (x) => (curve.p ?? 1) / x;
    // The Bevölkerungsgraph: growth that picks up speed — neither model.
    case "wachstum":
      return (x) => (x * x) / 4;
  }
}
