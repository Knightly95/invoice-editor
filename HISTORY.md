# Development history

I built this project as a take-home for a frontend technical assessment in a hiring process. The work was done in a private repository and later moved to this one. When I moved it, I squashed the history into a single commit because the original repository also contained the assessment's starter template and instructions, which aren't mine to publish.

This is the original commit log, unchanged. It covers my 22 commits; the starter template's initial commit is left out.

| Date       | Commit                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------- |
| 2026-03-01 | `chore(app): setup initial copilot instructions, Architecture Decision Record and precommit hooks` |
| 2026-03-01 | `fix(app): adds yup form validation to invoice form`                                               |
| 2026-03-01 | `fix(app): added formatting, fixed stale api data display, some code and UI optimizations`         |
| 2026-03-01 | `feat(invoice): adds delete and finalize functionalities`                                          |
| 2026-03-01 | `feat(invoice): adds pay/unpaid button to invoice details view`                                    |
| 2026-03-01 | `fix(ux-ui): fix some styling, implemented navbar, color pallete`                                  |
| 2026-03-01 | `feat(filtering): adds filtering and order onto the invoice list, item per page selector added`    |
| 2026-03-01 | `feat(forms): improved user form ux/ui and improved some form validations`                         |
| 2026-03-01 | `feat(formating): changed some formating of values, and show vat on invoice detail`                |
| 2026-03-01 | `feat(invoice): adds new invoice use as template option`                                           |
| 2026-03-01 | `fix(app): adds stale window and route error boundary`                                             |
| 2026-03-01 | `fix(hooks): moved shared domain hooks outside of component colocation, and use barrel exports`    |
| 2026-03-01 | `test(unit): creates some important unit testing`                                                  |
| 2026-03-01 | `test(integration): adds integrations tests`                                                       |
| 2026-03-01 | `test(invoice): adds test for the invoice creation and edition`                                    |
| 2026-03-01 | `test(app): added some other tests`                                                                |
| 2026-03-01 | `fix(css): fix some layout issues`                                                                 |
| 2026-03-01 | `chore(docs): add decision on no e2e playwright tests`                                             |
| 2026-03-16 | `fix(filter): fixing no clearance button on customer filter`                                       |
| 2026-03-16 | `fix(columns): update column orders to look better or closer to standards`                         |
| 2026-03-16 | `fix(ux): improve ux when user is creating / editing an invoice`                                   |
| 2026-03-16 | `chore(docs): documented last changes pre-debrief`                                                 |

## What each phase covered

- **Setup (Mar 1):** AI workflow instructions, an architecture decision record and pre-commit hooks (Husky, lint-staged, tsc).
- **Features (Mar 1):** form validation, finalize, delete, paid/unpaid, list filtering, sorting and page size, use-as-template, and route error boundaries.
- **Testing (Mar 1):** unit and integration tests with Jest, React Testing Library and MSW.
- **Polish (Mar 16):** fixes to the customer filter and column order, a better create and edit experience, and updated documentation.

## After the move

- Replaced the externally hosted assessment API with an in-browser mock API ([`src/mockApi`](src/mockApi)) that implements the same OpenAPI contract, so the app runs with no backend.
- Rebranded the app and changed its colour palette.

Later changes are in the regular [git history](../../commits/main).
