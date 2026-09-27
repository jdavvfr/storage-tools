import assert from 'node:assert/strict'
import test from 'node:test'
import { sortRaidComparison } from './raidComparison.js'

const rows = [
  { raid: 'RAID10', result: { usableTB: 40, efficiencyInstalled: 90, readBandwidthMBps: 800, readIops: 80, writeBandwidthMBps: 400, writeIops: 40, resilience: 4, rebuild: { realistic: 3 } } },
  { raid: 'RAID5', result: { usableTB: 70, efficiencyInstalled: 70, readBandwidthMBps: 800, readIops: 100, writeBandwidthMBps: 700, writeIops: 30, resilience: 1, rebuild: { realistic: null } } },
  { raid: 'RAID0', result: { usableTB: 80, efficiencyInstalled: 80, readBandwidthMBps: 600, readIops: 60, writeBandwidthMBps: 800, writeIops: 80, resilience: 0, rebuild: { realistic: null } } }
]

test('comparison sorting uses natural RAID keys and leaves unavailable rebuild estimates last', () => {
  assert.deepEqual(
    sortRaidComparison(rows, { key: 'raid', direction: 'ascending' }).map(row => row.raid),
    ['RAID0', 'RAID5', 'RAID10']
  )
  assert.deepEqual(
    sortRaidComparison(rows, { key: 'raid', direction: 'descending' }).map(row => row.raid),
    ['RAID10', 'RAID5', 'RAID0']
  )
  assert.deepEqual(
    sortRaidComparison(rows, { key: 'rebuild.realistic', direction: 'ascending' }).map(row => row.raid),
    ['RAID10', 'RAID5', 'RAID0']
  )
  assert.deepEqual(
    sortRaidComparison(rows, { key: 'rebuild.realistic', direction: 'descending' }).map(row => row.raid),
    ['RAID10', 'RAID5', 'RAID0']
  )
})

test('comparison sorting reads raw numeric values for every data metric', () => {
  const columns = [
    ['usableTB', ['RAID0', 'RAID5', 'RAID10']],
    ['efficiencyInstalled', ['RAID5', 'RAID0', 'RAID10']],
    ['readBandwidthMBps', ['RAID0', 'RAID10', 'RAID5']],
    ['readIops', ['RAID0', 'RAID10', 'RAID5']],
    ['writeBandwidthMBps', ['RAID10', 'RAID5', 'RAID0']],
    ['writeIops', ['RAID5', 'RAID10', 'RAID0']],
    ['resilience', ['RAID0', 'RAID5', 'RAID10']]
  ]

  for (const [key, expected] of columns) {
    assert.deepEqual(
      sortRaidComparison(rows, { key, direction: 'ascending' }).map(row => row.raid),
      expected,
      `ascending sort for ${key}`
    )
  }
})

test('comparison sorting does not mutate input and returns it unchanged without a sort', () => {
  const original = [...rows]

  assert.equal(sortRaidComparison(rows, null), rows)
  sortRaidComparison(rows, { key: 'usableTB', direction: 'ascending' })
  assert.deepEqual(rows, original)
})
