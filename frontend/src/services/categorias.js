import { consultarApi } from "./api";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

async function enviarCategoria(caminho, metodo, dados) {
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
          : `Não foi possível salvar a categoria (${resposta.status}).`,
    );
  }

  return corpo;
}

export async function listarCategorias(signal) {
  const categorias = [];
  let offset = 0;

  while (true) {
    const pagina = await consultarApi(
      "/categorias",
      { offset, limit: 100 },
      signal,
    );

    categorias.push(...pagina);

    if (pagina.length < 100) {
      return categorias;
    }

    offset += 100;
  }
}

export function criarCategoria(dados) {
  return enviarCategoria("/categorias", "POST", dados);
}

export function atualizarCategoria(id, dados) {
  return enviarCategoria(`/categorias/${id}`, "PUT", dados);
}