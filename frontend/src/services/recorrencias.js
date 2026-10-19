import { consultarApi } from "./api";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

async function enviar(caminho, metodo, dados) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    method: metodo,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dados),
  });

  const corpo = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const detalhe = corpo?.detail;

    throw new Error(
      Array.isArray(detalhe)
        ? detalhe.map((item) => item.msg).join("; ")
        : typeof detalhe === "string"
          ? detalhe
          : `Não foi possível concluir a operação (${resposta.status}).`,
    );
  }

  return corpo;
}

export async function listarRecorrencias(signal) {
  const todas = [];
  let offset = 0;

  while (true) {
    const pagina = await consultarApi(
      "/recorrencias",
      { offset, limit: 100 },
      signal,
    );

    todas.push(...pagina);

    if (pagina.length < 100) {
      return todas;
    }

    offset += 100;
  }
}

export function criarRecorrencia(dados) {
  return enviar("/recorrencias", "POST", dados);
}

export function alterarSituacaoRecorrencia(id, ativo) {
  return enviar(`/recorrencias/${id}/situacao`, "PATCH", { ativo });
}

export async function gerarRecorrencia(id, ate) {
  const resultado = await enviar(
    `/recorrencias/${id}/gerar`,
    "POST",
    { ate },
  );

  window.dispatchEvent(new Event("lancamentos-atualizados"));

  return resultado;
}