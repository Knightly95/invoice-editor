# AGENTS.md

Instructions for AI coding agents working in this repository. People follow the same rules; see [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow.

## Project

A React 18 and TypeScript invoice editor for accountants and finance teams. It talks to a REST API defined in `src/api/schema.yml`. By default that API is an in-browser mock (MSW) in `src/mockApi`, so the app runs with no backend.

The user is a financial operator. Amounts must be exact, invoice states (draft, finalized, paid) must be explicit, and no action may fail silently.

## Commands

| Task                      | Command                               |
| ------------------------- | ------------------------------------- |
| Install                   | `yarn install`                        |
| Run locally               | `yarn start`                          |
| All tests                 | `yarn test`                           |
| One test file             | `yarn test src/path/to/file.spec.tsx` |
| Tests with coverage       | `yarn test --coverage`                |
| Type-check                | `npx tsc --noEmit`                    |
| Lint                      | `npx eslint src`                      |
| Format                    | `npx prettier --write <files>`        |
| Build                     | `yarn build`                          |
| Regenerate the API client | `yarn openapi:gen`                    |

Use Yarn 1, not npm or pnpm. Node 22.

## Before you say a task is done

1. `npx tsc --noEmit` passes.
2. `yarn test` passes, including tests you added for the change.
3. `npx eslint src` reports no new problems.
4. Changed files are formatted with Prettier.

Report what you ran and the result. If something fails and you can't fix it, say so; don't hide it.

## Structure

```text
src/
  api/          OpenAPI schema and the generated typed client (gen/ is generated)
  app/
    components/ Feature components: InvoicesList, InvoiceShow, InvoiceForm, ...
                Each keeps its own hooks/ and translators/ (API <-> form values)
    contexts/   React contexts
    hooks/      Domain hooks shared by two or more features (invoice mutations)
  helpers/      Pure functions: formatting, totals
  hooks/        Shared hooks with no domain knowledge
  mockApi/      In-browser mock API: seed data, MSW handlers, localStorage store
  specs/        Test setup, fixtures, MSW test server
  types/        Shared types
  ui/           Reusable components that know nothing about invoices
```

Where a hook goes: used by one feature and tied to its form, in that feature's `hooks/`; used by two or more features, in `app/hooks/[domain]/`; no domain knowledge, in `src/hooks/`.

## Rules

- **Types.** No `any`, no `@ts-ignore`, no non-null assertions to silence errors. Take API types from `src/api/gen/client.d.ts`.
- **Money.** Use `big.js` for every calculation and `numeral` for display. Never use native float arithmetic on amounts.
- **Dates.** Use `dayjs`. Send ISO 8601 to the API.
- **Server state.** Use TanStack Query v5. Invalidate or update the cache after a mutation. Don't mirror server data in `useState`.
- **Forms.** React Hook Form with a Yup schema through `@hookform/resolvers`.
- **UI.** Ant Design v5 components first. Bootstrap utility classes only where Ant Design has nothing suitable.
- **Navigation.** Use the router (`Link`, `useNavigate`, `useHref`). A plain `href` skips the router's base path and breaks the GitHub Pages deployment.
- **Finalized invoices** are locked. Only `paid` can change, and the UI must show that.
- **Feedback.** Every API result produces a visible message. Destructive actions ask for confirmation. Show a loading state and an empty state; never a blank area.
- **Memoization.** Don't add `React.memo`, `useMemo` or `useCallback` without a measured reason.
- **Imports.** Import lodash functions one by one (`import debounce from 'lodash/debounce'`).
- **Language.** Code, comments and documentation are in English.

## Tests

- Jest 30, React Testing Library and MSW v2. Test files are `*.spec.ts(x)` next to the code.
- Query by role and label. Test what the user sees, not implementation details.
- Mock HTTP with the MSW server in `src/specs/mocks/server.ts`. Don't mock hooks or the API client.
- Use the helpers in `src/specs/testUtils.tsx` and the fixtures in `src/specs/fixtures`.
- Write the implementation first, then its tests, in the same change.

## Guardrails

- Don't edit generated files: `src/api/gen/**` and `public/mockServiceWorker.js`.
- If you change `src/api/schema.yml`, regenerate the client and update `src/mockApi/handlers.ts` in the same change.
- Don't add a dependency without a reason recorded in `DECISIONS.md`.
- Don't commit secrets or `.env.local`. The app needs no secrets to run.
- Don't push to `main`. Work on a branch and open a pull request.
- Don't skip the pre-commit hook (`--no-verify`).
- Keep changes small. If a request conflicts with these rules, say so and propose an alternative instead of complying silently.

## More detail

- [.github/copilot-instructions.md](.github/copilot-instructions.md): the long reference with code patterns, anti-patterns and render-performance checks.
- [ADR.md](ADR.md): architecture decisions, and how AI tooling was used and validated.
- [DECISIONS.md](DECISIONS.md): implementation choices and trade-offs.
- [backend_issues.md](backend_issues.md): known API quirks and the frontend workarounds.
