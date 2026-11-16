#!/usr/bin/env node
// Turns Jest's coverage summary into the JSON that a shields.io "endpoint"
// badge reads. Usage: node bin/coverage-badge.js <coverage-summary.json> <out.json>
const fs = require('fs')

const [summaryPath, outPath] = process.argv.slice(2)
if (!summaryPath || !outPath) {
  console.error('Usage: coverage-badge.js <coverage-summary.json> <out.json>')
  process.exit(1)
}

const lines = JSON.parse(fs.readFileSync(summaryPath, 'utf8')).total.lines.pct

let color = 'red'
if (lines >= 90) color = 'brightgreen'
else if (lines >= 80) color = 'green'
else if (lines >= 70) color = 'yellow'

fs.writeFileSync(
  outPath,
  JSON.stringify({
    schemaVersion: 1,
    label: 'coverage',
    message: `${lines}%`,
    color,
  })
)
console.log(`Line coverage: ${lines}%`)
