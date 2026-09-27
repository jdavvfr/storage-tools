import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateCopyDurationSeconds, formatCopyDuration } from './copyDuration.js'

test('calculates a decimal volume copied at a decimal byte rate', () => {
  assert.equal(calculateCopyDurationSeconds(1, 'To', 100, 'Mo/s'), 10_000)
})

test('distinguishes decimal and binary volume and throughput units', () => {
  assert.equal(calculateCopyDurationSeconds(1, 'TiB', 1, 'GiB/s'), 1_024)
  assert.equal(calculateCopyDurationSeconds(1, 'To', 1, 'Go/s'), 1_000)
  assert.equal(calculateCopyDurationSeconds(1, 'To', 1, 'GiB/s'), 1_000_000_000_000 / 1_073_741_824)
})

test('converts bit rates to bytes per second', () => {
  assert.equal(calculateCopyDurationSeconds(1, 'Go', 1, 'Gbit/s'), 8)
  assert.equal(calculateCopyDurationSeconds(100, 'Mo', 800, 'Mbit/s'), 1)
})

test('rejects non-positive, non-finite, and unknown-unit inputs', () => {
  for (const args of [
    [0, 'Go', 100, 'Mo/s'],
    [10, 'Go', 0, 'Mo/s'],
    [-1, 'Go', 100, 'Mo/s'],
    [10, 'Go', Number.POSITIVE_INFINITY, 'Mo/s'],
    [10, 'unknown', 100, 'Mo/s'],
    [10, 'Go', 100, 'unknown'],
    [10, 'toString', 100, 'Mo/s'],
  ]) {
    assert.ok(Number.isNaN(calculateCopyDurationSeconds(...args)))
  }
})

test('formats estimates as readable French durations rounded up to a second', () => {
  assert.equal(formatCopyDuration(3_661), '1 heure et 1 minute')
  assert.equal(formatCopyDuration(86_400), '1 jour')
  assert.equal(formatCopyDuration(0.2), '1 seconde')
})

test('formats estimates as readable English durations', () => {
  assert.equal(formatCopyDuration(3_661, 'en'), '1 hour and 1 minute')
  assert.equal(formatCopyDuration(86_400, 'en'), '1 day')
  assert.equal(formatCopyDuration(0.2, 'en'), '1 second')
})
