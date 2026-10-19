from calendar import monthrange
from datetime import date
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.previsao import PrevisaoRepository
from app.schemas.previsao import PrevisaoMesResposta


class PrevisaoService:
    def __init__(self, db: Session):
        self.repository = PrevisaoRepository(db)

    def listar(
        self,
        inicio: date,
        meses: int,
    ) -> list[PrevisaoMesResposta]:
        if inicio.day != 1:
            raise HTTPException(
                status_code=422,
                detail="Informe o primeiro dia do mês inicial.",
            )

        if not 1 <= meses <= 12:
            raise HTTPException(
                status_code=422,
                detail="Escolha entre 1 e 12 meses.",
            )

        competencias = []

        for deslocamento in range(meses):
            indice = inicio.year * 12 + inicio.month - 1 + deslocamento
            ano, mes_zero = divmod(indice, 12)

            if ano > 9999:
                raise HTTPException(
                    status_code=422,
                    detail="O período ultrapassa o ano máximo permitido.",
                )

            competencias.append(date(ano, mes_zero + 1, 1))

        ultima_competencia = competencias[-1]
        ultimo_dia = monthrange(
            ultima_competencia.year,
            ultima_competencia.month,
        )[1]

        fim = ultima_competencia.replace(day=ultimo_dia)
        registros = self.repository.resumir(inicio, fim)

        por_mes = {
            (int(item["ano"]), int(item["mes"])): item
            for item in registros
        }

        resultado = []
        zero = Decimal("0.00")

        for competencia in competencias:
            dados = por_mes.get(
                (competencia.year, competencia.month),
                {},
            )

            recebidas = Decimal(dados.get("receitas_recebidas") or zero)
            a_receber = Decimal(dados.get("receitas_pendentes") or zero)
            pagas = Decimal(dados.get("despesas_pagas") or zero)
            a_pagar = Decimal(dados.get("despesas_pendentes") or zero)

            receitas = recebidas + a_receber
            despesas = pagas + a_pagar

            resultado.append(
                PrevisaoMesResposta(
                    competencia=competencia,
                    receitas_recebidas=recebidas,
                    receitas_pendentes=a_receber,
                    despesas_pagas=pagas,
                    despesas_pendentes=a_pagar,
                    receitas_previstas=receitas,
                    despesas_previstas=despesas,
                    resultado_previsto=receitas - despesas,
                )
            )

        return resultado