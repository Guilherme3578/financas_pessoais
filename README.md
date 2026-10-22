# Finanças Pessoais

Aplicação local para organizar receitas, despesas, recorrências e
orçamentos, com análises financeiras e integração com Power BI.

## Funcionalidades

- Cadastro e gerenciamento de receitas e despesas.
- Categorias de receita e despesa.
- Registro de pagamentos e recebimentos.
- Filtros de lançamentos por competência, categoria, tipo e status.
- Recorrências mensais com geração de lançamentos.
- Orçamentos mensais por categoria.
- Cópia de limites entre meses.
- Agenda de pendências atrasadas e próximos sete dias.
- Evolução mensal de receitas e despesas efetivadas.
- Distribuição de gastos por categoria.
- Previsão mensal a partir dos lançamentos cadastrados.
- Exportação em CSV e Excel.
- Consulta dos dados pelo Power BI Desktop.
- Scripts de inicialização, backup e verificação.

## Tecnologias

- Python e FastAPI.
- SQLAlchemy e Alembic.
- PostgreSQL com driver pg8000.
- React e Vite.
- OpenPyXL.
- Power BI Desktop.

## Organização

- `backend/app/api`: rotas HTTP.
- `backend/app/schemas`: validação e formatos das respostas.
- `backend/app/models`: modelos do banco.
- `backend/app/repositories`: consultas e acesso aos dados.
- `backend/app/services`: regras da aplicação.
- `backend/app/database`: conexão e sessões.
- `backend/migrations`: histórico de alterações do banco.
- `frontend/src/components`: componentes da interface.
- `frontend/src/pages`: páginas.
- `frontend/src/services`: comunicação com a API.
- `scripts`: verificações auxiliares.
- `backups`: cópias locais do banco, fora do Git.

## Executar no computador configurado

Com PostgreSQL e dependências instalados:

1. Inicie o serviço do PostgreSQL.
2. Execute `iniciar.cmd`.
3. Aguarde a inicialização dos dois servidores.
4. Acesse http://localhost:5173.

Documentação da API: http://127.0.0.1:8000/docs.

Para encerrar, pressione Ctrl+C nos terminais do backend e frontend.

O inicializador usa os servidores de desenvolvimento.
A aplicação ainda não está preparada para exposição pública.

## Execução manual

Backend, a partir da pasta `backend`:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Frontend, a partir da pasta `frontend`:

```powershell
npm run dev -- --port 5173 --strictPort
```

As configurações de conexão ficam no `backend/.env`.
O arquivo não deve ser enviado ao Git.

## Migrações

Antes de usar uma atualização que modifica o banco:

```powershell
python -m alembic upgrade head
```

Execute dentro de `backend`, com o ambiente virtual ativo.

Não apague o histórico de migrações de um banco em uso.

## Regras financeiras

### Competência

O dashboard, os orçamentos e as análises mensais agrupam os valores
pela data de competência.

A agenda utiliza a data prevista de pagamento ou recebimento.

### Status

- `pendente`: ainda não pago ou recebido.
- `efetivado`: pagamento ou recebimento registrado.
- `cancelado`: excluído dos cálculos financeiros.

Lançamentos efetivados exigem data de efetivação.
Pendentes e cancelados devem ter essa data vazia.

### Resultados

O resultado realizado é a diferença entre receitas e despesas
efetivadas do período.

O resultado previsto também considera receitas e despesas pendentes.

Esses resultados não representam saldo bancário, pois não incluem
saldo inicial nem transferências entre contas.

### Recorrências

Cadastrar uma recorrência não gera automaticamente todos os meses.

É necessário usar a ação de geração até o mês desejado.
A geração evita repetir a mesma recorrência na mesma competência.

Pausar uma recorrência preserva os lançamentos existentes.

### Orçamentos

Orçamentos são limites por categoria de despesa e mês de competência.

Despesas pagas e pendentes comprometem o limite.
Despesas canceladas não entram.

Copiar orçamentos transfere somente os limites e mantém os já existentes
no mês de destino. Categorias indisponíveis são ignoradas.

### Previsão

A previsão usa os lançamentos já cadastrados.

Recorrências só entram após a geração dos lançamentos.
Meses zerados podem indicar ausência de dados cadastrados.

## Exportações

CSV e Excel são filtrados pelo mês de competência, tipo e status.

A exportação Excel possui limite de 10.000 lançamentos por operação.

Exportações servem para análise e não substituem o backup do banco.

## Power BI

Abra o relatório `FinancasPessoais.pbix` no Power BI Desktop.

Para atualizar os dados:

1. Mantenha o PostgreSQL e a API ligados.
2. Clique em Atualizar no Power BI.

A conexão utiliza a API local em http://127.0.0.1:8000.
A atualização pelo serviço online do Power BI não está configurada.

## Backup

Execute `backup.cmd`.

O script solicita a senha do PostgreSQL e grava um arquivo
com data e horário na pasta `backups`.

Confira no script o caminho do PostgreSQL, o banco e o usuário.

Guarde também uma cópia em outro disco ou armazenamento privado.
O GitHub armazena o código, não os registros do PostgreSQL.

## Teste de restauração

Execute `testar_backup.cmd`.

O script restaura o backup mais recente em um banco separado e consulta
as tabelas principais.

O banco de teste é mantido para conferência no pgAdmin.
Cada execução cria outro banco de teste.

A aplicação continua utilizando o banco principal.

## Verificação

Com a API e o PostgreSQL ligados, execute:

```text
verificar.cmd
```

Etapas:

1. Verificação de sintaxe Python.
2. Verificação dos modelos e migrações com Alembic.
3. Lint do frontend.
4. Build do frontend.
5. Consultas de verificação da API.

Essas verificações não substituem testes completos das operações de
cadastro, edição, exclusão e dos cálculos financeiros.

## Escopo da versão 1

Uso pessoal e local, com controle de lançamentos, planejamento mensal,
análises, exportação e backup.

Fora desta versão:

- Login e múltiplos usuários.
- Publicação na internet.
- Integração automática com bancos.
- Cartões de crédito, faturas e parcelamento.
- Saldo inicial e transferências entre contas.
- Metas de economia e investimentos.