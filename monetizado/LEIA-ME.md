# Planejamento de Aula — SESI · Versão Monetizada

Versão do app com **contas (email/senha), créditos de IA e recarga via PIX** (liberação manual).

Funciona 100% em hospedagem estática (GitHub Pages) usando o Supabase como backend
(Auth + Postgres + RLS). Nenhum servidor próprio é necessário.

---

## Como funciona

- O professor cria uma conta (email/senha) e ganha **15 créditos de cortesia**.
- Cada uso de IA consome **1 crédito**.
- Sem créditos, o app bloqueia a IA e oferece a tela de recarga.
- O professor escolhe um pacote, faz um **PIX manual** (chave + referência) e o
  **administrador aprova manualmente** no painel, liberando os créditos.
- Cada professor usa a **sua própria chave Groq** (salva na conta).

## Configuração (uma vez)

### 1) Crie o projeto Supabase
1. Acesse <https://supabase.com> e crie um projeto.
2. Em **Settings → API**, copie o `Project URL` e a `anon public key`.

### 2) Rode o SQL
1. Abra **SQL Editor → New query**.
2. Cole o conteúdo de [`supabase_monetizacao.sql`](supabase_monetizacao.sql) e **Run**.
3. Isso cria as tabelas (`perfis`, `planos`, `credito_transacoes`, `pedidos_pix`),
   as funções de crédito e as políticas de segurança (RLS).

### 3) Marque-se como administrador
Com o SQL acima, rode este comando no SQL Editor (troque pelo seu e-mail):

```sql
update public.perfis
   set is_admin = true
 where user_id = (select id from auth.users where email = 'seu@email.com');
```

> Se ainda não tiver cadastrado, faça o cadastro pelo app primeiro.

### 4) Ajuste os pacotes (preços em centavos)
Por padrão são criados: Básico (50 créditos / R$15,00), Popular (150 / R$39,00) e
Completo (400 / R$90,00). Para alterar:

```sql
update public.planos set preco_centavos = 1990, creditos = 80 where nome = 'Básico';
```

### 5) Configure o app
No arquivo [`index.html`](index.html), no topo do script **"VERSÃO MONETIZADA"**:

```js
const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';
const PIX_CONFIG = { chave: 'SUA_CHAVE_PIX', nome: 'Seu Nome', cidade: 'Sua Cidade', ... };
```

- `PIX_CONFIG.chave` é a chave PIX que os clientes vão copiar para pagar.
- `PIX_CONFIG.aviso` é a mensagem com os seus canais de contato para envio do comprovante.

### 6) Publique
Suba a pasta `monetizado/` para o GitHub Pages (ou qualquer estática). O app
funciona normalmente; quando `SUPABASE_URL`/`SUPABASE_ANON_KEY` estão vazios,
entra em "modo desenvolvimento" (sem login e sem cobrança) para testes locais.

---

## Uso diário (fluxo do cliente)

1. O professor entra com email/senha.
2. Usa a IA até esgotar os créditos.
3. Clica em **⚡ saldo** (ou na mensagem de falta de créditos) → **Comprar créditos**.
4. Escolhe o pacote → copia a **chave PIX** e a **referência** → paga no app do banco.
5. Envia o comprovante pelo canal definido em `PIX_CONFIG.aviso`.
6. O administrador abre **Painel** na própria conta e aprova o pedido → créditos são
   adicionados automaticamente e o cliente vê o saldo atualizado (o app verifica a cada 10 s).

## Fluxo do administrador

- Entre com a conta marcada como admin → botão **Painel** na barra superior.
- Em **Pedidos PIX aguardando**: **Aprovar** ou **Recusar**.
- Em **Usuários e saldos**: vê saldo de todos e pode adicionar créditos manuais
  (botão **+ créditos**) — ex.: devolução, bônus, pagamento por outro canal.

## Observações de segurança

- A `anon key` é pública por natureza; a segurança fica nas **políticas RLS**
  (usuário só vê/edita o próprio perfil e pedidos) e nas **funções `SECURITY DEFINER`**
  (`consumir_creditos`, `aprovar_pedido_pix`, `ajustar_creditos`) que validam o
  autenticado e o papel de admin no servidor.
- O consumo de crédito é atômico (bloqueio de linha), evitando "gastar duas vezes"
  em chamadas concorrentes.
- Mantenha a chave Groq como preferir: ela fica na coluna `groq_api_key` do perfil,
  visível apenas ao próprio usuário (RLS).

## Testes locais

A pasta `_testes/` contém testes que simulam o Supabase em memória (jsdom):

```bash
npm i -g jsdom   # ou: npm i jsdom no projeto
node _testes/teste_integracao.cjs   # fluxo completo: login, créditos, paywall, PIX, admin
node _testes/teste_login.cjs        # tela de login sem Supabase configurado
```

Os testes não interferem na publicação (apenas `index.html` é servido).
