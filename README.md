# Risk Assessment Workbench

Evidence-led financial crime risk assessment workspace: upload source documents, run AI-assisted extraction and drafting, analyst review, committee decision, and audit history.

## Development

Requires Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <repository-url>
cd myridius_disney_braintrust
npm ci
cp .env.example .env   # optional: CURSOR_API_KEY or ANTHROPIC_API_KEY for live AI
npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run verify` | Lint, typecheck, tests, and production build |
| `npm run test` | Unit tests (Vitest) |
| `npm run smoke:ai` | Optional live AI smoke test (requires `.env` keys) |

## Stack

- TanStack Start & React Router
- TypeScript, React 19
- Tailwind CSS 4
- Vitest, ESLint, Prettier
