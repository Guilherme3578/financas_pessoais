import { consultarApi } from "./api";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

async function enviar(caminho, metodo, dados) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    method: metodo,
    headers: {
      Accept: "application/json",
      ...(dados ? { "Content-Type": "application/json" } : {}),
    },
    ...(dados ? { body: JSON.stringify(dados) } : {}),
  });

  const corpo =
    resposta.status === 204
      ? null
      : await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const detalhe = corpo?.detail;

    throw new Error(
      Array.isArray(detalhe)
        ? detalhe.map((item) => item.msg).join("; ")
        : typeof detalhe === "string"
          ? detalhe
          : `Erro na operação (${resposta.status}).`,
    );
  }

  window.dispatchEvent(new Event("lancamentos-atualizados"));

  return corpo;
}

export function atualizarLancamento(id, dados) {
  return enviar(`/lancamentos/${id}`, "PUT", dados);
}

export async function efetivarLancamento(id, data) {
  const atual = await consultarApi(`/lancamentos/${id}`);

  if (atual.status !== "pendente") {
    throw new Error(
      "Este lançamento não está mais pendente. Reabra a lista para atualizar.",
    );
  }

  return atualizarLancamento(id, {
    descricao: atual.descricao,
    tipo: atual.tipo,
    valor: atual.valor,
    categoria_id: atual.categoria_id,
    data_competencia: atual.data_competencia,
    data_vencimento: atual.data_vencimento,
    data_efetivacao: data,
    status: "efetivado",
    forma_pagamento: atual.forma_pagamento,
    observacao: atual.observacao,
  });
}

export function excluirLancamento(id) {
  return enviar(`/lancamentos/${id}`, "DELETE");
}