"use client";

export function GrahamExplanation() {
  return (
    <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-premium dark:border-white/10 dark:bg-slate-900/80">
      <h3 className="text-lg font-black text-slate-950 dark:text-white">Entenda os métodos</h3>
      <div className="mt-4 grid gap-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
        <p>O Número de Graham estima um limite de preço com base no lucro por ação e no valor patrimonial por ação. Ele combina os parâmetros clássicos de P/L máximo de 15 e P/VP máximo de 1,5. É mais adequado como filtro inicial para empresas lucrativas, patrimonialmente positivas e com perfil mais estável.</p>
        <p>A fórmula de Graham com crescimento estima o valor intrínseco considerando o lucro por ação, uma expectativa de crescimento dos lucros e um rendimento de referência. O resultado é mais sensível às premissas utilizadas, principalmente à taxa de crescimento e ao parâmetro Y.</p>
        <p className="rounded-2xl bg-amber-500/10 p-3 font-semibold text-amber-700 dark:text-amber-300">Os métodos de Graham são modelos simplificados de valuation. Eles não consideram isoladamente fluxo de caixa, qualidade da gestão, endividamento, mudanças setoriais, riscos regulatórios ou eventos extraordinários. Os resultados são referências analíticas e não constituem recomendação de investimento.</p>
      </div>
    </div>
  );
}
