import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRaidComparison, calculateRaid } from './raidCalculations.js'

const disk = { rebuildMBps: 200, readIops: 100, writeIops: 100, readBandwidthMBps: 200, writeBandwidthMBps: 200 }
const comparisonArgs = { diskCount: 8, hotSpares: 0, diskSizeTB: 10, groupCount: 2, disk, rebuildLoad: 40 }

test('realistic rebuild estimates reflect each RAID recovery domain', () => {
  const comparison = buildRaidComparison(comparisonArgs)
  const estimates = Object.fromEntries(comparison.filter(row => row.result.valid).map(row => [row.raid, row.result.rebuild.realistic]))

  assert.ok(estimates.RAID1 < estimates.RAID5)
  assert.ok(estimates.RAID5 < estimates.RAID6)
  assert.ok(estimates.RAID50 < estimates.RAID5)
  assert.ok(estimates.RAID60 < estimates.RAID6)
  assert.equal(estimates.RAID0, null)
})

test('selected RAID result matches its comparison row', () => {
  const selected = calculateRaid({ ...comparisonArgs, raid: 'RAID50' })
  const comparisonRow = buildRaidComparison(comparisonArgs).find(row => row.raid === 'RAID50')

  assert.equal(comparisonRow.result.valid, true)
  assert.equal(selected.rebuild.realistic, comparisonRow.result.rebuild.realistic)
})
