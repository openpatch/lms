import { useTranslation } from "react-i18next";
import type { CardIngredient } from "../../../../shared/games/zuordnung";

/** One recipe card: the amounts and their units, line by line. */
export default function RecipeCard({ lines }: { lines: CardIngredient[] }) {
  const { t } = useTranslation();
  return (
    <table className="w-full tabular-nums">
      <tbody>
        {lines.map((line) => (
          <tr key={line.ingredientKey}>
            <td className="text-left text-gray-700">{t(line.ingredientKey)}</td>
            <td className="pl-3 text-right font-medium text-gray-800 whitespace-nowrap">
              {line.amount} {line.unit}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
