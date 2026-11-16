# Architecture & Development Decisions

This document records the key technical and process decisions made throughout this project. It serves as a transparency log for AI tool usage, and as a reference for architectural choices made during development.

---

## Table of Contents

1. [AI Tooling & Development Setup](#1-ai-tooling--development-setup)
2. [Pre-decided Stack](#2-pre-decided-stack)
3. [Feature-Colocated Component Structure](#3-feature-colocated-component-structure)
4. [Pre-commit Hooks: Husky + lint-staged](#4-pre-commit-hooks-husky--lint-staged)

---

## 1. AI Tooling & Development Setup

**Tool**: GitHub Copilot, configured with **Claude Sonnet 4.6** as the underlying model.

**Why Claude Sonnet 4.6**  
Claude Sonnet 4.6 is Anthropic's mid-tier model, positioned between Haiku (fast, lightweight) and Opus (maximum capability). It is consistently ranked among the top-performing models for software engineering tasks on benchmarks such as SWE-bench, which measures a model's ability to resolve real GitHub issues in production codebases.

- **Code reasoning quality**: Strong structural reasoning — understands component trees, type constraints, and data flow rather than producing syntactically correct but semantically wrong code
- **Instruction following**: Reliably respects constraints defined in system prompts, making a well-structured instructions file actually effective in practice
- **Context retention**: Maintains coherence across long conversations covering multiple files and decisions — critical when refactoring or debugging requires holding the mental model of a whole feature
- **Sonnet vs Opus**: Opus offers higher raw capability but at significantly higher latency and cost. For iterative development where the feedback loop matters, Sonnet 4.6 provides a better cost-to-quality ratio; the quality ceiling for a React SPA with a well-defined domain rarely requires Opus-level reasoning
- **Personal familiarity**: Having used it extensively, I have a calibrated sense of where to trust its output and where to scrutinize it — a prerequisite for the kind of validation the assignment asks for

**Pre-development setup: structuring the AI workflow**  
Before writing any feature code, I structured the Copilot instructions file (`.github/copilot-instructions.md`) to create a contract between me and the assistant. The file encodes the exact project stack, coding standards, naming conventions, and domain-specific rules — so that every suggestion is grounded in this project's actual constraints rather than generic patterns.

It also defines a **Customer Persona**: to ground the persona in the real users of SME accounting and invoicing software, I reviewed how leading products in this space position themselves — they consistently point to accountants, RAFs, DAFs, and company managers as the core users. For this invoice editor specifically, the primary user is a financial operator (accountant, RAF, DAF) who needs accuracy, explicit invoice state, and reliable feedback on every action. Including this in the instructions means every UI decision — error messages, disabled states, confirmation dialogs — is evaluated against a concrete user rather than an abstract one. Finalized invoices, for example, must be visually locked because this operator must never accidentally submit changes to an immutable record.

This upfront investment reduces correction cost throughout development and ensures AI-assisted output is consistent and reviewable.

### How AI output was validated

- All generated code was reviewed before commit for correctness, type safety, and alignment with the decisions in this document
- Reasoning provided by the assistant for non-trivial choices was evaluated — agreed with, refined, or rejected — before the code was accepted
- Tests were written to verify behavior, not to rubber-stamp the implementation

**Tasks where AI assistance was applied**  
_(Updated as features are completed)_

| Task                       | AI contribution                                            | How it was validated                                                               |
| -------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Copilot instructions setup | Drafting structure, persona, guardrails, memoization rules | Reviewed against project stack, README requirements, and real-world React patterns |

---

## 2. Pre-decided Stack

The following are not decisions I made — they were established by the project scaffold and README. I used all of them as intended and introduced no alternatives.

- **TypeScript** — project pre-configured; type safety matters in a financial domain
- **React Hook Form + Yup + `@hookform/resolvers`** — listed in README as the form solution
- **TanStack Query v5** — listed in README as the server state solution
- **Ant Design v5, Bootstrap 5, `classnames`** — pre-installed UI layer
- **`big.js`** — pre-installed for monetary arithmetic (avoids IEEE 754 float errors)
- **`dayjs`** — pre-installed for date handling
- **`numeral`** — pre-installed for display formatting
- **`react-table`, `react-infinite-scroller`** — pre-installed for table and pagination needs
- **Jest 30 + React Testing Library + MSW v2** — pre-configured test stack; MSW mocks at the network level, so the full React Query + API client stack runs as in production

---

## 3. Feature-Colocated Component Structure

The scaffold places components in `src/app/components/[Feature]/`. I followed and extended this pattern: each feature folder contains its `index.tsx`, a `hooks/` subfolder for React Query and form hooks, and a `translators/` subfolder for functions that transform data between the API shape and the form shape. Shared, domain-agnostic components live in `src/ui/`.

The colocated structure was chosen over a technical-role separation (all hooks in one folder, all types in another) because everything needed to understand or change a feature stays in one place. The `translators/` boundary is particularly valuable in a financial domain — the API and UI representations of an invoice legitimately differ (amounts as strings from the API vs. `Big` instances in the form), and making that transformation explicit and named prevents implicit coercions from leaking across the codebase.

---

## 4. Pre-commit Hooks: Husky + lint-staged

Pre-commit hooks enforce code quality gates before any commit reaches the repository, keeping the codebase consistently formatted and type-safe without relying on CI feedback cycles.

Setup:

- **husky v9** manages the git hook lifecycle (`prepare: husky` runs on `yarn install`)
- **lint-staged** runs checks only on staged files, keeping the hook fast
- The pre-commit hook runs two steps:
  1. `lint-staged` — runs `eslint --fix` and `prettier --write` on staged `.ts`/`.tsx` files; `prettier --write` on `.js`, `.json`, `.css`, and `.md` files
  2. `tsc --noEmit` — full project type-check; cannot be scoped to staged files since TypeScript resolves types across the whole codebase

This combination catches formatting drift, lint violations, and type errors at the earliest possible point.
