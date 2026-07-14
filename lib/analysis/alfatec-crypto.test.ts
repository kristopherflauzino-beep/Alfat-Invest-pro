import { describe, expect, it } from "vitest";
import { analyzeAlfatecCrypto, classifyCrypto, classifyCryptoScore, type CryptoMarketSnapshot } from "./alfatec-crypto";

function sample(patch: Partial<CryptoMarketSnapshot> = {}): CryptoMarketSnapshot {
  return { ticker: "BTC", name: "Bitcoin", price: 60000, currency: "USD", change24h: 1.2, marketCap: 1_200_000_000_000, fullyDilutedValuation: 1_250_000_000_000, volume24h: 35_000_000_000, circulatingSupply: 19_800_000, totalSupply: 19_800_000, maxSupply: 21_000_000, marketCapRank: 1, ath: 73000, athChangePercent: -18, genesisDate: "2009-01-03", categories: ["Cryptocurrency", "Store of Value"], blockTimeMinutes: 10, hashingAlgorithm: "SHA-256", developer: { commits4Weeks: 220, contributors: 850, stars: 80000, forks: 35000 }, onChain: { activeAddresses: 750000, transactions24h: 500000, mvrv: 1.7, nvt: 45 }, source: "CoinGecko", sourceUrl: "https://www.coingecko.com/en/coins/bitcoin", updatedAt: new Date().toISOString(), consultedAt: new Date().toISOString(), status: "real", ...patch };
}

describe("Metodo AlfaTec Cripto", () => {
  it("classifica categorias especificas", () => {
    expect(classifyCrypto(sample()).primary).toBe("monetary");
    expect(classifyCrypto(sample({ ticker: "USDC", categories: ["Stablecoins"] })).primary).toBe("stablecoin");
    expect(classifyCrypto(sample({ ticker: "DOGE", categories: ["Meme"] })).primary).toBe("memecoin");
    expect(classifyCrypto(sample({ ticker: "SOL", categories: ["Layer 1", "Smart Contract Platform"] })).primary).toBe("layer_1");
  });
  it("gera score transparente com dados reais", () => {
    const result = analyzeAlfatecCrypto(sample());
    expect(result.applicable).toBe(true);
    expect(result.score).toBeGreaterThan(0);
    expect(result.pillars.reduce((sum, item) => sum + item.weight, 0)).toBe(100);
  });
  it("nao transforma ausencias em zero", () => {
    const result = analyzeAlfatecCrypto(sample({ onChain: {}, developer: { commits4Weeks: null, contributors: null, stars: null, forks: null } }));
    expect(result.pillars.find((item) => item.key === "network")?.score).toBeNull();
    expect(result.pillars.find((item) => item.key === "onChainValuation")?.score).toBeNull();
  });
  it("recusa snapshot nao confirmado", () => {
    const result = analyzeAlfatecCrypto(sample({ status: "estimated" }));
    expect(result.score).toBeNull();
    expect(result.confidence).toBe("Insuficiente");
  });
  it("reserva Excepcional para confianca alta", () => {
    expect(classifyCryptoScore(95, "Baixa")).toBe("Muito forte");
    expect(classifyCryptoScore(95, "Alta")).toBe("Excepcional");
  });
});
