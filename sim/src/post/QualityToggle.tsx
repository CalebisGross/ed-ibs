import { useId } from "react";
import { QUALITY_TIERS, type QualityTier } from "./limits";
import "./quality-toggle.css";

export function QualityToggle({
  tier,
  onChange,
}: {
  tier: QualityTier;
  onChange: (tier: QualityTier) => void;
}) {
  const labelId = useId();
  return (
    <div className="ed-ibs-quality" role="group" aria-labelledby={labelId} data-testid="quality-toggle">
      <span className="ed-ibs-quality-label" id={labelId}>
        Quality
      </span>
      <span className="ed-ibs-quality-options">
        {QUALITY_TIERS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={tier === item}
            data-testid={`quality-${item}`}
            onClick={() => {
              if (item !== tier) onChange(item);
            }}
          >
            {tierLabel(item)}
          </button>
        ))}
      </span>
    </div>
  );
}

function tierLabel(tier: QualityTier): string {
  switch (tier) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    default: {
      const exhaustive: never = tier;
      return exhaustive;
    }
  }
}
