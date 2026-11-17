# Contributing

Thanks for taking the time to look at this project. This guide explains how to set it up, what a change must pass before it's merged, and the conventions the code follows.

## Set up

You need Node 22 and Yarn 1 (see `.tool-versions`).

```bash
yarn install
yarn start      # http://localhost:3000, with the in-browser mock API
```

No backend or environment file is needed. The mock API in `src/mockApi` serves seeded data and saves changes in `localStorage`.

## Workflow

1. Open an issue first for anything larger than a small fix, so the approach can be agreed before you write code.
2. Create a branch from `main`: `feat/short-name`, `fix/short-name`, `docs/short-name` or `chore/short-name`.
3. Keep the change small and focused on one thing.
4. Open a pull request against `main` and fill in the template. Nothing is pushed straight to `main`.

## Checks

Run these before you open a pull request. CI runs the type-check, the tests and the build on every pull request.

| Check      | Command                  |
| ---------- | ------------------------ |
| Types      | `npx tsc --noEmit`       |
| Lint       | `npx eslint src`         |
| Formatting | `npx prettier --check .` |
| Tests      | `yarn test`              |
| Build      | `yarn build`             |

A pre-commit hook (Husky and lint-staged) runs ESLint and Prettier on the files you staged.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:` or `ci:`, followed by a short summary in the imperative. Explain the reason for the change in the body when it isn't obvious.

## Code conventions

The full reference is [AGENTS.md](AGENTS.md), which people and AI coding agents both follow. The rules that matter most:

- **TypeScript:** no `any` and no `@ts-ignore`. Use the generated API types in `src/api/gen` instead of redefining them.
- **Money:** all arithmetic uses `big.js`, never native floats. Amounts are displayed with `numeral`.
- **Dates:** `dayjs` only. Dates are sent to the API in ISO 8601.
- **Server state:** TanStack Query. Don't copy server data into component state.
- **Forms:** React Hook Form with a Yup schema.
- **Structure:** feature components live in `src/app/components/[Feature]` with their own hooks and translators. Components in `src/ui` know nothing about invoices.
- **Feedback:** every API call shows a visible success or error message. Destructive actions ask for confirmation.

## Tests

- Tests sit next to the code as `*.spec.ts` or `*.spec.tsx`.
- Use React Testing Library and query by role or label, as a user would. Don't test implementation details.
- Mock the network with MSW (`src/specs/mocks/server.ts`), not by mocking hooks or the API client.
- Add or update tests in the same pull request as the behaviour change. A bug fix comes with a test that fails without the fix.

## Changing the API contract

The contract is `src/api/schema.yml`. After you edit it, run `yarn openapi:gen` to regenerate the typed client, then update the mock handlers in `src/mockApi/handlers.ts` to match.

## Decision records

Record a non-trivial choice (a new library, a pattern, a trade-off) in [DECISIONS.md](DECISIONS.md), with the alternatives you rejected and why. Architecture and process decisions go in [ADR.md](ADR.md).

## Reporting a bug

Open an issue with the bug report template. Include the steps to reproduce, what you expected and what happened. If the demo data matters, say whether you had reset it.
