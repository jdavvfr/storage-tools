import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCapacityInput, tbToTiB, tiBToTB } from './raidCalculations.js'

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

test('rejects negative, malformed, and non-finite capacity values', () => {
  for (const input of ['-1', '1,2.3', '1 000', 'Infinity', '1e9']) {
    assert.ok(Number.isNaN(parseCapacityInput(input)), `${input} should be rejected`)
  }
})
