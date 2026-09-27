import assert from 'node:assert/strict'
import test from 'node:test'
import { formatIops } from './formatIops.js'

test('formats raw IOPS values without a scaled unit', () => {
  assert.equal(formatIops(999), '999')
})

test('formats thousands as KIOPS and preserves one fractional digit', () => {
  assert.equal(formatIops(200_000), '200 KIOPS')
  assert.equal(formatIops(95_500), '95,5 KIOPS')
})

test('formats IOPS using English decimal separators', () => {
  assert.equal(formatIops(95_500, 'en'), '95.5 KIOPS')
})

test('formats millions as MIOPS and preserves up to two fractional digits', () => {
  assert.equal(formatIops(1_000_000), '1 MIOPS')
  assert.equal(formatIops(1_256_789), '1,26 MIOPS')
})
