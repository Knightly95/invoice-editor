import Big from 'big.js'
import type { Customer, Product } from 'types'
import type { StoredInvoice, MockDb } from './types'

/**
 * Deterministic seed data for the in-browser mock API.
 *
 * A tiny seeded PRNG keeps the demo dataset identical on every machine, which
 * makes screenshots, bug reports and manual QA reproducible.
 */
function createRandom(seed: number) {
  let state = seed
  return () => {
    // mulberry32
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FIRST_NAMES = [
  'Camille',
  'Lucas',
  'Emma',
  'Hugo',
  'Léa',
  'Louis',
  'Chloé',
  'Gabriel',
  'Manon',
  'Arthur',
  'Inès',
  'Jules',
  'Sarah',
  'Nathan',
  'Alice',
  'Tom',
  'Clara',
  'Paul',
  'Julia',
  'Adam',
  'Zoé',
  'Victor',
  'Lina',
  'Maxime',
]

const LAST_NAMES = [
  'Martin',
  'Bernard',
  'Dubois',
  'Thomas',
  'Robert',
  'Richard',
  'Petit',
  'Durand',
  'Leroy',
  'Moreau',
  'Simon',
  'Laurent',
  'Lefebvre',
  'Michel',
  'Garcia',
  'David',
  'Bertrand',
  'Roux',
  'Vincent',
  'Fournier',
]

const STREETS = [
  'rue de la République',
  'avenue Jean Jaurès',
  'boulevard Victor Hugo',
  'rue des Lilas',
  'impasse des Peupliers',
  'place du Marché',
  'chemin des Vignes',
  'rue Pasteur',
  'allée des Tilleuls',
  'quai de Seine',
]

const CITIES: { city: string; zip: string }[] = [
  { city: 'Paris', zip: '75011' },
  { city: 'Lyon', zip: '69003' },
  { city: 'Marseille', zip: '13006' },
  { city: 'Bordeaux', zip: '33000' },
  { city: 'Nantes', zip: '44000' },
  { city: 'Lille', zip: '59000' },
  { city: 'Toulouse', zip: '31000' },
  { city: 'Rennes', zip: '35000' },
  { city: 'Strasbourg', zip: '67000' },
  { city: 'Montpellier', zip: '34000' },
]

const PRODUCT_CATALOG: {
  label: string
  unit: Product['unit']
  vat_rate: Product['vat_rate']
  priceWithoutTax: string
}[] = [
  {
    label: 'Strategy consulting',
    unit: 'hour',
    vat_rate: '20',
    priceWithoutTax: '150.00',
  },
  {
    label: 'Frontend development',
    unit: 'day',
    vat_rate: '20',
    priceWithoutTax: '600.00',
  },
  {
    label: 'Backend development',
    unit: 'day',
    vat_rate: '20',
    priceWithoutTax: '650.00',
  },
  { label: 'UX audit', unit: 'day', vat_rate: '20', priceWithoutTax: '800.00' },
  {
    label: 'Project management',
    unit: 'hour',
    vat_rate: '20',
    priceWithoutTax: '90.00',
  },
  {
    label: 'Technical support',
    unit: 'hour',
    vat_rate: '20',
    priceWithoutTax: '65.00',
  },
  {
    label: 'Training workshop',
    unit: 'day',
    vat_rate: '20',
    priceWithoutTax: '1200.00',
  },
  {
    label: 'Copywriting',
    unit: 'hour',
    vat_rate: '20',
    priceWithoutTax: '55.00',
  },
  {
    label: 'Laptop stand',
    unit: 'piece',
    vat_rate: '20',
    priceWithoutTax: '39.90',
  },
  {
    label: 'Ergonomic office chair',
    unit: 'piece',
    vat_rate: '20',
    priceWithoutTax: '349.00',
  },
  {
    label: 'Standing desk',
    unit: 'piece',
    vat_rate: '20',
    priceWithoutTax: '529.00',
  },
  {
    label: '27" monitor',
    unit: 'piece',
    vat_rate: '20',
    priceWithoutTax: '289.00',
  },
  {
    label: 'Wireless keyboard',
    unit: 'piece',
    vat_rate: '20',
    priceWithoutTax: '79.00',
  },
  {
    label: 'Accounting handbook',
    unit: 'piece',
    vat_rate: '5.5',
    priceWithoutTax: '32.00',
  },
  {
    label: 'Business magazine subscription',
    unit: 'piece',
    vat_rate: '5.5',
    priceWithoutTax: '12.50',
  },
  {
    label: 'Coffee beans (1kg)',
    unit: 'piece',
    vat_rate: '5.5',
    priceWithoutTax: '24.00',
  },
  {
    label: 'Catering lunch',
    unit: 'piece',
    vat_rate: '10',
    priceWithoutTax: '18.00',
  },
  {
    label: 'Team dinner',
    unit: 'piece',
    vat_rate: '10',
    priceWithoutTax: '45.00',
  },
  {
    label: 'Hotel night',
    unit: 'day',
    vat_rate: '10',
    priceWithoutTax: '120.00',
  },
  {
    label: 'Passenger transport',
    unit: 'piece',
    vat_rate: '10',
    priceWithoutTax: '35.00',
  },
  {
    label: 'Medical consultation',
    unit: 'hour',
    vat_rate: '0',
    priceWithoutTax: '60.00',
  },
  {
    label: 'Professional training (certified)',
    unit: 'day',
    vat_rate: '0',
    priceWithoutTax: '450.00',
  },
  {
    label: 'Export shipment',
    unit: 'piece',
    vat_rate: '0',
    priceWithoutTax: '85.00',
  },
  {
    label: 'Software licence (annual)',
    unit: 'piece',
    vat_rate: '20',
    priceWithoutTax: '480.00',
  },
  {
    label: 'Cloud hosting',
    unit: 'day',
    vat_rate: '20',
    priceWithoutTax: '9.50',
  },
]

export function buildProduct(
  id: number,
  entry: (typeof PRODUCT_CATALOG)[number]
): Product {
  const withoutTax = new Big(entry.priceWithoutTax)
  const unitTax = withoutTax.times(entry.vat_rate).div(100).round(2)
  return {
    id,
    label: entry.label,
    unit: entry.unit,
    vat_rate: entry.vat_rate,
    unit_price_without_tax: withoutTax.toFixed(2),
    unit_tax: unitTax.toFixed(2),
    unit_price: withoutTax.plus(unitTax).toFixed(2),
  }
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function isoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate()
  )}`
}

export function createSeedDb(): MockDb {
  const random = createRandom(42)
  const pick = <T>(list: T[]): T => list[Math.floor(random() * list.length)]
  const int = (min: number, max: number) =>
    min + Math.floor(random() * (max - min + 1))

  const customers: Customer[] = []
  for (let i = 0; i < 40; i++) {
    const location = pick(CITIES)
    customers.push({
      id: i + 1,
      first_name: pick(FIRST_NAMES),
      last_name: pick(LAST_NAMES),
      address: `${int(1, 120)} ${pick(STREETS)}`,
      zip_code: location.zip,
      city: location.city,
      country: 'France',
      country_code: 'FR',
    })
  }

  const products: Product[] = PRODUCT_CATALOG.map((entry, i) =>
    buildProduct(i + 1, entry)
  )

  const invoices: StoredInvoice[] = []
  let nextLineId = 1
  const start = Date.UTC(2025, 0, 6)
  const dayMs = 24 * 60 * 60 * 1000

  for (let i = 0; i < 60; i++) {
    const issued = new Date(start + int(0, 640) * dayMs)
    const deadline = new Date(issued.getTime() + pick([15, 30, 45, 60]) * dayMs)
    const finalized = random() < 0.65
    const paid = finalized && random() < 0.55
    const lineCount = int(1, 4)
    const invoiceId = i + 1
    const lines = []
    for (let l = 0; l < lineCount; l++) {
      lines.push({
        id: nextLineId++,
        invoice_id: invoiceId,
        product_id: pick(products).id,
        quantity: int(1, 10),
      })
    }
    invoices.push({
      id: invoiceId,
      customer_id: pick(customers).id,
      finalized,
      paid,
      date: isoDate(issued),
      deadline: isoDate(deadline),
      invoice_lines: lines,
    })
  }

  return {
    customers,
    products,
    invoices,
    sequences: { invoice: invoices.length + 1, invoiceLine: nextLineId },
  }
}
