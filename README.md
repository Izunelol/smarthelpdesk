# SmartHelpDesk

Plataforma de atendimento (helpdesk) em três níveis com triagem por IA (Google Gemini).
Veja `CLAUDE.md` para o guia completo do projeto.

## Como rodar

```bash
cp .env.example .env      # preencha GEMINI_API_KEY e troque o JWT_SECRET
docker compose up --build
```

## Acesso

| Serviço      | URL                              |
|--------------|-----------------------------------|
| Web (front)  | http://localhost:5173             |
| API          | http://localhost:3000             |
| Postgres     | `localhost:5433` (`helpdesk`/`helpdesk`, banco `smarthelpdesk`) |

## Credenciais

As migrations `SeedUsers1783176626770` e `SeedAdminUser1783256000000` criam quatro
usuários de teste (senha igual para todos). Rode as migrations depois de subir o compose:

```bash
docker compose exec api npm run migration:run
```

| Papel        | E-mail                            | Senha      |
|--------------|-------------------------------------|------------|
| Administrador          | admin@smarthelpdesk.com        | senha123   |
| Técnico (nível 2)     | tecnico@smarthelpdesk.com      | senha123   |
| Especialista (nível 3)| especialista@smarthelpdesk.com | senha123   |
| Usuário comum         | usuario@smarthelpdesk.com      | senha123   |

Nenhum usuário `MANAGER` é criado pelo seed. Para promover alguém a esse papel,
registre uma conta em http://localhost:5173/register e promova pela API usando o
token do `ADMIN` do seed:

```bash
curl -X PATCH http://localhost:3000/users/:id/role \
  -H "Authorization: Bearer <token-do-admin>" \
  -H "Content-Type: application/json" \
  -d '{"role":"MANAGER"}'
```

Papéis disponíveis: `USER`, `TECHNICIAN`, `SPECIALIST`, `MANAGER`, `ADMIN`.

Depois de logado como `ADMIN`, dá pra promover outros usuários via:

```
PATCH /users/:id/role   { "role": "TECHNICIAN" }
```
(requer token JWT de um ADMIN no header `Authorization: Bearer <token>`)

## Expor o ambiente local (Cloudflare Tunnel)

Para compartilhar o ambiente de dev publicamente (demo, teste em outro dispositivo,
webhook externo) sem abrir portas no roteador, use o serviço `cloudflared` do compose.
Ele fica atrás de um profile e não sobe com `docker compose up` normal.

**Modo rápido** (sem conta Cloudflare, gera uma URL aleatória `*.trycloudflare.com`,
válida enquanto o container estiver rodando):

```bash
docker compose up -d          # sobe api/web/db normalmente
docker compose --profile tunnel up cloudflared
```

A URL pública aparece no log do container (`docker compose logs -f cloudflared`).
Por padrão ela aponta para o front-end (`http://web:5173`). Para expor a API em vez
disso, defina `CLOUDFLARE_TUNNEL_URL=http://api:3000` no `.env`.

**Modo nomeado** (domínio próprio, URL fixa): crie um túnel em
[Cloudflare Zero Trust → Networks → Tunnels](https://one.dash.cloudflare.com/), adicione
"Public Hostnames" apontando para `http://web:5173` e/ou `http://api:3000`, copie o
token gerado e coloque em `CLOUDFLARE_TUNNEL_TOKEN` no `.env`. Com o token preenchido,
o mesmo comando (`docker compose --profile tunnel up cloudflared`) sobe o túnel nomeado
em vez do rápido.

> O túnel é só para expor o ambiente — não substitui a stack fixa do projeto
> (TypeScript + PostgreSQL) nem move nada para a infraestrutura da Cloudflare.
