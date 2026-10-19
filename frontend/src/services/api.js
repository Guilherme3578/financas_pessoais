const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

async function tratarResposta(resposta) {
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    const detalhe = corpo?.detail;

    const mensagem = Array.isArray(detalhe)
      ? detalhe
          .map((item) => {
            const campo = item.loc?.slice(1).join(".");

            return campo ? `${campo}: ${item.msg}` : item.msg;
          })
          .join("; ")
      : typeof detalhe === "string"
        ? detalhe
        : `Erro na API (${resposta.status}).`;

    throw new Error(mensagem);
  }

  if (resposta.status === 204) {
    return null;
  }

  return resposta.json();
}

export async function consultarApi(
  caminho,
  parametros = {},
  signal,
) {
  const query = new URLSearchParams();

  Object.entries(parametros).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== "") {
      query.set(chave, String(valor));
    }
  });

  const consulta = query.toString();
  const url = `${API_URL}${caminho}${consulta ? `?${consulta}` : ""}`;

  const resposta = await fetch(url, {
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  return tratarResposta(resposta);
}

export async function criarLancamento(dados) {
  const resposta = await fetch(`${API_URL}/lancamentos`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dados),
  });

  const lancamento = await tratarResposta(resposta);

  window.dispatchEvent(new Event("lancamentos-atualizados"));

  return lancamento;
}