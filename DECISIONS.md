# Technical Decisions — Invoice Editor

> Structured record of non-trivial implementation choices made during the assessment.
> Audience: reviewers evaluating architectural thinking and domain understanding.
> Format per entry: **Problem → Options considered → Decision → Tradeoffs accepted**.

---

## Form & Validation

### FV-1 — Yup schema as single source of truth for form types

**Problem**: The original codebase had a hand-written `InvoiceFormValues` type and no runtime validation. The type and any future schema could drift silently — nothing would warn you if a field was added to one but not the other.

**Options considered**:

- Keep manual type + add Yup schema separately → two sources of truth, drift risk remains
- Use Zod instead of Yup → Zod has stricter inference, but Yup is already installed; switching adds churn with no UX benefit for this domain
- Derive type from schema via `yup.InferType` → single source of truth; schema and type are structurally identical by construction

**Decision**: `InvoiceFormValues` is derived exclusively via `yup.InferType<typeof invoiceFormSchema>`. The manual type was deleted. The schema validates: `customer` required, `issueDate` and `deadline` required dates, `invoice_lines` array with at least one entry, `quantity` positive and required, `product` present on every line.

**Tradeoffs accepted**: Yup's inferred types are sometimes less precise than hand-written ones (optional fields become `T | undefined`). Acceptable here — the schema is the authoritative contract and the imprecision is visible in the type.

---

### FV-2 — `product` is required on an invoice line

**Problem**: The original code used `product: null` as the blank-line default. The UI already showed `-` for every derived field (price, unit, VAT) when product was absent, signalling the line had no business meaning. More critically, the translator called `Number(line.product?.id)`, which silently produces `NaN` if product is absent — corrupting the API payload without any error.

**Options considered**:

- Keep `product` nullable and validate only at submit → runtime guard exists but NaN is still reachable in translators if the guard is ever skipped or bypassed
- Make `product` required with `.required()` → `InferType` produces `Product` (non-nullable), which breaks form initialisation since the field genuinely starts empty before the user picks a product
- Make `product` optional (`Product | undefined`) with a `.test()` enforcing presence at submit → form can hold `undefined` while the user hasn't picked yet; submission is blocked; translators are protected; `null` is eliminated entirely

**Decision**: `product: yup.mixed<Product>().optional().test('product-required', 'Product is required', value => value != null)`. `null` was replaced with `undefined` at every call site (`append`, default values hook) — `null` had no semantic meaning distinct from `undefined` and introduced a union that served no purpose.

**Tradeoffs accepted**: Every blank-line initialisation had to be updated from `product: null` to `product: undefined`. One-time migration, no ongoing cost.

---

### FV-3 — `yupResolver` typed cast

**Problem**: `@hookform/resolvers` v5 changed `yupResolver`'s return type signature to require all three `useForm` generics explicitly. TypeScript rejected the resolver without a cast, even though the runtime output is fully compatible.

**Options considered**:

- Upgrade `@hookform/resolvers` → would require auditing all form usage for breaking changes; disproportionate scope for a type-only issue
- Pass all three explicit generics to `yupResolver<A, B, C>` → the third generic (`TFieldValues`) is an internal inference helper not meaningfully settable from user code
- Cast via `as Resolver<InvoiceFormValues>` → suppresses the generics mismatch at the call site only; runtime is unaffected

**Decision**: `yupResolver(invoiceFormSchema) as Resolver<InvoiceFormValues>` at the `useForm` call site. The cast is local, documented, and does not propagate.

**Tradeoffs accepted**: The cast papers over a package version mismatch that should eventually be resolved by upgrading `@hookform/resolvers`. Noted as known debt.

---

## Formatting & Financial Arithmetic

### FA-1 — `formatDate` extracted to `helpers/formatDate.ts`

**Problem**: `dayjs(value).format('DD/MM/YYYY')` appeared inline in `InvoiceInfo.tsx` and `structure.tsx`. Two call sites, identical logic, no shared fallback — the null/undefined handling (`|| 'N/A'` vs `?? '-'`) was inconsistent between them.

**Decision**: Extracted `helpers/formatDate.ts` with signature `(date: string | null | undefined): string`. Returns `'N/A'` for falsy input (standardized), `DD/MM/YYYY` otherwise. `dayjs` is imported in exactly one place. Both consumers use the helper and their inline `dayjs` imports were removed.

**Tradeoffs accepted**: `'N/A'` is now the standard null-date display across the app. The previous `'-'` in the table was inconsistent with `InvoiceInfo`'s `'N/A'` — standardizing to `'N/A'` is the right call for a financial UI where every field value must be unambiguous.

---

### FA-2 — `new Big(string)` directly, never `Number(string)` before `Big`

**Problem**: `InvoiceLineFields` computed totals and displayed unit prices using `Big(Number(product.unit_price))`. `unit_price` and `unit_tax` are API strings (e.g. `"1234.50"`). `Number("0.1")` produces the IEEE 754 float `0.1` — the very precision error `big.js` exists to prevent — before `Big` ever sees the value.

**Decision**: `new Big(product.unit_price)` directly. `big.js` parses decimal strings natively with exact arithmetic. `.toNumber()` is called only at the final step when passing to `formatAmount`, which requires a native number for `Intl.NumberFormat`. The pipeline is: `string → Big (exact) → .toNumber() → display only`.

---

## Component Architecture

### CA-1 — `useWatch` instead of prop-drilling `watch`

**Problem**: `watch` (from `useForm` in `InvoiceForm`) was passed as a prop through `InvoiceLinesFields` — which never used it — into `InvoiceLineFields`, which called `watch('invoice_lines.N')` to read the current line values. This is two-level prop drilling of a function whose only purpose was to subscribe a child to its own slice of form state.

**Options considered**:

- Keep prop drilling → `InvoiceForm` owns the watch subscription on behalf of a deeply nested child; `InvoiceLinesFields` carries a prop it doesn't use (SRP violation)
- Use `useWatch({ control, name: 'invoice_lines.N' })` inside `InvoiceLineFields` → component subscribes itself only to its own field, `watch` disappears from all three prop interfaces

**Decision**: `useWatch` inside `InvoiceLineFields`. Each line re-renders only when its own `invoice_lines.N` slice changes. `InvoiceLinesFields` and `InvoiceForm` no longer know or care about the subscription.

---

### CA-2 — `handleSubmit(onSave)` directly, no passthrough wrapper

**Problem**: `InvoiceForm` defined `const onSubmit = (data) => onSave(data)` and passed it to `handleSubmit(onSubmit)`. The wrapper did nothing except add an indirection layer and an extra closure allocation on every render.

**Decision**: `handleSubmit(onSave)` directly. `handleSubmit` accepts `SubmitHandler<InvoiceFormValues>`, which is `(data: InvoiceFormValues, event?) => void`. `onSave` satisfies this type exactly.

---

### CA-3 — Domain-action hooks centralised in `app/hooks/invoices/`; form-submission hooks stay co-located

**Problem**: The initial scaffold placed `useDeleteInvoice`, `useFinalizeInvoice`, and `useTogglePaid` inside `InvoiceShow/hooks/`. This implied that `InvoiceShow` owned these mutations. In practice, `InvoicesList` also needed all three — delete, finalize, and paid toggle are all available directly from the list's row action menu. The result was three sibling-feature imports of the form:

```typescript
// InvoicesList/index.tsx importing from a sibling feature's internals
import { useFinalizeInvoice } from 'app/components/InvoiceShow/hooks/useFinalizeInvoice'
import { useDeleteInvoice } from 'app/components/InvoiceShow/hooks/useDeleteInvoice'
import { useTogglePaid } from 'app/components/InvoiceShow/hooks/useTogglePaid'
```

This breaks the co-location premise: the hooks weren't truly owned by `InvoiceShow` — they were domain-level mutations needed by any invoice-displaying view.

Two additional bugs were present in the form-submission hooks (`useCreateInvoice`, `useUpdateInvoice`): both used `default` exports (inconsistent with every other hook in the codebase) and neither called `queryClient.invalidateQueries` — leaving the invoice list stale after create or update.

**Options considered**:

- Leave in `InvoiceShow/hooks/` → sibling-feature coupling grows as new views emerge; tests the boundaries of co-location without the benefits
- Global `src/services/` or `src/api/hooks/` layer → standard in large SPAs; over-engineered for this codebase size; blurs the boundary between data-fetching hooks and infrastructure
- `src/app/hooks/invoices/` — a shared folder inside the feature boundary → neutral location accessible by any invoice-displaying component; consistent with the existing `src/hooks/` pattern for shared non-domain hooks; scales naturally if a third view (e.g. bulk-action screen) is added

**Decision**:

1. `useDeleteInvoice`, `useFinalizeInvoice`, and `useTogglePaid` were moved to `src/app/hooks/invoices/` with a barrel `index.ts` exporting all three as named exports. `InvoiceShow/hooks/` was deleted.
2. `useCreateInvoice` and `useUpdateInvoice` remain co-located (`InvoiceCreate/hooks/`, `InvoiceEdit/hooks/`) — they are tightly coupled to `InvoiceFormValues` and their feature-specific translators, and each is used only in one place. Moving them would add distance with no coupling benefit.
3. Both form-submission hooks were converted from `default` to named exports for consistency.
4. Both form-submission hooks now call `queryClient.invalidateQueries({ queryKey: ['invoices'] })` in `onSuccess`. `useUpdateInvoice` additionally invalidates `['invoice', id]`. Without these, the list and detail cache remained stale for up to the configured `staleTime` (30 s) after a create or update.

**The rule derived from this**:

- **Co-locate** when a hook is used exclusively within one feature and its logic is inseparable from that feature's context (form values, translators).
- **Centralise** when a hook is already imported by more than one feature, or when its domain semantics make it inherently shareable (lifecycle mutations: delete, finalize, toggle paid).

**Tradeoffs accepted**: `app/hooks/invoices/` is a new directory that sits between `app/components/` and `src/hooks/`. Contributors must know to look there for invoice domain mutations. The barrel `index.ts` makes the available surface explicit and keeps consumer imports to one line.

---

## API Limitations & Workarounds

### AW-1 — Client-side recalculation of invoice totals after product substitution

**Problem discovered**: When an invoice line's product is updated via the edit form, the API correctly stores the new `product_id` and returns the updated `invoice_line.product` nested object. However, the API does **not** recompute the snapshot fields it stores alongside the line:

- `invoice_line.price` — still reflects the original product's price
- `invoice_line.tax` — still reflects the original product's tax
- `invoice.total` — sum based on stale line prices
- `invoice.tax` — sum based on stale line taxes

This means after an edit, the show view and the list table both displayed the pre-update totals, even though the nested `product` correctly showed the new item and its price. The bug is only visible post-edit — a freshly created invoice is consistent.

**Options considered**:

