import json
import sys
from datetime import date
from calendar import monthrange
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


BASE_URL = "http://127.0.0.1:8000/api/v1"


def consultar(caminho, parametros=None):
    url = f"{BASE_URL}{caminho}"

    if parametros:
        url = f"{url}?{urlencode(parametros)}"

    requisicao = Request(
        url,
        headers={"Accept": "application/json"},
    )

    with urlopen(requisicao, timeout=15) as resposta:
        return json.loads(resposta.read().decode("utf-8"))


def validar_lista(dados):
    if not isinstance(dados, list):
        raise ValueError("A resposta deveria ser uma lista.")


def validar_resumo(dados):
    if not isinstance(dados, dict):
        raise ValueError("O resumo deveria ser um objeto.")

    campos = {
        "receitas_efetivadas",
        "despesas_efetivadas",
        "saldo_realizado",
        "receitas_pendentes",
        "despesas_pendentes",
        "saldo_previsto",
    }

    faltantes = campos.difference(dados)

    if faltantes:
        raise ValueError(
            f"Campos ausentes: {', '.join(sorted(faltantes))}"
        )


def validar_previsao(dados):
    validar_lista(dados)

    if len(dados) != 6:
        raise ValueError("A previsão deveria retornar seis meses.")

    campos = {
        "competencia",
        "receitas_previstas",
        "despesas_previstas",
        "resultado_previsto",
    }

    for item in dados:
        if not isinstance(item, dict) or not campos.issubset(item):
            raise ValueError("Um mês da previsão está incompleto.")


def main():
    hoje = date.today()
    inicio = hoje.replace(day=1)
    fim = hoje.replace(day=monthrange(hoje.year, hoje.month)[1])

    testes = [
        (
            "Categorias",
            "/categorias",
            {"offset": 0, "limit": 1},
            validar_lista,
        ),
        (
            "Lançamentos",
            "/lancamentos",
            {"offset": 0, "limit": 1},
            validar_lista,
        ),
        (
            "Recorrências",
            "/recorrencias",
            {"offset": 0, "limit": 1},
            validar_lista,
        ),
        (
            "Orçamentos",
            "/orcamentos",
            {"competencia": inicio.isoformat()},
            validar_lista,
        ),
        (
            "Dashboard",
            "/dashboard/resumo",
            {
                "data_inicio": inicio.isoformat(),
                "data_fim": fim.isoformat(),
            },
            validar_resumo,
        ),
        (
            "Previsão",
            "/previsoes/mensal",
            {
                "inicio": inicio.isoformat(),
                "meses": 6,
            },
            validar_previsao,
        ),
    ]

    falhas = 0

    print("\nVERIFICAÇÃO DA API\n")

    for nome, caminho, parametros, validador in testes:
        try:
            dados = consultar(caminho, parametros)
            validador(dados)
            print(f"[OK] {nome}")

        except HTTPError as erro:
            falhas += 1
            print(f"[ERRO] {nome}: HTTP {erro.code}")

        except URLError as erro:
            falhas += 1
            print(f"[ERRO] {nome}: conexão indisponível ({erro.reason})")

        except (TimeoutError, OSError, ValueError) as erro:
            falhas += 1
            print(f"[ERRO] {nome}: {erro}")

    print(f"\nResultado: {len(testes) - falhas}/{len(testes)} consultas OK.")

    if falhas:
        print("Confira também o terminal da API.")
        return 1

    print("Rotas consultadas e formatos básicos das respostas verificados.")
    return 0


if __name__ == "__main__":
    sys.exit(main())