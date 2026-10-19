import PrevisaoMensal from "../components/previsaoMensal";
import EvolucaoMensal from "../components/evolucaoMensal";
import GastosPorCategoria from "../components/gastosPorCategoria";

export default function Analises() {
  return (
    <>
      <header className="pagina-financeira-titulo">
        <h1>Suas finanças em números</h1>
        <p>Compare os meses, acompanhe os gastos e veja o que vem pela frente.</p>
      </header>

      <PrevisaoMensal />
      <EvolucaoMensal />
      <GastosPorCategoria />
    </>
  );
}