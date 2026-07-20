import { describe, expect, it } from "vitest";
import { formatAssetPrice, formatDailyChange } from "@/components/assets/AssetMetricsGrid";

describe("asset metric formatting", () => {
  it("keeps two decimal places for B3 prices", () => {
    expect(formatAssetPrice(40.31, "ACAO")).toBe("R$ 40,31");
    expect(formatAssetPrice(8.1, "FII")).toBe("R$ 8,10");
  });

  it("keeps additional precision only for low crypto prices", () => {
    expect(formatAssetPrice(0.00123456, "CRIPTO")).toContain("0,00123456");
  });

  it("formats daily variation without changing its scale", () => {
    expect(formatDailyChange(2.63)).toBe("+2,63%");
    expect(formatDailyChange(-1.42)).toBe("−1,42%");
    expect(formatDailyChange(Number.NaN)).toBe("Dado indisponível");
  });
});
