import { describe, expect, it } from "vitest";
import {
  aplicarPrecoNosCenarios,
  calcularCenariosGraham,
  calcularDiasRestantes,
  calcularGrahamCrescimento,
  calcularMargemSeguranca,
  calcularNumeroGraham,
  calcularPotencial,
  classificarNumeroGraham
} from "./graham";

describe("Benjamin Graham valuation", () => {
  it("calcula o Número de Graham com LPA e VPA positivos", () => {
    expect(calcularNumeroGraham(2, 20)).toBeCloseTo(30, 6);
  });

  it("não calcula Número de Graham com LPA ou VPA inválidos", () => {
    expect(calcularNumeroGraham(-1, 20)).toBeNull();
    expect(calcularNumeroGraham(2, -20)).toBeNull();
    expect(calcularNumeroGraham(Number.NaN, 20)).toBeNull();
  });

  it("calcula a fórmula de Graham com crescimento usando percentuais inteiros", () => {
    expect(calcularGrahamCrescimento(2, 8, 5.5)).toBeCloseTo(39.2, 6);
  });

  it("aceita crescimento igual a zero e rejeita Y zero", () => {
    expect(calcularGrahamCrescimento(2, 0, 5.5)).toBeCloseTo(13.6, 1);
    expect(calcularGrahamCrescimento(2, 8, 0)).toBeNull();
  });

  it("calcula potencial, margem e classificação", () => {
    expect(calcularPotencial(30, 25)).toBeCloseTo(20, 6);
    expect(calcularMargemSeguranca(30, 25)).toBeCloseTo(16.666, 2);
    expect(classificarNumeroGraham(20, 30)).toBe("Margem de segurança alta");
    expect(classificarNumeroGraham(25, 30)).toBe("Margem de segurança moderada");
    expect(classificarNumeroGraham(31, 30)).toBe("Próximo ao valor estimado");
    expect(classificarNumeroGraham(35, 30)).toBe("Acima do valor estimado");
  });

  it("calcula os dias restantes sem retornar negativo", () => {
    expect(calcularDiasRestantes("2026-07-20", new Date("2026-07-13T10:00:00"))).toBe(7);
    expect(calcularDiasRestantes("2026-07-10", new Date("2026-07-13T10:00:00"))).toBe(0);
  });

  it("gera cenários conservador, base e otimista", () => {
    const scenarios = aplicarPrecoNosCenarios(calcularCenariosGraham(2, 5.5, 8), 25);
    expect(scenarios).toHaveLength(3);
    expect(scenarios[0].growth).toBe(4);
    expect(scenarios[1].growth).toBe(8);
    expect(scenarios[2].growth).toBe(12);
    expect(scenarios[1].value).toBeCloseTo(39.2, 1);
  });
});
