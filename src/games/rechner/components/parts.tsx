import { useTranslation } from "react-i18next";
import type { PartOffer } from "../../../../shared/rechner-pc";

/** One part's datasheet line: what it says on the box, nothing it hides. */
export function SpecLine({ part }: { part: PartOffer }) {
  const { t, i18n } = useTranslation();
  const s = part.specs;
  const number = (value: number | undefined) => (value ?? 0).toLocaleString(i18n.language);
  switch (part.kind) {
    case "cpu":
      return <>{t("games.rechner.specs.cpu", { cores: s.cores, ghz: number(s.ghz), gen: s.gen })}</>;
    case "gpu":
      return <>{t("games.rechner.specs.gpu", { units: number(s.units), vram: s.vram, gen: s.gen })}</>;
    case "ram":
      return <>{t("games.rechner.specs.ram", { mhz: s.mhz })}</>;
    case "storage":
      return <>{t(`games.rechner.specs.${s.medium ?? "hdd"}`)}</>;
  }
}
