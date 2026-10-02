import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCapacityInput, tbToPB, tbToTiB, tiBToPiB, tiBToTB } from './raidCalculations.js'

test('converts displayed RAID capacity values to PiB and PB without changing their base units', () => {
  assert.equal(tiBToPiB(1024), 1)
  assert.equal(tbToPB(1000), 1)
  assert.equal(tbToPB(1250), 1.25)
})

test('converts decimal terabytes to binary tebibytes using the RAID calculator convention', () => {
  assert.equal(tbToTiB(1), 1_000_000_000_000 / 1_099_511_627_776)
  assert.equal(tbToTiB(1000), 909.4947017729282)
})

test('converts tebibytes back to decimal terabytes', () => {
  assert.equal(tiBToTB(1), 1.099511627776)
  assert.equal(tiBToTB(tbToTiB(20)), 20)
})

test('parses French and international decimal separators', () => {
  assert.equal(parseCapacityInput(' 12,5 '), 12.5)
  assert.equal(parseCapacityInput('.75'), 0.75)
  assert.equal(parseCapacityInput('10.'), 10)
  assert.equal(parseCapacityInput(''), null)
})

test('accepts formatted conversion results with a French decimal separator', () => {
  const formattedTiB = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 12,
    useGrouping: false
  }).format(tbToTiB(20))

  assert.equal(formattedTiB, '18,189894035458')
  assert.equal(parseCapacityInput(formattedTiB), tbToTiB(20))
})

test('rejects negative, malformed, and non-finite capacity values', () => {
  for (const input of ['-1', '1,2.3', '1 000', 'Infinity', '1e9']) {
    assert.ok(Number.isNaN(parseCapacityInput(input)), `${input} should be rejected`)
  }
})
