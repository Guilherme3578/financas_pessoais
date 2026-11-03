// Proteção de acesso no Vercel: pede usuário e senha antes de abrir
// o site e a API. Configure APP_USER e APP_PASSWORD nas variáveis de
// ambiente do projeto. Sem elas, o acesso fica bloqueado.

export default function middleware(request) {
  const usuario = process.env.APP_USER;
  const senha = process.env.APP_PASSWORD;

  if (!usuario || !senha) {
    return new Response(
      "Acesso bloqueado: configure APP_USER e APP_PASSWORD no Vercel.",
      { status: 503 },
    );
  }

  const autorizacao = request.headers.get("authorization") || "";
  const [esquema, credenciais] = autorizacao.split(" ");

  if (esquema === "Basic" && credenciais) {
    const [u, ...resto] = atob(credenciais).split(":");

    if (u === usuario && resto.join(":") === senha) {
      return;
    }
  }

  return new Response("Autenticação necessária.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Financas Pessoais", charset="UTF-8"',
    },
  });
}
