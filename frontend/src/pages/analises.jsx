import PainelOrcamentos from "../components/painelOrcamentos";
import PrevisaoMensal from "../components/previsaoMensal";
import EvolucaoMensal from "../components/evolucaoMensal";
import GastosPorCategoria from "../components/gastosPorCategoria";

export default function Analises() {
  return (
    <>
      <header className="pagina-financeira-titulo">
        <h1>Suas finanças em números</h1>
        <p>Compare os meses, acompanhe seus limites e planeje os próximos gastos.</p>
      </header>

      <PainelOrcamentos />
      <PrevisaoMensal />
      <EvolucaoMensal />
      <GastosPorCategoria />
    </>
  );
}