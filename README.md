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
