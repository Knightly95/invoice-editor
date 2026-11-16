# Backend Issues — original hosted API

> Discovered while building the Invoice Editor against the externally hosted API it was originally developed with.
> **The bundled mock API (`src/mockApi`) does not have these bugs** — it derives line prices and invoice totals from the current product on every read, and sorts on those derived values. The frontend workarounds are kept so the app stays correct against any backend that shares this behaviour.
> Each issue documents: observed behaviour, root cause (hypothesised), impact on the frontend, and the current frontend workaround.

---

## BI-1 — Product substitution does not recompute invoice snapshot totals

**Endpoint affected**: `PUT /invoices/:id`

**Observed behaviour**:
When an existing invoice line's product is replaced (i.e. `product_id` is changed via `PUT /invoices/:id` with updated `invoice_lines_attributes`), the API correctly updates the nested `invoice_line.product` object returned in the response. However, the following snapshot fields are **not** recomputed:

- `invoice_line.price` — still reflects the original product's unit price × quantity
- `invoice_line.tax` — still reflects the original product's unit tax × quantity
- `invoice.total` — still the sum of the pre-substitution line prices
- `invoice.tax` — still the sum of the pre-substitution line taxes

The bug is only observable after a product substitution. Fresh invoices (create → read without editing products) are internally consistent.

**Reproduction steps**:

1. Create an invoice with product A (e.g. unit price 100 €).
2. Edit the invoice, replace the product with product B (e.g. unit price 200 €).
3. Save. Observe that the response still shows `invoice_line.price = "100.00"` and `invoice.total = "100.00"`.

**Root cause (hypothesised)**:
The API stores `invoice_line.price` and `invoice_line.tax` as snapshot fields at creation time and does not recalculate them when `product_id` changes — it only updates the product association. The `invoice.total` and `invoice.tax` fields are derived from these stale snapshots.

**Impact on the frontend**:

- `InvoiceShow` detail page: displays stale totals after an edit.
- `InvoicesList` table: `total` and `tax` columns show stale values.
- `GET /invoices?sort=-total`: API sorts by stale snapshot totals → the sort order received from the API does not match the corrected totals displayed in the UI.
- `GET /invoices?sort=-tax`: same issue.

**Frontend workaround**:
`helpers/recalculateInvoiceTotals.ts` — a pure transform applied via TanStack Query `select` in both `hocs/WithInvoice.tsx` and `InvoicesList/index.tsx`. It re-derives all affected fields from `invoice_line.product.unit_price` and `invoice_line.product.unit_tax`, which the API does correctly update.

For the sort inconsistency: `InvoicesList` re-sorts the current page client-side by the corrected `total`/`tax` values after `recalculateInvoiceTotals`. This guarantees visual consistency within a page but **does not fix cross-page ordering** — invoices on page 2 that should appear before page 1 invoices (after recalculation) will still be paginated incorrectly. This is an inherent limitation of client-side patching of server-side pagination.

**Workaround locations** (search for `BI-1` to find all):

- `src/helpers/recalculateInvoiceTotals.ts`
- `src/hocs/WithInvoice.tsx`
- `src/app/components/InvoicesList/index.tsx`

**Resolution**:
The API should recompute `invoice_line.price`, `invoice_line.tax`, `invoice.total`, and `invoice.tax` whenever `product_id` is changed in an update payload. Once fixed, `recalculateInvoiceTotals` and the client-side re-sort in `InvoicesList` can be removed entirely.

---

## BI-2 — `GET /invoices` sort on `total`/`tax` operates on stale snapshot values

**Endpoint affected**: `GET /invoices?sort=-total` / `GET /invoices?sort=-tax`

**Observed behaviour**:
The API accepts a `sort` query parameter in `+field` / `-field` format. Sorting by `total` or `tax` returns pages ordered by the stale snapshot values rather than the values derived from the current product associations.

**Dependency**: This is a direct consequence of BI-1. If BI-1 is fixed (API keeps snapshots in sync), this issue resolves automatically — the sort will operate on correct values.

**Impact**: Cross-page ordering is incorrect when sorting by `total` or `tax`. Within-page ordering is corrected by the frontend workaround described in BI-1.

**Resolution**: Fix BI-1.

---