- Request an API fix → outside the scope of this assessment; README explicitly says to work around API limitations on the frontend
- Re-fetch on every render → already happens via React Query cache invalidation; doesn't help because the server itself returns stale snapshot values
- Patch the cached data in React Query's `onSuccess` → mutates the cache entry globally, causing subtle bugs if the same invoice is placed in multiple query contexts
- Transform via `select` → runs after every fetch/cache hit, is pure (doesn't mutate the cache), composes cleanly, and is the idiomatic TanStack Query solution for shaping response data

**Decision**: Created `helpers/recalculateInvoiceTotals.ts` — a pure function that derives all stale fields from the authoritative `invoice_line.product.*` fields:

- `line.price` → `product.unit_price × quantity`
- `line.tax` → `product.unit_tax × quantity`
- `invoice.total` → sum of corrected line prices
- `invoice.tax` → sum of corrected line taxes

Applied as a `select` transformer in two places:

1. `hocs/WithInvoice.tsx` — corrects the detail/show view
2. `app/components/InvoicesList/index.tsx` — corrects the list table totals

The `select` function is referentially stable (module-level import), so it does not cause spurious re-renders.

**Tradeoffs accepted**: The frontend is now the source of truth for derived totals rather than the API. If the API is ever fixed to return correct values, the `select` transformer becomes a no-op (it recomputes the same values the API would return), so it can be removed without behaviour change. No ongoing risk.

---

## Invoice Lifecycle

### IL-1 — Finalize button placement and irreversibility guardrail

**Problem**: Finalization is the most consequential action in the invoice lifecycle — it locks all fields permanently (API-enforced, one-way). Placing the button without an explicit confirmation step or clear visual feedback would allow accidental finalization with no recovery path.

**Options considered**:

- Inline toggle (e.g. a `Switch`) → conveys reversibility, which is factually wrong for finalization; misleads the operator
- Button without confirmation → fast but ignores the UX guardrail requiring `Modal.confirm` for irreversible actions
- Button + `Modal.confirm` with explicit irreversibility copy → makes the one-way nature of the action unambiguous before the operator commits

**Decision**: A "Finalize" `Button` (type `primary`, danger style) in `InvoiceInfo`, visible only when `!invoice.finalized`. On click, `Modal.confirm` is shown with the copy "This action cannot be undone. The invoice will be locked for editing." before the mutation fires. On `onSuccess`, both `['invoice', id]` and `['invoices']` are invalidated and a success toast is shown. On `onError`, an error toast surfaces the API message.

Post-finalization, the entire edit form is rendered with all fields disabled, and the Edit button is replaced with a disabled state + tooltip. The Finalize and Delete buttons disappear; the paid toggle becomes available.

**Tradeoffs accepted**: The confirmation step adds one extra click to an intentional action. For a financially irreversible operation this is the correct tradeoff — the cost of an accidental finalization (contacting support, issuing a credit note) far exceeds the cost of one modal dismissal.

---

### IL-2 — Delete restricted to draft invoices only

**Problem**: The API supports `DELETE /invoices/:id` but does not enforce a finalization guard at the HTTP level. Exposing delete on finalized invoices would allow operators to destroy billable documents that may already have been sent to customers.

**Options considered**:

- Allow delete on all invoices with a strong warning → technically possible; legally and operationally wrong for finalized documents (audit trail, VAT records)
- Hide delete entirely → eliminates a legitimate draft-cleanup workflow
- Show delete only for `finalized === false` → matches the business rule: drafts are work-in-progress and freely deletable; finalized invoices are immutable records

**Decision**: The Delete button is rendered only when `!invoice.finalized`. It triggers a `Modal.confirm` with `okType: 'danger'` and the copy "This invoice will be permanently deleted. This action cannot be undone." On confirm, `DELETE /invoices/:id` is called; on `onSuccess`, `['invoices']` is invalidated and `navigate('/invoices')` redirects the operator to the list. On `onError`, an error toast is shown.

**Tradeoffs accepted**: Operators cannot delete finalized invoices through the UI even if that is their intent (e.g. test data in production). The correct flow in that case is to issue a voiding credit note. Restricting delete is the conservative, auditable default.

---

### IL-3 — Optimistic update on paid toggle

**Problem**: The `paid` toggle is the most frequently triggered action on a finalized invoice — an operator marks invoices as paid as confirmations arrive. The round-trip to the API (300–800 ms) would produce a visible spinner on every tap, making the UI feel sluggish for a one-bit state change with a near-zero failure rate.

**Options considered**:

- Pessimistic update (wait for API response before updating UI) → shows a loading spinner on every toggle; technically safe but perceptibly slow for a high-frequency action
- Fire-and-forget (update cache immediately, ignore errors) → fast UI but silently corrupts state on API failure; never acceptable in a financial tool
- Optimistic update with rollback → update the cache immediately on `onMutate`, snapshot the previous state, restore it in `onError`, and invalidate on `onSuccess` to confirm the server state; the UI is instant and correct

**Decision**: Full optimistic update via TanStack Query `onMutate`/`onError`/`onSuccess`:

1. `onMutate` — cancel in-flight queries for `['invoice', id]`, snapshot current cache entry, write the flipped `paid` value directly into the cache
2. `onError` — restore the snapshot to its pre-mutation value; show an error toast with the API message
3. `onSuccess` — invalidate `['invoice', id]` and `['invoices']` to synchronise with server truth; show a contextual success toast ("Marked as paid" / "Marked as unpaid")

The toggle is only rendered when `invoice.finalized === true` — the API does not accept `paid` changes on draft invoices, and the UI enforces this guard visually.

**Tradeoffs accepted**: In the window between `onMutate` and `onSuccess`, the UI reflects an unconfirmed state. For a `paid` boolean toggle on a finalized invoice this is an acceptable tradeoff — the financial record (the finalized invoice document) is immutable; only the payment status marker is changing. On error, the rollback is immediate and visible via toast.

---

### IL-4 — Finalization is one-way; credit note pattern for corrections

**Problem**: The API enforces finalization as an irreversible transition. Once `finalized: true`, the invoice cannot be reverted to draft, and all fields except `paid` are locked. This is by design for audit-trail integrity, but it means a finalized invoice with an error cannot be corrected directly.

**Decision**: The correct accounting pattern for correcting a finalized invoice is to issue a **credit note**: a new invoice that negates the original (negative quantities or amounts), then issue a replacement. This is standard double-entry bookkeeping practice. The current UI does not implement credit notes — that would require a dedicated "Void & Reissue" flow outside the scope of this assessment — but the architecture does not prevent it. A clone feature (F12) would provide the scaffolding.

**Tradeoffs accepted**: Operators cannot self-serve invoice corrections after finalization. They must be aware of the credit note workflow. This is the correct real-world constraint — allowing un-finalization would break audit trails.

---

## Routing

### RT-1 — Switched all imports from `react-router` to `react-router-dom`

**Problem**: The MVP imported `useNavigate`, `useParams`, `Navigate`, and related hooks from `react-router` (the framework-agnostic core) rather than `react-router-dom` (the browser-specific package). Both re-export the same symbols in React Router v7, so there was no runtime failure — but mixing import sources in a browser app is conceptually wrong and creates confusion for contributors who expect all browser routing to come from `react-router-dom`.

**Options considered**:

- Leave as-is → no runtime impact, but technically incorrect and inconsistent
- Alias `react-router` → `react-router-dom` in tsconfig → hides the problem without fixing it
- Bulk-replace all import sources → one-time migration, correct going forward

**Decision**: All routing imports across `App.tsx`, `InvoiceCreate`, `InvoiceEdit`, `InvoiceInfo`, `InvoicesList`, and HOCs were updated to import exclusively from `react-router-dom`. `react-router` remains a transitive dependency but is never imported directly by application code.

---

### RT-2 — Route structure and default redirect

**Problem**: The MVP had no top-level routing shell — components were rendered ad-hoc. Adding a navbar and multiple views required a formal route tree.

**Decision**: `BrowserRouter` at the root wraps a single `<Routes>` with four explicit routes:

- `/invoices/new` → `InvoiceCreate`
- `/invoices/:id/edit` → `InvoiceEdit`
- `/invoices/:id` → `InvoiceShow`
- `/invoices` → `InvoicesList`
- `/` → `<Navigate to="/invoices" replace />` (catch-all redirect)

The order is intentional: `/invoices/new` must precede `/invoices/:id` so the literal segment `new` is not captured as a dynamic `id` parameter.

All post-mutation navigations (`navigate('/')`) were updated to `navigate('/invoices')` to match the new route structure and avoid the redirect round-trip.

**Tradeoffs accepted**: `BrowserRouter` requires the server to serve `index.html` for all paths. On Cloudflare Pages this is handled via a `_redirects` file; on a static host without SPA fallback the app would 404 on direct URL access.

---

## Navigation & Layout

### NL-1 — Persistent top navbar with `NavLink` active state

**Problem**: With multiple routes, operators needed a persistent, scannable way to understand where they are and navigate between sections. The MVP had no global navigation at all.

**Options considered**:

- Ant Design `Menu` inside `Layout.Sider` (sidebar) → industry-standard pattern but spatially expensive for a single-section app with one nav item; sidebar implies multiple peer sections
- Ant Design `Menu` inside `Layout.Header` → works but couples navigation tightly to Ant Design's menu component, making it harder to control link semantics
- Custom `NavLink`-based header → full control over active state via React Router's `NavLink`, CSS-driven styles, no Ant Design override gymnastics except for the `Layout.Header` background token

**Decision**: Custom `Navbar` component using React Router `NavLink` inside `Layout.Header`. Active state is driven by `NavLink`'s `isActive` callback, which applies a `--active` modifier class. The component is co-located in `src/ui/Navbar/`.

**Tradeoffs accepted**: The custom nav is marginally more code than an Ant Design `Menu`. The payoff is direct control over semantics and active state without fighting Ant Design's internal menu state management.

---

### NL-2 — Ant Design v5 CSS-in-JS token specificity requires `style` prop override

**Problem**: `Layout.Header` applies its background colour through Ant Design v5's CSS-in-JS system, which generates scoped class names with higher specificity than any external `.css` class selector. Setting `background` in `Navbar.css` was silently overridden by the generated token styles.

**Decision**: `style={{ background: 'var(--navbar-bg)' }}` is applied directly to the `Header` component as an inline `style` prop. Inline styles have higher specificity than class-based CSS-in-JS generated styles, ensuring the correct colour is applied regardless of Ant Design's internal token cascade.

The `ConfigProvider` at the app root sets `colorPrimary` to the brand indigo (`#4f46e5`), propagating the correct accent colour to all Ant Design interactive components (buttons, focus rings, active states) without per-component overrides.

**Tradeoffs accepted**: The inline `style` on `Header` is a targeted workaround for a known Ant Design v5 specificity characteristic. It is documented here so future contributors understand why a CSS class alone is insufficient.

---

### NL-3 — Stacked breadcrumb pattern instead of `Divider`-separated header

**Problem**: An early iteration of the page header used `Button | Divider | Title + Tag` in a horizontal flex row. Two structural problems:

1. A `Divider` component separates sibling elements of equal visual weight — it is semantically wrong between a navigation action (back button) and a page title (different hierarchy levels)
2. The horizontal layout compressed information at smaller viewports and created visual ambiguity about which elements were interactive

**Options considered**:

- Keep the divider-based layout → visually clean at one viewport width but wrong at others; semantic mismatch
- Use Ant Design `Breadcrumb` component → couples two-level navigation to a text-focused component; provides no navigation action semantics
- Stacked two-line hierarchy → top line is small (12px, grey `#6b7280`): `← Invoices` (navigation); bottom line is large (22px, bold `#111827`): `#invoice_id + StatusTag` (page identity)

**Decision**: All page headers (`InvoiceShow`, `InvoiceCreate`, `InvoiceEdit`) use the same two-line stacked pattern:

```text
← Invoices            (12px, #6b7280, bare <button> with reset styles)
#79682  [Draft]       (22px bold, #111827, + InvoiceStatusTag)
```

The back `<button>` uses inline reset styles (`background: none; border: none; cursor: pointer; padding: 0`) rather than an Ant Design `Button` to avoid the button's horizontal padding and default styling fighting the left-aligned layout.

**Tradeoffs accepted**: The minimal `<button>` requires explicit focus/hover styling if keyboard accessibility is audited. Acceptable for an assessment prototype; in production this would use a proper accessible link or button component.

---

## Visual Design System

### VD-1 — CSS custom properties as a single design token layer

**Problem**: Card backgrounds, shadows, and border radii were duplicated as inline styles across multiple components. A single design update (e.g. adjusting shadow intensity) required hunting down every `boxShadow: '0 2px 8px ...'` occurrence.

**Decision**: Four CSS custom properties defined in `:root` in `App.css`:

```css
--surface-bg: #f0f7f5; /* page background — faint teal tint */
--card-bg: #ffffff; /* card/panel background */
--card-shadow: 0 2px 8px rgba(0, 0, 0, 0.09), 0 0 0 1px rgba(0, 0, 0, 0.04);
--card-radius: 8px;
```

All card-style containers reference these variables. A single change to `App.css` updates the entire app.

The dual-layer shadow (`drop + 1px hairline ring`) was chosen specifically because a single soft drop shadow disappears on near-white backgrounds. The hairline ring acts as a structural border that remains visible at all contrast levels without using an explicit `border` that would alter box dimensions.

**Tradeoffs accepted**: CSS variables are not type-safe. A typo in a variable name silently falls back to the property's initial value. Acceptable at this codebase scale; a design token system (e.g. Style Dictionary) would add compile-time guarantees at larger scale.

---

### VD-2 — Brand palette applied globally via `ConfigProvider`

**Problem**: Ant Design's default primary colour is blue (`#1677ff`), which has no relationship to the app's brand identity. Every interactive element (primary buttons, active link states, focus rings, spinners) appeared in a generic blue — the product had no visual identity of its own.

**Options considered**:

- Per-component colour overrides → duplicates the colour value at every usage site; misses any component not explicitly overridden
- Override via CSS `--ant-color-primary` custom property → not reliable in Ant Design v5 which uses CSS-in-JS; the CSS variable may not exist or be overridden by the token system
- `ConfigProvider` at the app root with `theme.token.colorPrimary` → single declaration; Ant Design's design token system derives all colour variants (hover, active, disabled, focus) automatically from the seed colour

**Decision**: `ConfigProvider` wraps the entire app with:

```tsx
theme={{ token: { colorPrimary: '#4f46e5', colorLink: '#4f46e5', borderRadius: 6 } }}
```

`#4f46e5` is the brand indigo. The navbar uses `#1e1b4b` (a deep indigo) for strong contrast against its white text. The page surface uses `#f4f4fb` — a faint indigo tint that ties the background to the brand palette without competing with the content.

**Tradeoffs accepted**: The indigo accent may cause accessibility contrast issues on light backgrounds with small text. This was not audited for WCAG compliance — acceptable for an assessment prototype.

---

### VD-3 — `InvoiceStatusTag` as shared lifecycle display component

**Problem**: Invoice lifecycle state (`finalized`, `paid`) was rendered in two places — `InvoicesList/structure.tsx` and `InvoiceShow/InvoiceInfo.tsx` — with diverging implementations. The list used two separate `Tag` components with inline colour logic; the detail view used a different colour mapping. Any change to the status semantics required two coordinated edits.

**Options considered**:

- Inline the logic at each call site → already the status quo; two sources of truth
- Render function shared in a `helpers/` file → avoids duplication but returns JSX from a helper, which is an anti-pattern (helpers should be pure, not return React elements)
- Dedicated shared component in `src/ui/` → single source of truth, co-locates the status-to-display mapping, testable in isolation

**Decision**: `src/ui/InvoiceStatusTag/InvoiceStatusTag.tsx` — props: `{ finalized: boolean; paid: boolean }`. Status priority:

- `paid === true` → green `success` tag: "Paid"
- `finalized === true && paid === false` → blue `processing` tag: "Finalized"
- else → default grey tag: "Draft"

The `finalized + paid` combination is encoded in a single visual state (Paid), because from the operator's perspective "Paid" is the terminal state — the finalization is implied. Showing both "Finalized" and "Paid" would require the operator to decode two booleans for one conceptual state.

**Tradeoffs accepted**: The tag encodes a lifecycle, not a set of independent flags. If the API ever introduces states that break the priority assumption (e.g. a draft invoice marked paid), the component would display "Paid" before the invoice is finalized. The API currently prevents this — `paid` changes are only accepted on finalized invoices.

---

## Invoice List

### FL-1 — Status filter via `Segmented` control (F4)

**Problem**: The list showed all invoices regardless of lifecycle state. Financial operators work by status — "show me all unpaid finalized invoices" is a daily workflow, not an edge case.

**Options considered**:

- `Radio.Group` → visually heavier; appropriate for form fields, not list controls
- Dropdown `Select` → requires an extra click to open; adds friction for a primary navigation action
- Ant Design `Segmented` → renders as a button group; full active state is immediately visible at a glance; single click

**Decision**: A `Segmented` control with four options: All / Draft / Finalized / Paid. The "Finalized" tab maps to `finalized=true && paid=false` (i.e. outstanding invoices), not merely `finalized=true`, because "show me finalized but not yet paid" is the operationally meaningful query. Each selection serialises to a JSON array passed to the API `filter` param in the confirmed format `[{"field":"finalized","operator":"eq","value":true}]`. The active filter is persisted in `searchParams` (`?status=finalized`) so the URL is shareable and survives a browser refresh. Changing the filter resets to page 1.

**Tradeoffs accepted**: The "Unpaid" concept (finalized + not paid) is surfaced as "Finalized" rather than adding a fifth tab labelled "Unpaid". Adding "Unpaid" would require the operator to understand that "Finalized" means "outstanding" — this is a documentation problem, not a filtering problem.

---

### FL-2 — Customer filter via `CustomerAutoComplete` (F6)

**Problem**: The API supports `customer_id` equality filtering but the list had no way to narrow by customer. Looking up all invoices for a specific client is a frequent operator workflow.

**Options considered**:

- Free-text input searching by customer name client-side → only applies to the current page; useless for paginated data and misleading to the user
- A separate `/customers/:id/invoices` route → creates a navigation dead-end; the operator loses the status filter and sort context they were in
- `CustomerAutoComplete` above the table → the component already exists (`ui/CustomerAutoComplete`), uses the API's `GET /customers/search?query=` endpoint, debounces via `useDebounceState`, and composes with the status filter seamlessly

**Decision**: `CustomerAutoComplete` (280px, fixed width) placed inline with the `Segmented` control in the filter bar. On customer selection, `{"field":"customer_id","operator":"eq","value":id}` is appended to the filter array alongside any active status filter — both filters are sent in a single API call. Clearing the autocomplete removes the customer filter.

The full `Customer` object is kept in local component state rather than serialised into `searchParams`. The customer name needed to display the selected value in the autocomplete cannot be reconstructed from an ID alone without an extra API fetch, making URL persistence of the customer filter disproportionately complex for the benefit. The page number resets to 1 on customer change.

**Tradeoffs accepted**: The selected customer filter is lost on page refresh (local state, not URL). For a shareable URL that includes the customer filter, the customer name or ID would need to be encoded in `searchParams` and resolved back to a `Customer` object on mount. Deferred — the status filter URL persistence covers the majority of share/bookmark use cases.

---

### FL-3 — Column sorting passed to the API with client-side patch for stale fields (F10)

**Problem**: The list had no sorting. Sorting by deadline (overdue-first) is the primary cash-flow management view for any financial operator.

**Options considered**:

- Client-side sort only → only sorts the current page; wrong for paginated data and actively misleading
- API sort only → correct for `date`/`deadline` fields; incorrect for `total`/`tax` due to BI-1 (API stores stale snapshot values that differ from the client-recalculated values)
- API sort + client-side re-sort for affected fields → API sort is sent for all fields (necessary for cross-page ordering to be as correct as possible given BI-1); after `recalculateInvoiceTotals` runs in `select`, the current page is re-sorted if the active field is `total` or `tax`

**Decision**: `tableColumns` was refactored from a constant to a function taking `(sortField, sortOrder)`, propagating the `sortOrder` prop to each sortable column so Ant Design renders the correct direction indicator. All table interactions (page navigation, page size, sort) are consolidated into a single `Table.onChange` handler (`handleTableChange`). This is the correct pattern — Ant Design fires `Table.onChange` for all interactions; wiring separate `pagination.onChange` and `pagination.onShowSizeChange` callbacks alongside `Table.onChange` creates a split-brain where both handlers compete.

The API `sort` format `+field` / `-field` is derived from Ant Design's `ascend`/`descend` values. Sort state is persisted in `searchParams` (`?sortField=deadline&sortOrder=descend`) and included in the `queryKey`. Changing the sort column resets to page 1.

The client-side re-sort for `total`/`tax` is tracked in `CLIENT_SORTED_FIELDS` and documented with a `TODO: Remove once backend fixes BI-1` comment. See `backend_issues.md` § BI-1 and BI-2.

**Tradeoffs accepted**: Cross-page ordering for `total`/`tax` remains incorrect until BI-1 is fixed — the API returns pages sorted by stale values, and there is no client-side solution for cross-page ordering without fetching all pages simultaneously. Within-page ordering is correct after the client-side patch.

---

### FL-4 — Configurable page size persisted in URL

**Problem**: The list was fixed at 10 rows. For operators reviewing large batches, 10 rows requires excessive pagination. For operators on smaller screens, 10 rows may already be too many.

**Options considered**:

- Fixed page size → simplest; poor ergonomics for batch review workflows
- Local state → chosen size lost on refresh or navigation, forces the operator to re-select after every context switch
- `searchParams` → size persisted in the URL; survives refresh; shareable; consistent with how page, status, and sort are already managed

**Decision**: `perPage` is read from `searchParams` with `DEFAULT_PAGE_SIZE = 10` as fallback. Ant Design's `showSizeChanger` renders the page size dropdown natively in the pagination row — no additional component. `pageSizeOptions = [10, 25, 50, 100]`. The `queryKey` includes `perPage` so each size has its own cache slot — switching from 10 to 25 does not flash stale 10-row data. Changing the page size resets to page 1 (via the `pageSize !== perPage` guard in `handleTableChange`).

**Tradeoffs accepted**: The `per_page` API parameter has no documented maximum. Values above 100 could produce slow responses or be rejected depending on server-side guards. The UI caps at 100, which is a reasonable upper bound for a paginated financial list.

---

## Form UX & Navigation Guard (F8)

### FU-1 — `BrowserRouter` → `createBrowserRouter` to enable `useBlocker`

**Problem**: React Router's `useBlocker` hook only works inside a data router context. The app was using `BrowserRouter` (legacy router), which does not expose the data router APIs. Calling `useBlocker` inside `BrowserRouter` throws at runtime.

**Options considered**:

- Wrap `BrowserRouter` with a custom history listener → possible but requires re-implementing what the data router already provides; not forward-compatible
- Use `createBrowserRouter` + `RouterProvider` → first-class data router; all v7 APIs (`useBlocker`, `useFetcher`, loaders, actions) are available; the migration is mechanical — routes move from JSX to a config array

**Decision**: Migrated `App.tsx` from `<BrowserRouter><Routes>` to `createBrowserRouter([...])` + `<RouterProvider>`. A `RootLayout` component renders `<Outlet>` inside the existing `Layout` shell, so the navbar and page structure are unchanged. All route definitions are co-located in the router config array.

**Tradeoffs accepted**: The data router does not support JSX-defined `<Route>` elements inside `RouterProvider`. The route config must be the flat array format. This is the direction of React Router v7 in general and is not a regression.

---

### FU-2 — `useBlocker(BlockerFunction)` with `skipBlockerRef` to avoid race condition on save

**Problem**: After a successful save, the mutation's `onSuccess` callback calls `navigate('/invoices')`. At that exact moment, the form's `isDirty` is still `true` — `reset(data)` schedules a React re-render asynchronously, but `navigate()` is synchronous. The blocker therefore fires immediately after save, showing the "Unsaved changes" modal to a user who just saved.

**Options considered**:

- `useBlocker(isDirty)` (boolean form) → simple, but evaluates `isDirty` at render time via a stale closure; does not solve the race condition because `isDirty` has not flipped to `false` yet when the navigate fires
- `useBlocker(fn)` with `isDirty` read from a `useRef` → the ref is updated synchronously on every render so it always reflects the latest value; still vulnerable to the race if the navigate precedes the re-render
- `useBlocker(fn)` with `isDirtyRef` + `skipBlockerRef` → two refs: one mirrors `isDirty` for real-time reads; the other (`skipBlockerRef`) is set to `true` synchronously in `onSaveSuccess`, before the navigate and before React flushes the `reset()` update; the `BlockerFunction` returns `false` immediately when the skip flag is set

**Decision**: `const shouldBlock: BlockerFunction = useCallback(() => isDirtyRef.current && !skipBlockerRef.current, [])`. The `skipBlockerRef` is set in the `onSaveSuccess` callback that the parent (InvoiceCreate / InvoiceEdit) calls synchronously inside `onSuccess` before navigating. Because the ref write and navigate both happen in the same synchronous tick, the blocker reads the updated ref and does not fire.

**Tradeoffs accepted**: `skipBlockerRef` is a one-way flag — it is never reset to `false` after being set. This is correct: once save is confirmed, the form is clean and navigation should never be blocked again. A new form render for a different invoice starts fresh with a new component instance and a new ref.

---

### FU-3 — `onSaveSuccess` callback pattern to defer `reset()` until API confirmation

**Problem**: An earlier implementation called `reset(data)` immediately after `handleSubmit` ran (before the API call). This meant the form was marked clean instantly — if the API call subsequently failed, the blocker would no longer protect the dirty state, and the user could navigate away without any warning even though the save had failed.

**Options considered**:

- `reset(data)` on submit → form loses its dirty guard before success is confirmed; data loss is possible if the API rejects
- `reset(data)` in mutation `onSuccess` directly → correct timing; but the `reset` call was in the child `InvoiceForm` while the mutation lived in the parent; bridging them required either lifting state or a callback
- `onSaveSuccess` callback passed through `onSave(data, onSaveSuccess)` → `InvoiceForm` passes a closure; the parent stores it in a `useRef` and calls it inside `onSuccess`; `reset` fires only when the API confirms success

**Decision**: `InvoiceForm` signature: `onSave: (data: InvoiceFormValues, onSaveSuccess: () => void) => void`. The parent stores `onSaveSuccess` in `onSaveSuccessRef.current` inside `onSave`, then calls `onSaveSuccessRef.current?.()` in the mutation `onSuccess`. `reset(data)` and `skipBlockerRef.current = true` both live inside `onSaveSuccess`.

**Tradeoffs accepted**: The parent (`InvoiceCreate`, `InvoiceEdit`) must reliably call `onSaveSuccess`. Forgetting to call it would leave `skipBlockerRef` unset and block post-save navigation. This is a contract enforced by the JSDoc comment on the prop.

---

### FU-4 — Explicit `onCancel` prop instead of `navigate(-1)` to prevent blocker bypass via POP

**Problem**: The original "Cancel" button called `navigate(-1)` (browser Back). React Router's `useBlocker` intercepts PUSH and REPLACE navigations but POP navigations (back/forward) can partially bypass the blocker. During testing, clicking Cancel on the create page did not trigger the unsaved-changes modal.

**Options considered**:

- Keep `navigate(-1)` and rely on the blocker → inconsistent behaviour depending on how the user arrived at the page; not reliable
- Replace with `navigate('/invoices')` inside `InvoiceBottomBarAction` → works but hardcodes the destination inside a generic UI component
- Pass `onCancel` as a prop from the page-level component (`InvoiceCreate`, `InvoiceEdit`) → each page controls its own cancel destination; the form component stays generic; the navigation is a PUSH which the blocker intercepts normally

**Decision**: `InvoiceBottomBarAction` now accepts `onCancel: () => void`. `InvoiceCreate` passes `() => navigate('/invoices')`; `InvoiceEdit` passes `() => navigate('/invoices/${invoice.id}')`. All `navigate(-1)` calls were deleted.

**Tradeoffs accepted**: Each page component must provide an `onCancel` handler — a one-line addition at each call site. The benefit is predictable blocker behaviour and correct destination on cancel.

---

### FU-5 — Dirty field visual indicator via `FieldLayout` `isDirty` prop

**Problem**: With the blocker in place, operators know they have unsaved changes — but there was no way to see at a glance which specific fields had been modified. All fields looked identical whether they had been touched or not.

**Options considered**:

- Highlight the entire form section on any change → too coarse; provides no per-field context
- Custom `FormItem` wrapper per field type → duplicates the indicator logic across CustomerField, DateInputField, etc.
- Single `isDirty` prop on `FieldLayout` (the common wrapper already used by all fields) → one implementation, all fields pick it up automatically

**Decision**: `FieldLayout` accepts `isDirty?: boolean`. When true, a 3px amber (`#f59e0b`) left border is applied to the field container. Each field component reads `fieldState.isDirty` from `useController` and passes it to `FieldLayout`. In edit mode a legend is shown (amber bar "Modified", red bar "Will be removed") to define the visual language without relying on colour alone.

**Tradeoffs accepted**: `fieldState.isDirty` from React Hook Form compares the current value against the `defaultValues` baseline set at form initialisation. If default values change (e.g. after a re-fetch), the dirty baseline resets. This is correct default behaviour for a form that loads server data.

---

### FU-6 — `_destroy` flag for soft-deleting existing invoice lines

**Problem**: Removing an existing line immediately via `remove()` from `useFieldArray` left no way to undo the removal in the same editing session, and gave no visual confirmation of what would be deleted before save.

**Options considered**:

- Immediate remove + undo toast → adds optimistic-undo complexity; still requires the translator to diff against the original invoice to compute which lines need `_destroy: true`
- Two-phase: flag then confirm → mark lines with `_destroy: true` in form state; render them greyed-out with a Restore button; send `_destroy: true` to the API only on final save

**Decision**: `_destroy: boolean` was added to the Yup schema with conditional validation: when `_destroy: true`, `product` and `quantity` validations are bypassed. The at-least-one-line `.test()` counts only non-destroyed lines. In `InvoiceLinesFields`:

- New lines (no `id`) are removed immediately on "Remove" (no server record to track)
- Existing lines (with `id`) toggle `_destroy` via `setValue(..., !current, { shouldDirty: true })`

`InvoiceLineFields` receives `isDestroyed: boolean` as a prop and renders per-cell opacity (`0.35`) on all data cells (the action cell is excluded so the Restore button stays fully visible). A red (`#ef4444`) left border on the `<tr>` mirrors the amber border language used for modified fields.

The translator (`transformFormValuesToAPI`) was simplified: the form carries the full intent; no diff against the original invoice is needed. The previous `computeDiffLines` function was deleted.

**Tradeoffs accepted**: `isDestroyed` is passed as a prop rather than subscribed via `useWatch` inside the row component. The parent `InvoiceLinesFields` already holds the value via `useFieldArray`; passing it down avoids a redundant subscription on every line.

---

## Ant Design v5 Compatibility

### AD-1 — Static `Modal.confirm()` → `App.useApp()` hook pattern

**Problem**: `Modal.confirm()` called as a static function cannot consume React context — it renders outside the React tree in a separate portal with no access to `ConfigProvider` (theme tokens, locale). Ant Design v5 issues a console warning: `[antd: Modal] Static function can not consume context like dynamic theme`. The modal rendered in the default blue theme instead of the app's configured indigo.

**Options considered**:

- Ignore the warning → modal renders in wrong theme; warning pollutes the console; static functions may be removed in a future Ant Design major
- Use `useModal()` directly → requires a `[modal, contextHolder]` pair and a `contextHolder` element in JSX at every consumer
- Use `App.useApp()` inside an `<App>` provider → single provider at the root; any component in the tree calls `const { modal } = App.useApp()` and gets a context-aware instance; no per-component `contextHolder`

**Decision**: `<App>` (imported as `AntApp` to avoid name collision) wraps `<RouterProvider>` in `App.tsx`. `InvoiceForm` and `InvoiceInfo` both replaced `Modal.confirm(...)` with `const { modal } = App.useApp()` and `modal.confirm(...)`.

**Tradeoffs accepted**: Every component needing `modal`/`message`/`notification` must be a descendant of `<AntApp>`. The entire app renders inside it, so this is not a constraint in practice.

---

### AD-2 — `bordered={false}` → `variant="borderless"` and `labelStyle` → `styles={{ label }}`

**Problem**: Ant Design v5 deprecated two props in `CustomerDetails.tsx`: `Card` `bordered={false}` (replaced by `variant="borderless"`) and `Descriptions` `labelStyle` (replaced by `styles={{ label: ... }}`). Both produced deprecation warnings on every render.

**Decision**: Mechanical prop renames at the affected call sites. No behavioural change.

---

### AD-3 — Missing `rowKey` on `InvoiceLines` table

**Problem**: The `InvoiceLines` table in `InvoiceShow` used Ant Design `Table` without a `rowKey` prop, causing `[antd: Table] Each record in table should have a unique \`key\` prop` warnings and degrading React reconciliation.

**Decision**: `rowKey="id"` added to the `Table` component. Invoice line `id` is a stable, unique integer returned by the API.

---

## Date Handling

### DH-1 — `Date.toISOString()` → `dayjs().format()` in `formatDateForApi` to fix UTC offset

**Problem**: `formatDateForApi` used `date.toISOString().split('T')[0]`. `Date.toISOString()` converts to **UTC** before formatting. A user in UTC+1 selecting "01/03/2026" gets a `Date` representing midnight local time (`2026-03-01T00:00:00+01:00`). `.toISOString()` converts this to `2026-02-28T23:00:00Z`, splitting on `T` produces `"2026-02-28"` — one day earlier. The backend stores the wrong date.

**Options considered**:

- Manual timezone offset: `new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0]` → works but reimplements what `dayjs` already does correctly
- `dayjs(date).format('YYYY-MM-DD')` → stays in local time throughout; correct for all timezones; consistent with `dayjs` usage everywhere else in the codebase

**Decision**: `formatDateForApi` now uses `import dayjs from 'dayjs'` and returns `dayjs(date).format('YYYY-MM-DD')`.

---

### DH-2 — Cross-field deadline validation: deadline must not precede issue date

**Problem**: No constraint prevented setting a deadline earlier than the issue date — a logically invalid invoice. The backend did not enforce this constraint either, so invalid invoices could be stored silently.

**Options considered**:

- Validate only on submit → allows traversing the form in an invalid state; error appears late
- Live validation via `mode: 'onChange'` + Yup cross-field ref → constraint evaluated on every change; error appears the moment the deadline becomes invalid
- DatePicker `disabledDate` / `minDate` only → prevents selection in the picker but provides no validation message and no guard against programmatic values

**Decision**: Two layers of enforcement:

1. **Schema**: `deadline: yup.date().min(yup.ref('issueDate'), 'Deadline cannot be earlier than the issue date')` — blocks form submission and shows a validation error inline.
2. **DatePicker**: `InvoiceDateFields` subscribes to `issueDate` via `useWatch` and passes it as `minDate` to the deadline `DateInputField`. The Ant Design `DatePicker` greys out all dates before the issue date, preventing selection at the UI level.

**Tradeoffs accepted**: If the operator has not yet set an issue date, `minDate` is `undefined` and the picker applies no constraint. Once the issue date is set, the picker immediately restricts the available range. The schema enforces the constraint at submit regardless of picker state, so no invalid invoice can be saved even if the picker was never restricted.

---

## Number Formatting & Financial Display

### NF-1 — `formatAmount` accepts `string | number`; `Big` only for arithmetic

**Problem**: Call sites throughout the app were doing `formatAmount(new Big(apiString).toNumber())` for single API values that needed no arithmetic — just display. `new Big(x).toNumber()` on an isolated value is a no-op: `Big` provides precision guarantees during **operations** (multiplication, addition); converting a single string through `Big` and back to a float before handing it to `Intl.NumberFormat` adds complexity with zero benefit.

**Options considered**:

- Keep `formatAmount(number)` and require all call sites to produce a `number` → callers must decide how to convert; the `Big(Number(x))` anti-pattern reappears whenever a caller reaches for convenience
- Keep `formatAmount(number)` and require `new Big(string).toNumber()` at every call site → correct, but verbose and falsely implies precision work is happening
- Accept `string | number` in `formatAmount`, use `Number()` for the parse inside → single conversion point; string call sites pass the API value directly; the helper's comment documents the design intent explicitly

**Decision**: `formatAmount` signature changed to `(value: string | number): string`. `Number(value)` inside the helper is the correct parse for display-only conversion — no accumulation, no operations, no precision risk. `Big` is reserved for and exclusively used at sites where arithmetic occurs:

- `new Big(unit_price).times(quantity)` — multiplication of two decimal strings
- `lines.reduce((sum, line) => sum.plus(new Big(line.price)), new Big(0))` — summing across lines

`Big` was removed from `InvoicesList/structure.tsx` entirely (the file no longer imports it), and the redundant wrapping was removed from `InvoiceShow/structure.tsx` and `InvoiceLineFields.tsx`.

**Tradeoffs accepted**: `Number("1234.50")` for a display-only conversion is correct and safe. The only risk would be if this value were used in further arithmetic after the conversion — but `formatAmount` is a terminal formatting function; its return value is a display string. There is no downstream arithmetic. The design intent is documented in a comment in `formatAmount.ts`.

---

### NF-2 — VAT rate display: `product.vat_rate` suffixed with `%`

**Problem**: The invoice detail table showed no VAT rate column. The `InvoiceLine` schema exposes `vat_rate` at both the line level and the nested `product` level. The line-level `vat_rate` is what was actually applied when the invoice was created; the `product.vat_rate` is the product's current default, which may have changed since.

**Decision**: A **VAT Rate** column was added to `InvoiceShow/structure.tsx` between Unit and Unit Price, rendering `line.product.vat_rate` as a percentage string (e.g. `"20%"`). The `product.vat_rate` field is typed as `VatRate = "0" | "5.5" | "10" | "20"` — a string enum — so `${product.vat_rate}%` produces the correct display without any numeric conversion. The same `%`-suffix pattern is used in `InvoiceLineFields.tsx` for the live form preview.

The summary row `colSpan` and cell indices in `InvoiceLines.tsx` were updated from 4→5 to account for the new column (now 7 columns total: Item, Quantity, Unit, VAT Rate, Unit Price, Line Total, Tax).

**Tradeoffs accepted**: Using `product.vat_rate` from the nested product rather than the line-level `vat_rate` risks showing a stale value if the product's VAT rate has been updated since the invoice was created. The line-level `vat_rate` field is the correct authoritative source for what was actually applied. This is a known limitation to revisit if the API confirms the line-level field is always populated correctly at invoice creation time.

---

## Invoice List Actions

### LA-1 — Per-row action menu in the list table

**Problem**: The list table had no inline actions — every operation (finalize, delete, mark paid) required navigating to the detail view first. For operators processing batches of invoices, this round-trip per action is a significant friction cost.

**Options considered**:

- Inline buttons per row → too wide; each invoice has up to four contextual actions depending on state; button columns don't scale
- Row click opens a context menu → non-discoverable; no visual affordance that actions exist
- Fixed action column with a `•••` dropdown → single 48px column; all actions behind one click; the `MoreOutlined` icon is a universally understood affordance for overflow actions

**Decision**: `InvoiceRowActions` renders a `Dropdown` triggered by a `MoreOutlined` button in the first column (48px fixed width). Menu items are built conditionally based on invoice state:

- `!finalized` → **Edit** (`EditOutlined`), **Finalize** (`LockOutlined`, gated by `modal.confirm`), **Delete** (`DeleteOutlined`, danger, gated by `modal.confirm`)
- `finalized && !paid` → **Mark as paid** (`CheckOutlined`)
- `finalized && paid` → **Mark as unpaid** (`CloseOutlined`)
- Always, behind a divider → **Use as template** (`CopyOutlined`)

The trigger button and the action cell both call `e.stopPropagation()` so the row's `onRow` click-to-navigate handler is not also fired when the menu is used.

The same mutation hooks already used by `InvoiceShow` (`useFinalizeInvoice`, `useDeleteInvoice`, `useTogglePaid`) are instantiated in `InvoicesList` and passed as callbacks — no new API wiring was needed.

**Tradeoffs accepted**: `useDeleteInvoice` accepts an `onSuccess` callback (used in the detail view to navigate away after deletion). In the list context no navigation is needed — the query invalidation removes the row. An empty `onSuccess: () => {}` is passed, which is a minor leakiness in the hook's interface.

---

### LA-2 — "Use as template" via router state

**Problem**: Operators frequently create recurring invoices for the same customer with the same products. Without a template flow, each new invoice requires re-selecting customer, re-adding every line, and re-entering quantities from scratch.

**Options considered**:

- Duplicate via API (clone endpoint) → the API has no clone endpoint; would require creating a full invoice then redirecting to edit it, adding unnecessary draft records
- Store template in global state (context/store) → shared mutable state for a navigation-scoped intent is overreach; the data is only needed for the duration of one create flow
- Pass via `useNavigate` router state → `navigate('/invoices/new', { state: { template: invoice } })` delivers the source invoice to the create page within the navigation event; the state is scoped to that single render, not persisted anywhere

**Decision**: `navigate('/invoices/new', { state: { template: invoice } })` is called from both the list row action menu and the detail view's action bar (`InvoiceInfo`). `InvoiceCreate` reads `location.state.template` via `useLocation` and passes it to `buildTemplateValues`, which produces:

- `customer` — copied from the source invoice
- `invoice_lines` — mapped from `invoice_line.product` (the innermost product object, not any snapshot field) with `id: undefined` so `handleToggleDestroy` treats them as new unsaved lines
- `issueDate` / `deadline` — intentionally omitted; the operator must set fresh dates for the new invoice

The resulting `Partial<InvoiceFormValues>` is passed as `overrideDefaultValues` to `InvoiceForm`, which takes priority over the standard `useInvoiceFormDefaultValues(null)` derivation. The page title updates to "New Invoice (from template)" to signal the pre-fill to the operator.

**Tradeoffs accepted**: Router state is lost on a hard refresh of `/invoices/new`. If the operator refreshes mid-fill, the form renders empty. This is acceptable — the template flow is a convenience shortcut, not a durable saved state. A full refresh implies intent to start fresh.

---

## I2 — Stale-while-revalidate with `staleTime: 30 000 ms`

**Context**: By default TanStack Query v5 treats every query as instantly stale (`staleTime: 0`), triggering a background refetch on every `focus` or `mount` event. For a financial operator working across multiple browser tabs or returning to the invoice list after editing, this causes visible loading flickers and unnecessary API traffic even when the data has not changed.

**Decision**: Set a global `staleTime: 30_000` (30 seconds) in `reactQueryConfig.ts`.

Within the 30-second window, cached data is served immediately with no background refetch — the list renders instantly. After 30 seconds, the query is stale and will refetch in the background on next mount/focus, keeping data fresh without blocking the UI.

`invalidateQueries` in every mutation (`onSuccess`) marks the relevant query stale immediately regardless of `staleTime`, so the operator always sees up-to-date data after any create, update, finalize, or delete. The 30-second window only suppresses redundant refetches when no mutation has occurred.

**Alternatives considered**:

- `staleTime: Infinity` — data never refetches passively; requires discipline to invalidate every relevant query on every mutation. Too fragile for a financial domain where stale totals or statuses have real consequences.
- Per-query `staleTime` — adds noise without meaningful benefit given that all queries here have similar freshness requirements.

**Tradeoffs accepted**: A mutation that is not followed by `invalidateQueries` (e.g. a future mutation added without the pattern) would leave stale data visible for up to 30 seconds. Documented as a code-review checklist item: every `useMutation` must invalidate its affected query keys in `onSuccess`.

---

## I3 — Per-route error boundaries via React Router `errorElement`

**Context**: Without error isolation, a JavaScript exception thrown during render in any route component (e.g. a null-deref in `InvoiceShow`) propagates to the root React tree, unmounting the entire app — including the Navbar — and leaving the operator on a blank screen with no way to navigate away without a full page reload.

**Decision**: Declare a single `errorElement: <RouteErrorBoundary />` on an intermediate pathless route that wraps all navigable routes in `App.tsx`. React Router's native error boundary mechanism catches any throw from a child route and renders the error UI in the content area while the parent `RootLayout` (Navbar + Layout) remains mounted.

`RouteErrorBoundary` is a function component that uses `useRouteError()` to read the caught value and `isRouteErrorResponse()` to distinguish HTTP-level route errors (404, 401) from JavaScript exceptions. It renders an Ant Design `Result` with a "Back to invoices" button so the operator can recover without losing their session.

**Why not a class component**: React Router's `errorElement` is caught by the framework, not by React's `componentDidCatch` lifecycle. A function component with `useRouteError()` is the idiomatic React Router v7 approach and avoids the boilerplate of `getDerivedStateFromError` + `setState`.

**Why one intermediate route, not one `errorElement` per route**: Repeating `errorElement` on every route declaration is DRY-violating and maintenance-prone. A single intermediate pathless route (`{ errorElement, children: [...routes] }`) achieves the same isolation with one declaration. The Navbar stays mounted because the parent route (`RootLayout`) is unaffected by a child's error.

**Tradeoffs accepted**: All child routes share the same error fallback UI. If a specific route required a tailored error screen (e.g. a 404 page for unknown invoice IDs), it would need its own `errorElement` override. Not required for the current feature set.

---

## Testing

### T-1 — `.spec.ts` co-located files over `.test.ts` + `__tests__` directories

**Problem**: Two conventions exist for Jest test file placement in a React codebase: (a) co-located `.spec.ts`/`.test.ts` files next to the source file, and (b) a sibling `__tests__` directory that groups test files away from production code. A third dimension is the suffix itself: `.spec.ts` vs `.test.ts`.

**Options considered**:

1. `__tests__/formatAmount.test.ts` — segregated directory, `.test.ts` suffix
2. `formatAmount.test.ts` co-located — `.test.ts` suffix, same directory as source
3. `formatAmount.spec.ts` co-located — `.spec.ts` suffix, same directory as source ← **chosen**

**Decision**: Co-located `.spec.ts` files — consistent with the convention established in the initial commit (`InvoicesList/index.spec.tsx`) and reinforced by the test infrastructure folder name (`src/specs/`). All new test files follow the same convention.

**Why co-location beats `__tests__` directories**:

The `__tests__` folder pattern originates from older Jest documentation and is more common in Node.js/Angular codebases. The dominant modern React convention — evidenced by CRA, Vite, Next.js starter templates, React Testing Library documentation, and Kent C. Dodds' Testing JavaScript course — is **co-location**. Keeping `formatAmount.spec.ts` next to `formatAmount.ts` means:

- The test is found instantly when the source is open; no directory traversal required.
- Deleting a feature deletes its test automatically — there is no orphan file left in a separate folder.
- The module boundary is explicit: a spec file next to its source signals "this module is covered"; an absent spec file signals "this module has no tests yet".
- `__tests__` directories create an artificial split that forces the reader to mentally map `__tests__/X.test.ts` → `src/X.ts` — indirection with no payoff.

**Why `.spec.ts` rather than `.test.ts`**:

Both suffixes are matched by Jest's default `testMatch` glob (`**/?(*.)+(spec|test).[jt]s?(x)`) with no configuration change required. The choice is purely stylistic. `.test.ts` is the CRA default for new files; `.spec.ts` is the Angular CLI default and common in RSpec-influenced projects. Neither is technically superior.

The deciding factor here is **consistency with the existing codebase**: the initial commit contained `InvoicesList/index.spec.tsx`. Introducing `.test.ts` files would create a mixed convention that no linter enforces and every contributor must remember. A codebase with one naming pattern — regardless of which pattern — is always preferable to one with two.

**Tradeoffs accepted**: Developers who prefer `.test.ts` + `__tests__` (a legitimate preference) will encounter a different convention than their muscle memory expects. The inconsistency cost of switching mid-project outweighs the preference alignment.

---

### T-2 — MSW for all API mocking, never `jest.mock()` on modules

**Problem**: Tests need to simulate API success and failure states without real network calls. Three strategies are available: mock the API client module with `jest.mock()`, spy on generated client methods directly, or intercept at the network layer with MSW.

**Options considered**:

- `jest.mock('api')` → tests only verify that a specific client method was called with specific arguments; they don't exercise the hook's `onSuccess`/`onError` branches through the real TanStack Query state machine
- Spy on client methods → same problem; also brittle against internal refactors of how the client is constructed
- MSW (`msw/node` + `setupServer`) → intercepts at the `fetch` level; the hook runs its exact production code path; the test only controls what the server returns

**Decision**: MSW throughout. `src/specs/mocks/server.ts` uses `setupServer()` from `msw/node` and registers handlers per test via `server.use()`. `server.resetHandlers()` runs in `afterEach` to prevent handler leakage. A thin `mockEndpoint` helper covers the common case (endpoint by `operationId`, no path params, fixed response). For path-param endpoints (`PUT /invoices/:id`, `DELETE /invoices/:id`) MSW is used directly with a wildcard — `http.put(\`${serverBaseURL}/invoices/:id\`, handler)`— because`mockEndpoint` requires path params to be bound to specific values.

**Why this matters for financial workflows**: A toast-error test backed by `jest.mock` proves a component called `toast.error()` when a mock function threw. A test backed by MSW proves the real pipeline — `fetch` failure → TanStack Query `onError` → `ToastContext` → visible DOM text — works end-to-end. The latter catches integration gaps the former can never find.

**Tradeoffs accepted**: MSW setup is heavier than `jest.mock`. The `server.ts` file must be maintained alongside the API schema. Worth it — the tests exercise what users actually experience.

---

### T-3 — `testUtils.tsx` as the single render entry point; `createTestWrapper` for cache-access tests

**Problem**: Every component/hook test needs the same provider stack: `ApiProvider`, `QueryClientProvider`, `ToastProvider`, `AntApp`, `MemoryRouter`. Written inline per test, this creates noise and drift — one file forgetting `AntApp` silently breaks all modal assertions.

**Options considered**:

- Compose providers ad hoc per test → inconsistent; `AntApp` (required for `App.useApp()` / `modal.confirm`) gets forgotten
- Single shared `AllTheProviders` wrapper with a `customRender` override → one file to update when providers change; all test imports sourced from `specs/testUtils`
- `createTestWrapper()` factory for cache-inspection tests → some tests (`useTogglePaid` optimistic update) need to seed the React Query cache before a mutation and read it back after; `AllTheProviders` uses a `useState`-stabilised `QueryClient` that is opaque to the test; `createTestWrapper()` returns `{ queryClient, Wrapper }` — same provider tree, `QueryClient` exposed for direct `setQueryData`/`getQueryData` calls

**Decision**: `src/specs/testUtils.tsx` re-exports everything from `@testing-library/react`, replaces `render` and `renderHook` with versions that default to `AllTheProviders`, exports `createTestWrapper()` for cache-access tests, and re-exports `userEvent` from `@testing-library/user-event`.

`AllTheProviders` uses `useState(createTestQueryClient)` — not a module-level `new QueryClient()`. This ensures the `QueryClient` is created once per test mount (stable across re-renders within a test) but fresh for every new test (no cached state leaks between tests).

**Why `AntApp` wrapper is required**: Ant Design v5's `modal.confirm` and `notification.useNotification` are driven by React context injected by `<App>` (antd). Without this wrapper, `App.useApp()` returns no-op stubs — no modals or notifications appear in JSDOM. Every mutation hook and action component in this codebase calls `App.useApp()`. Adding it once to the shared wrapper means no test can silently miss it.

**Tradeoffs accepted**: Tests that need a data router (`InvoiceCreate` due to `useBlocker`) must construct their own wrapper from the exported primitives and cannot use the shared `render`. This is the only exception; see T-5.

---

### T-4 — CSS and image files stubbed via `moduleNameMapper`, not via transform

**Problem**: When Jest imports a component that imports a `.css` file (e.g. `FloatingActionButtonContainer.tsx`), ts-jest throws `SyntaxError: Unexpected token '.'` because it cannot parse CSS. This only surfaced when CSS-importing components appeared in the render tree of integration tests — earlier hook tests were unaffected.

**Options considered**:

- `identity-obj-proxy` → standard CRA approach for CSS Modules; returns the property name as a string; unnecessary here since no component uses `styles.foo` class-name access
- Empty object stub file → simpler; `className="fab-container"` still receives a string (irrelevant to RTL queries); zero overhead
- CSS via a custom `transform` entry → slower (runs per file); the `moduleNameMapper` approach runs at module resolution time

**Decision**: `src/specs/mocks/styleMock.js` returns `{}`. Mapped in `jest.config.ts` for all `.css`, `.less`, `.scss`, `.sass`, image, and font extensions. RTL tests query by ARIA role, label, and text content — never by CSS class name — so the stub has zero behavioral impact.

**Tradeoffs accepted**: A test asserting `toHaveClass('fab-container')` would receive an empty-string class and fail. This is not a risk — class-name assertions are an RTL anti-pattern and do not appear in this test suite.

---

### T-5 — `InvoiceCreate` uses `createMemoryRouter` + `RouterProvider`; shared `MemoryRouter` is insufficient

**Problem**: `InvoiceForm` calls `useBlocker` from React Router's Data Router API. `MemoryRouter` (legacy component-based router used in `testUtils.tsx`) does not implement Data Router interfaces and throws when `useBlocker` is invoked inside it.

**Options considered**:

- Switch `testUtils.tsx` to `createMemoryRouter` globally → breaks all tests relying on current `MemoryRouter` URL/navigation behaviour; large migration blast radius
- Mock `useBlocker` → tests would no longer cover any guard behaviour at all
- Surgical `createMemoryRouter` in the specific test file → only the one file that needs the Data Router API pays the setup cost

**Decision**: `InvoiceCreate/index.spec.tsx` does not import `render` from `testUtils`. It calls `@testing-library/react`'s `render` directly with a locally constructed `createMemoryRouter` + `RouterProvider` tree, using the same providers as `AllTheProviders` but replacing `MemoryRouter` with `RouterProvider`. `createTestQueryClient` and `serverBaseURL` are imported from `testUtils` and `server` to avoid duplicating configuration.

This is the correct boundary: `testUtils` handles 95% of tests; the 5% that need the Data Router API construct their own wrapper from the exported primitives.

**Tradeoffs accepted**: The `InvoiceCreate` spec has more boilerplate than other component tests. Any future form that uses `useBlocker` should follow this same pattern.

---

### T-6 — Coverage gap batch: `WithInvoice` HOC, `InvoiceShow`, `InvoiceEdit`, `Navbar`

**Problem**: After the previous testing session, four areas remained at 0% statement coverage in the V8 HTML report:

- `src/hocs` (`WithInvoice.tsx`) — the HOC shared by `InvoiceShow` and `InvoiceEdit`; three distinct branches (loading, not found, success) untested
- `src/app/components/InvoiceShow` — 51.61% overall; `CustomerDetails.tsx` and `InvoiceLines.tsx` entirely uncovered
- `src/app/components/InvoiceEdit` — 0%; the edit form and its breadcrumb untested
- `src/ui/Navbar` — 0%; the static nav link untested

`App.tsx` (browser router config + Ant Design `ConfigProvider`) and `src/types` (zero runtime code, pure TypeScript interfaces) were assessed and deliberately excluded — there is no meaningful behaviour to assert.

**Decision**: Four co-located spec files were added, one per affected area:

**`src/hocs/WithInvoice.spec.tsx`** — tests the HOC in isolation using a `TestChild = ({ invoice }) => <div>Invoice #{invoice.id}</div>` component to decouple HOC behaviour from the real `InvoiceForm` complexity. Three tests cover:

1. Loading state: `delay('infinite')` in MSW → `screen.findByText('Loading...')`
2. Invalid id (non-numeric): `skipToken` branch → `screen.getByText('Invoice not found')`
3. Success: MSW returns `makeInvoice({ id: 42 })` → `screen.findByText('Invoice #42')`

**`src/app/components/InvoiceShow/index.spec.tsx`** — renders the real `InvoiceShow` (which is `withInvoice(InvoiceShow)`) to exercise the full component tree including `CustomerDetails` and `InvoiceLines`. Three tests:

1. Customer details: verifies name + country rendered from the `customer` nested object
2. Invoice lines + summary row: verifies product label column and the "Totals" summary row from `InvoiceLines`
3. No customer: `customer: undefined` on the invoice fixture → "No customer details available" fallback

**`src/app/components/InvoiceEdit/index.spec.tsx`** — renders `InvoiceEdit` (also `withInvoice(InvoiceEdit)`) with `beforeEach` MSW handlers for `getSearchCustomers` and `getSearchProducts` (both fire on mount in `InvoiceForm`). Two tests:

1. Heading and breadcrumb: `makeInvoice({ id: 77 })` → "Edit Invoice" heading + "Invoice #77" breadcrumb button
2. Pre-filled form values: verifies the quantity spinbutton has the value from the fixture line item

**`src/ui/Navbar/Navbar.spec.tsx`** — uses standard `testUtils.render` (no route params needed). One test verifying the brand text "InvoiceApp" and the "Invoices" nav link are present.

**Why all four files use `createMemoryRouter` + `RouterProvider` (not `testUtils.render`)**:

`WithInvoice` calls `useParams()` — extracting `:id` from the URL — which requires a route context that binds the segment pattern (e.g. `/invoices/:id`) to an actual value (e.g. `42`). `MemoryRouter` with `<Route>` JSX would work, but `InvoiceEdit` also needs the Data Router API for `useBlocker` (identical to the T-5 decision). Using `createMemoryRouter` consistently across all four files avoids a mixed convention — any component rendered through `WithInvoice` must always be mounted inside a Data Router route.

**JSDOM string value issue (fixed in `InvoiceEdit`)**: The initial test for the pre-filled quantity used `toHaveValue(1)` (number). JSDOM returns all `input.value` as strings regardless of `type="number"`. Ant Design's `InputNumber` renders a `role="spinbutton"` input where `@testing-library/jest-dom`'s `toHaveValue` matcher receives the string `"1"`, not the number `1`. Fixed to `toHaveValue('1')`.

**Coverage results after this batch** (54 tests, 18 suites, all passing):

| Area                             | Before | After               |
| -------------------------------- | ------ | ------------------- |
| `src/hocs` (WithInvoice)         | 0%     | 100%                |
| `src/ui/Navbar`                  | 0%     | 100%                |
| `src/app/components/InvoiceShow` | 51.61% | 100% (statements)   |
| `src/app/components/InvoiceEdit` | 0%     | 95.74% (statements) |

**Tradeoffs accepted**: The `WithInvoice` spec uses a `TestChild` stub rather than the real form components, which means it does not catch bugs introduced by changes to how `WithInvoice` passes the `invoice` prop down. This is the correct tradeoff — `InvoiceShow/index.spec.tsx` and `InvoiceEdit/index.spec.tsx` cover the real prop flow through `withInvoice(Component)` end-to-end; the HOC spec focuses exclusively on the three routing/loading branches.

---

### T-7 — `InvoiceForm` integration tests: navigation guard, validation, dirty field indicator

**Problem**: `InvoiceForm` is the most complex component in the codebase — it owns `useBlocker`, Yup validation, `useFieldArray`, and per-field dirty/destroy state. None of these behaviours had test coverage.

**Decision**: One co-located spec file (`InvoiceForm/InvoiceForm.spec.tsx`) covering three concern groups, 11 tests total.

**Navigation guard (4 tests)**: All tests require a real Data Router context (`createMemoryRouter` + `RouterProvider`) because `useBlocker` is only available in React Router's Data Router API — the legacy `MemoryRouter` does not implement blocking. A `FormWrapper` component holds the router-level `navigate` and passes it as `onCancel` to the form; an `ImmediateSaveFormWrapper` simulates the parent calling `onSaveSuccess()` then `navigate()` in the same tick to verify the `skipBlockerRef` bypass. Tests cover: dirty form blocks programmatic navigation, confirming "Leave" proceeds, "Stay" keeps the form open, and post-save navigation is never blocked even before `isDirty` resets.

**Validation (4 tests)**: Tests exercise the Yup schema end-to-end by submitting the form in various invalid states and asserting the error messages surface in the DOM. The `overrideDefaultValues` prop is used to pre-fill the form with controlled data (e.g. a deadline before the issue date) without having to interact through the UI. Tests cover: missing customer, zero quantity, all lines flagged for destruction, and the cross-field deadline/issue-date constraint.

**Dirty field indicator (3 tests)**: Tests verify the visual left-border applied by `FieldLayout` when a field's `isDirty` flag is set, the red border on `_destroy`-flagged lines (driven by inline `style` in `InvoiceLinesFields`), and immediate removal of an unsaved line from the DOM on "Remove" click. The border is asserted via `style` attribute checks, not CSS class names, because the indicator is applied as an inline style.

**Tradeoffs accepted**: Live totals recomputation (the `useWatch` → grand total path) is not covered in this integration suite. `rc-input-number` (Ant Design's underlying `InputNumber` library) only fires its external `onChange` on explicit commit events — jsdom does not simulate the focus/blur lifecycle that triggers this. The arithmetic itself is fully covered by `recalculateInvoiceTotals.spec.ts`. The `useWatch` → render wiring is trivially verifiable by reading the code and is most naturally exercised in a real browser.

---

### T-8 — Coverage gap batch: translators, `getCustomerName`, `getCustomerAddress`, `InvoiceRowActions`

**Problem**: After T-7, the V8 coverage report revealed four remaining gaps:

- `InvoiceEdit/translators/transformFormValuesToAPI.ts` — 22% branch coverage; the `_destroy` branch (sends `{ id, _destroy: true }` to the API, no `product_id`/`quantity`) and the new-line-no-id branch were both untested
- `InvoiceCreate/translators/transformFormValuesToAPI.ts` — 50% branch coverage; the multi-line case wasn't explicitly exercised
- `src/helpers/getCustomerName.ts` and `src/helpers/getCustomerAddress.ts` — no spec files at all; both helpers are used in multiple rendered columns but were only exercised implicitly through integration tests
- `InvoiceRowActions.tsx` — the finalized+unpaid state ("Mark as paid" menu item) had no test; only finalized+paid and draft states were covered

**Decision**: Five spec additions, one bug fix, and two test removals.

**`InvoiceEdit/translators/transformFormValuesToAPI.spec.ts`** — 5 unit tests covering the three line-serialisation branches the translator must produce:

1. Header fields (`id`, `customer_id`, `date`, `deadline`)
2. Existing non-destroyed line → `{ id, product_id, quantity }`
3. Existing destroyed line → `{ id, _destroy: true }` with no `product_id`/`quantity` (critical: the API interprets any extra fields alongside `_destroy` as ambiguous)
4. New line (no server id) → `{ product_id, quantity }` with no `id` key
5. Mixed payload (update + destroy + new) in one call — the real-world scenario when the user edits, removes, and adds lines in a single save

**`InvoiceCreate/translators/transformFormValuesToAPI.spec.ts`** — 2 unit tests:

1. Full payload shape assertion (all fields, single line)
2. Multi-line mapping into `invoice_lines_attributes`

Two "NaN-safe Number" tests were drafted and then removed after review: they passed an object with an `undefined` id into a field typed as `number`, which does not actually exercise the `?.` short-circuit branch (the branch fires only when `customer` is `null`/`undefined`, not when its `id` property is), and they asserted `NaN` as an acceptable `customer_id` — documenting broken behavior rather than preventing it.

**`InvoiceRowActions.spec.tsx`** — 1 additional test for the finalized+unpaid state: verifies "Mark as paid" is shown and all draft-only actions (Edit, Finalize, Delete) and "Mark as unpaid" are absent. This branch was reachable from the UI but unexercised.

**`src/helpers/getCustomerName.spec.ts`** — 4 tests: both names present, `undefined` customer, first-name-only, last-name-only. Separates the helper from the integration noise of `InvoicesList` and `InvoiceShow` where it was implicitly covered.

**`src/helpers/getCustomerAddress.spec.ts`** — 5 tests: `undefined` customer, fully-populated address, empty `address`, empty `zip_code`, empty `city`. The tests for partial fields found a latent formatting bug: the function joined parts with `', '` without filtering empty strings first, producing `", 75001 Paris"` for a customer with no street address. The bug was fixed in `getCustomerAddress.ts` by adding `.filter(Boolean)` before both `.join()` calls.

**Tradeoffs accepted**: The `getCustomerName` and `getCustomerAddress` specs test pure functions where every branch is reachable — no tradeoffs. The translator specs test against the exact API payload shape (`toEqual`), which makes them sensitive to structural renames; that is the right sensitivity — these functions are the API contract boundary.

---

### T-9 — No Playwright / E2E tests: RTL + MSW already satisfies the "user perspective" requirement

**Problem**: E2E testing tools like Playwright were considered to provide end-to-end coverage of full user journeys (create invoice → finalize → mark paid). The README requirement to "test from the user's point of view" might be read as requiring a real browser.

**Why Playwright is not needed here**:

The "user perspective" requirement is fully satisfied by React Testing Library (RTL). RTL's core philosophy is to test through the rendered DOM using accessible queries (`screen.getByRole`, `screen.getByLabelText`, `userEvent.click`, `findByText`) — exactly how a user perceives and interacts with the interface, with no reliance on component internals or implementation details. This is the same user-perspective guarantee Playwright provides, without requiring a real browser.

MSW intercepts at the `fetch` layer and returns controlled responses, so every test exercises the real production pipeline: user action → component state → TanStack Query mutation → `onSuccess`/`onError` → toast feedback → DOM update. There is no mocking of React components, hooks, or module internals. The pipeline tested is structurally identical to production.

The specific behaviours that typically justify Playwright — navigation guards (`useBlocker`), router state, form submission flows — are all covered via `createMemoryRouter` + `RouterProvider` + programmatic `navigate()` calls in `InvoiceCreate/index.spec.tsx` and `InvoiceForm/InvoiceForm.spec.tsx` (see T-5 and T-7). JSDOM faithfully executes the blocker's `BlockerFunction`, the confirmation modal renders in the virtual DOM, and `userEvent.click` triggers the correct action.

**Why Playwright would be actively harmful for this project**:

At the time of this decision the app ran against a shared, externally hosted REST API with no test-environment sandbox. A Playwright suite running against that API would:

1. **Create real data** — every test run that exercises invoice creation or deletion would pollute the shared database with test records.
2. **Be non-deterministic** — network latency, API rate limits, server cold starts, and shared state from other consumers make the suite flaky by design.
3. **Be unshareable** — the API token is per-user; no CI pipeline can run Playwright tests without credential management infrastructure that is out of scope.

RTL + MSW is deterministic by construction: MSW responses are synchronous and controlled per test; `server.resetHandlers()` in `afterEach` guarantees no state leaks; `createTestQueryClient()` gives every test a fresh cache.

**Tradeoffs accepted**: No visual regression testing and no cross-browser rendering verification. Both are acceptable omissions for an assessment prototype targeting a single known persona on desktop browsers. In a production codebase, a Playwright suite running against a dedicated staging environment (not the shared API) and Chromatic (or similar) for visual regression would be P2 additions — after the MSW layer proves the business logic.

---

### UI-1 — Layout fixes: navbar centering, in-flow action buttons, product column width

**Problem**: Three visual defects were present after the initial feature build:

1. **Navbar brand pinned to viewport edge on wide screens**: `Navbar.tsx` had no max-width inner container, so the "InvoiceApp" brand and "Invoices" link were anchored at 32px from the left edge of any viewport, while page content was already centered at `max-width: 1400px, margin: 0 auto`.
2. **Cancel / Save buttons floating in viewport bottom-right corner**: `FloatingActionButtonContainer.css` used `position: fixed; bottom: 20px; right: 92px`. On any screen the buttons were completely detached from the form — clicking "Update invoice" with no visible connection to the form beneath it is a UX trust failure for a financial operator.
3. **Product autocomplete taking 500px regardless of available space**: `table-layout: fixed` on the lines table combined with an explicit `width: 500px` on `.product-column` forced the column to a fixed pixel size, overflowing the form card on narrower viewports and wasting space on wider ones.

**Changes made**:

- `Navbar.tsx` / `Navbar.css`: wrapped brand + nav in `<div className="app-navbar__inner">` with `max-width: 1400px; margin: 0 auto` — aligning the navbar content with the page content max-width.
- `FloatingActionButtonContainer.css`: removed `position: fixed`. Replaced with `display: flex; justify-content: flex-end; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.06)` — the buttons are now in document flow, visually separated from the form by a subtle divider, and always adjacent to the content they submit.
- `InvoiceForm.css` (which only contained `padding-bottom: 80px` to compensate for the fixed bar's overlap): deleted entirely. The dead `paddingBottom: 80` inline style was also removed from `InvoiceCreate/index.tsx`, `InvoiceEdit/index.tsx`, and `InvoiceShow/index.tsx`.
- `InvoiceLines.css`: removed `table-layout: fixed`. Changed `.product-column` from `width: 500px` to `min-width: 160px`. The browser now sizes each column to its content (`table-layout: auto` is the default).

**Tradeoffs accepted**: Without `position: fixed`, the action buttons scroll out of view on very long forms (many line items). This is the correct tradeoff — the fixed bar was creating more UX damage (spatial disconnection from the form, z-index battles) than the scroll inconvenience costs. An "Add Line" button keeps the user near the bottom of the form naturally.

---

### UI-2 — Code compliance audit: Bootstrap dead classes, empty CSS file, passthrough wrappers

**Problem**: After the layout changes, a systematic pass against the copilot instructions guidelines found five violations:

1. `InvoiceForm.tsx` used Bootstrap utility classes `bg-white shadow-lg rounded-lg p-5` on the form card container — every other card in the codebase (`InvoiceLines.tsx`, `CustomerDetails.tsx`, `InvoiceInfo.tsx`) uses CSS-variable inline styles (`var(--card-bg)`, `var(--card-shadow)`, `var(--card-radius)`). Mixed patterns for the same visual component are a DRY violation.
2. `InvoiceForm.css` had been reduced to an empty `{}` block by previous cleanup. An empty CSS file with an active import is dead code.
3. `InvoiceLinesFields/index.tsx` had `className="border-b"` on `<tr>` rows. `border-b` is a Tailwind utility class — Tailwind is not in this project's stack. The class was a no-op; table borders are handled by `.invoice-lines-table td, th { border: 1px solid #dee2e6 }` in `InvoiceLines.css`.
4. `CustomerDetails.tsx` had a stray `{' '}` whitespace text node between the opening `<Card>` tag and `<Descriptions>`.
5. `api/index.tsx` had a bare `/* @ts-ignore */` with no explanation. The guidelines require a comment explaining _why_ a suppression exists.

**Changes made**:

- `InvoiceForm.tsx`: replaced `className="bg-white shadow-lg rounded-lg p-5"` with `style={{ background: 'var(--card-bg)', borderRadius: 'var(--card-radius)', boxShadow: 'var(--card-shadow)', padding: '20px 24px' }}`. The two redundant wrapper `<div>` levels were also collapsed into one.
- `InvoiceForm.css`: file deleted. Import removed from `InvoiceForm.tsx`.
- `InvoiceLinesFields/index.tsx`: `className="border-b"` removed from the `<tr>`.
- `CustomerDetails.tsx`: stray `{' '}` removed.
- `api/index.tsx`: `@ts-ignore` annotated — `openapi-client-axios` types expect a string path for `definition`, but passing the imported JSON object works at runtime and eliminates a build-time file path resolution issue.

**Tradeoffs accepted**: None. All fixes are removals or substitutions with equivalent output — no behaviour change.

---

### UI-3 — Desktop-first viewport strategy: `min-width: 960px` + fixed viewport meta

**Problem**: The app rendered broken on mobile viewports (tested at iPhone 14 Pro Max, 430px). The 8-column invoice line table, product autocomplete, and date pickers physically cannot collapse to 430px without a complete UX redesign (replacing the table with per-line cards, rethinking the form layout, etc.).

**Assessment against the customer persona**: The primary user — accountant, RAF, DAF — manages invoices professionally at a desk, typically on a laptop or external monitor, often with a second screen showing an ERP or accounting system. Invoice creation with multiple line items, product selection, and VAT calculation requires precise input that is impractical on a phone touchscreen. This mirrors real-world products (Xero, QuickBooks, Sage) which are all genuinely desktop-first and scroll horizontally on mobile rather than reflow.

**Decision**: Rather than a full responsive redesign (scope-bloating, no value for the target persona), apply the industry-standard B2B finance tool approach:

- `public/index.html`: changed viewport meta from `width=device-width, initial-scale=1` to `width=960`. This tells mobile browsers the page is 960px wide — they render it at that width and let the user pinch-zoom or pan, rather than compressing the layout to 430px and breaking it.
- `src/app/App.css`: added `body { min-width: 960px }`. This ensures that even on a desktop browser resized below 960px, the layout holds its shape and a horizontal scrollbar appears rather than flex/grid reflow.

**Why `width=960` and not `min-width=960` in the meta tag**: The `minimum-scale` and `min-width` viewport properties have inconsistent browser support. The simplest and most reliably supported approach for a fixed-width app is to declare the intended layout width explicitly.

**Tradeoffs accepted**: A mobile user who genuinely needs to view an invoice will see the desktop layout at ~0.5× zoom level. This is acceptable — view-only lookup is a secondary workflow and the desktop layout is still readable at zoom. Creating or editing an invoice on mobile was never a supported workflow for this persona.

---

## Pre-Debrief Fixes

After reviewing the app end-to-end before the final debrief, several UX and correctness issues were noticed and fixed. None of these were regressions from the core build — they were behaviours that had always been present but became apparent only when the full flow was exercised in sequence.

---

### PD-1 — Column ordering aligned to standard invoice reading flow

**Problem**: The invoice line columns were not in the order a financial operator naturally reads them. Unit Price appeared before VAT Rate in the detail and form views, placing a derived column (tax) before the input it derives from. In the list table, the Tax total column appeared after the Grand Total, reversing the Tax → Total derivation sequence. The standard accounting column order is: Product → Quantity → Unit → Unit Price → VAT Rate → Unit Tax → Tax Total → Grand Total.

**Options considered**:

- Leave as-is → technically correct; domain-wrong; an accountant reviewing an invoice reads left-to-right and expects to see the rate that produced the tax before they see the tax
- Reorder to standard accounting flow → one change, no logic affected, immediately more readable to the primary persona

**Decision**: Column order fixed across all four invoice table surfaces:

- `InvoiceShow/structure.tsx` — Unit Price moved before VAT Rate; Tax column moved before Line Total
- `InvoiceShow/InvoiceLines.tsx` — summary row cell indices updated to match (Tax at index 5, Total at index 6)
- `InvoicesList/structure.tsx` — Tax column moved before Total column
- `InvoiceForm/InvoiceLinesFields/index.tsx` — table header and footer totals reordered (Total Tax before Total Price)
- `InvoiceForm/InvoiceLinesFields/InvoiceLineFields.tsx` — row cells reordered to match header

**Tradeoffs accepted**: None — this is a pure display reorder with no logic change.

---

### PD-2 — Amber dirty-field border suppressed on invoice creation; visible only in edit mode

**Problem**: After implementing the `FieldLayout` dirty-field amber border (FU-5), an edge case was discovered: when creating a new invoice, any field the operator touched showed the amber border immediately. On a blank form, an amber border on a modified field carries no information — there is no "before" state to compare against. The visual noise was actively confusing: it looked like every touched field was "wrong" or "different from something".

The correct semantic is: show the amber border only when editing an existing invoice to signal "this field differs from the saved version". On creation, all fields are new by definition.

**Options considered**:

- Always show amber on dirty fields → already the status quo; wrong on creation
- Remove the indicator entirely → loses the useful signal for the edit flow
- Gate the indicator on whether an invoice ID exists (`isEdit = !!invoice`) → creates a clear contextual semantic: amber means "changed from the saved state", which only applies when a saved state exists

**Decision**: An `isEdit` boolean was threaded to all leaf field components. Each component's `isDirty` prop to `FieldLayout` is evaluated as `isEdit && fieldState.isDirty`. On creation (`isEdit = false`), `isDirty` is always `false` regardless of user input — no amber border. On edit (`isEdit = true`), the border fires normally.

Row-level borders on invoice lines follow the same logic: the amber left border on new (unsaved) lines is gated on `isEdit && !line.id`. The legend showing the amber/red colour key is rendered only in edit mode.

**Tradeoffs accepted**: `isEdit` was initially prop-drilled through the form tree, which violated SRP and the project's own no-prop-drilling guideline (see PD-3 for the subsequent fix).

---

### PD-3 — `isEdit` refactored from prop drilling to `InvoiceFormContext`

**Problem**: PD-2 introduced `isEdit` as a prop on `InvoiceMainDataField`, `InvoiceDateFields`, `InvoiceLinesFields`, and `InvoiceLineFields`. `InvoiceDateFields` and `InvoiceLinesFields` each received `isEdit` purely to pass it to their children — they had no internal use for it. This is exactly the prop-drilling anti-pattern the project's guidelines flag: _"If a component receives a prop only to pass it deeper, eliminate the prop drilling"_.

**Options considered**:

- Leave as-is → works but violates SRP; each passthrough component's interface carries an irrelevant concern
- `useFormState` from RHF → not applicable; `isEdit` is not form state, it is context about the rendering scenario
- Small `InvoiceFormContext` → single context file; `InvoiceForm` provides the value once; any descendant reads it directly; zero passthrough props

**Decision**: `src/app/components/InvoiceForm/InvoiceFormContext.tsx` exports `InvoiceFormProvider` and `useInvoiceFormContext`. `InvoiceForm` wraps its output in `<InvoiceFormProvider value={{ isEdit: !!invoice }}>`. `InvoiceMainDataField`, `InvoiceDateFields`, `InvoiceLinesFields`, and `InvoiceLineFields` each call `useInvoiceFormContext()` and read `isEdit` directly — their props interfaces no longer carry the field.

`ui/` leaf components (`CustomerField`, `DateInputField`, `ProductField`, `NumberInputField`) retain their `isEdit` prop — they are domain-agnostic and must not know about `InvoiceFormContext`. The context boundary stops at the `app/components/InvoiceForm` tree; leaf UI components remain portable.

**Tradeoffs accepted**: Any component that calls `useInvoiceFormContext` outside an `InvoiceFormProvider` receives `isEdit: false` (the context default). This is the correct safe default — absent provider means creation mode, no amber borders.

---

### PD-4 — Customer field dirty detection broken by `label` property in form state

**Problem**: After PD-2, all form fields showed the amber border correctly on edit except the customer field. Changing the customer produced no amber border, and the form-level `isDirty` was also unreliable for the customer.

**Root cause**: `InfiniteScrollSelect` requires all items to have a `label: string` property (used by Ant Design's `Select` for display). `CustomerAutoComplete` adds this property by spreading the API `Customer` into a `CustomerItem = Customer & { label: string }` object. When the user selects a customer, `field.onChange` receives the full `CustomerItem` — including `label` — and stores it in RHF form state.

RHF's dirty detection computes `deepEqual(currentValue, defaultValue)`. The `defaultValues` are derived from `invoice.customer` — a plain `Customer` with no `label` property. When a customer is selected, the stored value has an extra `label` key that the default does not have. RHF's `deepEqual` iterates only the default object's keys, finds all of them present and equal, and concludes `isDirty = false` — even when a completely different customer was selected and the `id` has changed.

**Options considered**:

- Compare `field.value?.id !== control._defaultValues.customer?.id` manually → bypasses RHF's dirty tracking; adds a bespoke comparison that must be maintained alongside the form schema
- Strip `label` in `CustomerAutoComplete.onChange` → the stripping would need to happen before `field.onChange` is called; `CustomerAutoComplete` does not have access to `field.onChange` directly
- Strip `label` in `CustomerField.handleChange` before calling `field.onChange` → `CustomerField` owns the RHF binding; this is the correct location to ensure only a plain `Customer` is ever written to form state

**Decision**: `CustomerField` wraps `field.onChange` (and the optional `onChange` override) in a `handleChange` callback that destructures `label` away before storing the customer:

```typescript
const { label: _label, ...customer } = customerItem
;(onChange ?? field.onChange)(customer as Customer)
```

`label` is a UI display concern for Ant Design's `Select` — it has no meaning in form state and should never be stored there. With this fix, the value written to RHF is always a plain `Customer`, matching the `defaultValues` shape exactly. RHF's `deepEqual` now correctly detects identity (same customer re-selected → `isDirty = false`) and substitution (different customer → `isDirty = true`).

**Tradeoffs accepted**: `CustomerAutoComplete` continues to pass `CustomerItem` (with `label`) to its `onChange`. The stripping happens at the `CustomerField` boundary — the only consumer that writes to RHF. Any other consumer of `CustomerAutoComplete` that needs the `label` for display purposes is unaffected.

---

### PD-5 — Redirect to invoice detail after creation, not back to the list

**Problem**: After saving a new invoice, the operator was redirected to the invoice list. The operator had just provided all the invoice data — customer, dates, line items — and the next natural action is to verify the created invoice looks correct and optionally finalize it. Redirecting to the list forced an extra click (find the new invoice, click through to its detail) to continue the most common post-creation workflow.

**Options considered**:

- Stay on the create form with a success state → orphans the form with no natural next step; the form can no longer be submitted; the operator must navigate away manually
- Redirect to the list → drops the operator back to a list of all invoices with no visual indication of which one was just created
- Redirect to the detail view of the created invoice → operator immediately sees the saved state, can verify it, and has one click to finalize; this is the natural workflow continuation

**Decision**: `useCreateInvoice` already passed the created `Invoice` to the `onSuccess` callback — the signature was `onSuccess: (invoice: Invoice) => void` but `InvoiceCreate` ignored the argument. The fix is a single change: `navigate('/invoices')` → `navigate(\`/invoices/${invoice.id}\`)`.

**Tradeoffs accepted**: None. The API already returns the created invoice including its server-assigned ID. No extra fetch required.

---

### PD-6 — Yup `mixed().optional()` intercepts `null` before custom `.test()`, producing raw path error

**Problem**: When the user submitted the form with no product selected on a line, the validation error shown was `invoice_lines[1].product cannot be null` — a raw Yup-generated message including the full field path. The friendly "Product is required" message from the custom `.test()` never appeared.

**Root cause**: Yup's `mixed().optional()` allows `undefined` but still intercepts `null` values with its own built-in error before the chain reaches the custom `.test()`. `CustomerAutoComplete` calls `field.onChange(null)` when the selection is cleared, so the product field could hold `null`. Yup saw `null`, rejected it before the test ran, and emitted its own internal message with the raw schema path.

**Options considered**:

- Change `field.onChange(null)` to `field.onChange(undefined)` in `ProductField` → shifts the fix to the component rather than the schema; fragile if any future code path writes `null`
- `.nullable()` in the Yup schema → tells Yup to pass `null` through as a valid intermediate value; the custom `.test()` then runs and emits the friendly message

**Decision**: `product: yup.mixed<Product>().optional().nullable().when(...)`. With `.nullable()`, Yup no longer intercepts `null` — the value proceeds to the custom test which evaluates `value != null` and returns the "Product is required" message.

**Tradeoffs accepted**: The inferred TypeScript type widens slightly from `Product | undefined` to `Product | undefined | null`. This is correct — the field can genuinely hold `null` during interaction. The translator (`transformFormValuesToAPI`) already guards with optional chaining (`product?.id`), so the wider type does not introduce new risk.

---

## Post-Publication Improvements

### PP-1 — Automated accessibility checks with `jest-axe`

**Problem**: Nothing checked accessibility automatically. Running axe-core on the three pages found missing accessible names on the customer filter and on the form's customer, product and quantity inputs, two table headers with no text, and invoice rows with `role="button"` that contain their own action buttons (nested interactive controls).

**Options considered**:

- Manual audits only → catch more, but nothing stops a regression between audits
- Lighthouse in CI → audits the deployed page, but needs a browser and a server in CI and checks only the page it loads
- `jest-axe` in the existing Jest suite → runs axe-core on every page in the tests that already render them, with no extra CI setup

**Decision**: `jest-axe` (dev dependency) with one test per page in `src/specs/accessibility.spec.tsx`. Inputs without a visible label get an `ariaLabel` prop that is passed down to the Ant Design input. Empty column headers get visually hidden text ("Actions"). The invalid `role="button"` on invoice rows is removed.

**Tradeoffs accepted**: axe finds roughly a third of accessibility problems; it can't judge colour contrast in jsdom, keyboard flow or wording. One library issue is ignored on purpose: Ant Design's Segmented control puts `aria-selected` on a plain `div`. Only that exact pattern is filtered out, so any other violation still fails. Invoice rows remain mouse-only: opening an invoice from the keyboard still needs a link on each row, which is a separate change.

---
