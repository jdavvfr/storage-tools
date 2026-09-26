import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateLtoCartridges,
  calculateLtoTotalCartridges,
  calculateLtoWriteDurationSeconds,
  LTO_COMPRESSION_RATIO,
  ltoGenerations,
} from './tapeLto.js'

test('uses the native capacities of LTO-7, LTO-8, and LTO-9', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(ltoGenerations).map(([generation, values]) => [generation, values.nativeCapacityTB])),
    { 'LTO-7': 6, 'LTO-8': 12, 'LTO-9': 18 },
  )
  assert.equal(calculateLtoCartridges(18, 'To', 'LTO-7'), 3)
  assert.equal(calculateLtoCartridges(18, 'To', 'LTO-8'), 2)
  assert.equal(calculateLtoCartridges(18, 'To', 'LTO-9'), 1)
})

test('rounds cartridge requirements up and applies the stated compression ratio', () => {
  assert.equal(calculateLtoCartridges(18.1, 'To', 'LTO-9'), 2)
  assert.equal(LTO_COMPRESSION_RATIO, 2.5)
  assert.equal(calculateLtoCartridges(45, 'To', 'LTO-9', true), 1)
  assert.equal(calculateLtoCartridges(45.1, 'To', 'LTO-9', true), 2)
})

test('converts binary and decimal volume units for cartridge calculations', () => {
  assert.equal(calculateLtoCartridges(6_000, 'GiB', 'LTO-7'), 2)
  assert.equal(calculateLtoCartridges(1, 'TiB', 'LTO-9'), 1)
})

test('multiplies a complete backup cartridge count by identical rotation sets', () => {
  assert.equal(calculateLtoTotalCartridges(4, 3), 12)
  assert.equal(calculateLtoTotalCartridges(1, 1), 1)
})

test('rejects invalid or unrepresentably large rotation totals', () => {
  for (const args of [
    [0, 1],
    [1, 0],
    [-1, 2],
    [1, 1.5],
    [Number.NaN, 2],
    [Number.MAX_SAFE_INTEGER, 2],
  ]) {
    assert.ok(Number.isNaN(calculateLtoTotalCartridges(...args)))
  }
})

test('rejects invalid, non-positive, and unrepresentably large capacity inputs', () => {
  for (const args of [
    [0, 'To', 'LTO-7'],
    [-1, 'To', 'LTO-7'],
    [1, 'unknown', 'LTO-7'],
    [1, 'To', 'LTO-6'],
    [Number.POSITIVE_INFINITY, 'To', 'LTO-7'],
    [Number.MAX_VALUE, 'To', 'LTO-7'],
  ]) {
    assert.ok(Number.isNaN(calculateLtoCartridges(...args)))
  }
})

test('uses native reference write rates or a valid custom rate', () => {
  assert.equal(calculateLtoWriteDurationSeconds(1, 'To', 'LTO-7'), 10_000 / 3)
  assert.equal(calculateLtoWriteDurationSeconds(1, 'To', 'LTO-8'), 1_000_000 / 360)
  assert.equal(calculateLtoWriteDurationSeconds(1, 'To', 'LTO-9'), 2_500)
  assert.equal(calculateLtoWriteDurationSeconds(1, 'To', 'LTO-9', 200), 5_000)
})

test('rejects invalid write duration inputs', () => {
  for (const args of [
    [0, 'To', 'LTO-7'],
    [1, 'To', 'LTO-6'],
    [1, 'To', 'LTO-7', 0],
    [1, 'To', 'LTO-7', Number.NaN],
  ]) {
    assert.ok(Number.isNaN(calculateLtoWriteDurationSeconds(...args)))
  }
})
