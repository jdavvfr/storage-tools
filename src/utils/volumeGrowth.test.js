import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateVolumeGrowth } from './volumeGrowth.js'

test('calculates compound annual growth over multiple years', () => {
  assert.ok(Math.abs(calculateVolumeGrowth(100, 10, 3) - 133.1) < 1e-12)
})

test('supports fractional rates, zero growth, and volume decline', () => {
  assert.ok(Math.abs(calculateVolumeGrowth(1_000, 2.5, 4) - 1_103.812890625) < 1e-12)
  assert.equal(calculateVolumeGrowth(25, 0, 8), 25)
  assert.equal(calculateVolumeGrowth(100, -10, 2), 81)
  assert.equal(calculateVolumeGrowth(100, -100, 2), 0)
})

test('preserves a zero source volume', () => {
  assert.equal(calculateVolumeGrowth(0, 50, 5), 0)
})

test('rejects invalid values and results outside the finite numeric range', () => {
  for (const args of [
    [-1, 10, 3],
    [Number.NaN, 10, 3],
    [100, Number.POSITIVE_INFINITY, 3],
    [100, -100.1, 3],
    [100, 10, 0],
    [100, 10, 1.5],
    [100, 10, Number.MAX_SAFE_INTEGER + 1],
    [100, 10, Number.POSITIVE_INFINITY],
    [1e308, 100, 2],
  ]) {
    assert.ok(Number.isNaN(calculateVolumeGrowth(...args)))
  }
})
