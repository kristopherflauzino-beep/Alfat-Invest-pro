import { describe, expect, it } from "vitest";
import { createGeneratedAsset, getAsset, localAssets } from "../market-data";
import {
  analisarAlfatecFii,
  avaliarQualidadeRendimento,
  classificarScoreAlfatecFii,
  classificarTipoFii,
  compararFiiPorSegmento,
  defaultAlfatecFiiSettings,
  fiiConfidenceMeetsMinimum
} from "./alfatec-fii";

describe("Metodo AlfaTec FIIs", () => {
  it("classifica e calcula um FII de tijolo", () => {
    const asset = getAsset("HGLG11");
    const analysis = analisarAlfatecFii(asset);

    expect(classificarTipoFii(asset).kind).toBe("tijolo");
    expect(analysis.applicable).toBe(true);
    expect(analysis.score).not.toBeNull();
    expect(analysis.scores.valuation).not.toBeNull();
    expect(analysis.confidence).not.toBe("Insuficiente");
  });

  it("classifica e calcula um FII de papel sem tratar LTV ausente como zero", () => {
    const asset = getAsset("KNCR11");
    const analysis = analisarAlfatecFii(asset);

    expect(analysis.kind).toBe("papel");
    expect(analysis.ltv.status).toBe("indisponivel");
    expect(analysis.score).not.toBeNull();
    expect(analysis.attentionPoints.join(" ")).toContain("LTV");
  });

  it("classifica FII hibrido com ponderacao propria", () => {
    const asset = getAsset("KNRI11");
    const analysis = analisarAlfatecFii(asset);

    expect(analysis.kind).toBe("hibrido");
    expect(analysis.weights).toEqual(defaultAlfatecFiiSettings.weightsByKind.hibrido);
    expect(analysis.scoreExplanation.length).toBeGreaterThan(0);
  });

  it("nao calcula score oficial para FII gerado dinamicamente", () => {
    const asset = createGeneratedAsset("NOVO11");
    const analysis = analisarAlfatecFii(asset);

    expect(asset.source).toBe("generated");
    expect(analysis.applicable).toBe(false);
    expect(analysis.score).toBeNull();
    expect(analysis.confidence).toBe("Insuficiente");
  });

  it("nao trata P/VP abaixo de 1 como oportunidade automatica", () => {
    const asset = getAsset("HGRE11");
    const analysis = analisarAlfatecFii(asset);

    expect(asset.metrics.pvp).toBeLessThan(1);
    expect(analysis.valuationInterpretation).toMatch(/desconto/);
    expect(analysis.attentionPoints.join(" ")).toContain("nao significa automaticamente");
  });

  it("identifica qualidade de rendimento e confianca minima", () => {
    const asset = getAsset("GARE11");
    const analysis = analisarAlfatecFii(asset);

    expect(avaliarQualidadeRendimento(asset)).not.toBe("dados insuficientes");
    expect(fiiConfidenceMeetsMinimum(analysis.confidence, "Baixa")).toBe(true);
  });

  it("compara apenas fundos do mesmo segmento", () => {
    const asset = getAsset("HGLG11");
    const comparison = compararFiiPorSegmento(asset, localAssets);

    expect(comparison.total).toBeGreaterThan(1);
    expect(comparison.compatibleTickers).toContain("HGLG11");
    expect(comparison.compatibleTickers).toContain("XPLG11");
    expect(comparison.averageScore).not.toBeNull();
  });

  it("classifica faixas finais do score", () => {
    expect(classificarScoreAlfatecFii(92)).toBe("Excelente");
    expect(classificarScoreAlfatecFii(84)).toBe("Muito bom");
    expect(classificarScoreAlfatecFii(74)).toBe("Bom");
    expect(classificarScoreAlfatecFii(64)).toBe("Regular");
    expect(classificarScoreAlfatecFii(54)).toBe("Atencao");
    expect(classificarScoreAlfatecFii(42)).toBe("Risco elevado");
    expect(classificarScoreAlfatecFii(null)).toBe("Dados insuficientes");
  });
});

