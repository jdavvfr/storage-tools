import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRaidComparison, calculateRaid, ioProfiles, raidDefinitions } from './raidCalculations.js'

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

test('mixed-workload logical IOPS account for each RAID write penalty', () => {
  const comparison = buildRaidComparison({ ...comparisonArgs, readPercent: 70, blockSizeKiB: 4 })
    .filter(row => row.result.valid)
  const results = Object.fromEntries(comparison.map(row => [row.raid, row.result]))

  assert.equal(comparison.length, Object.keys(raidDefinitions).length)
  assert.ok(results.RAID0.totalIops > results.RAID5.totalIops)
  assert.ok(results.RAID5.totalIops > results.RAID6.totalIops)
  assert.equal(results.RAID1.totalIops, results.RAID10.totalIops)
  assert.equal(results.RAID5.totalIops, results.RAID50.totalIops)
  assert.equal(results.RAID6.totalIops, results.RAID60.totalIops)
  for (const result of Object.values(results)) {
    assert.equal(result.readIops + result.writeIops, result.totalIops)
    assert.equal(result.readPercent + result.writePercent, 100)
  }
})

test('read/write ratio changes logical IOPS and allows pure read or write workloads', () => {
  const readHeavy = calculateRaid({ ...comparisonArgs, raid: 'RAID5', readPercent: 90 })
  const writeHeavy = calculateRaid({ ...comparisonArgs, raid: 'RAID5', readPercent: 10 })
  const readsOnly = calculateRaid({ ...comparisonArgs, raid: 'RAID5', readPercent: 100 })
  const writesOnly = calculateRaid({ ...comparisonArgs, raid: 'RAID5', readPercent: 0 })

  assert.ok(readHeavy.totalIops > writeHeavy.totalIops)
  assert.equal(readsOnly.readIops, readsOnly.totalIops)
  assert.equal(readsOnly.writeIops, 0)
  assert.equal(writesOnly.readIops, 0)
  assert.equal(writesOnly.writeIops, writesOnly.totalIops)
  assert.equal(writesOnly.ioCosts.writeReads, 2)
  assert.equal(writesOnly.ioCosts.writeWrites, 2)
})

test('sequential parity writes use full-stripe costs and larger blocks hit bandwidth limits', () => {
  const smallRandom = calculateRaid({ ...comparisonArgs, raid: 'RAID5', readPercent: 0, blockSizeKiB: 4 })
  const fullStripe = calculateRaid({ ...comparisonArgs, raid: 'RAID5', readPercent: 0, accessPattern: 'sequential', blockSizeKiB: 4 })
  const highIopsDisk = { ...disk, readIops: 10000, writeIops: 10000 }
  const smallBlock = calculateRaid({ ...comparisonArgs, disk: highIopsDisk, raid: 'RAID0', readPercent: 100, blockSizeKiB: 4 })
  const largeBlock = calculateRaid({ ...comparisonArgs, disk: highIopsDisk, raid: 'RAID0', readPercent: 100, blockSizeKiB: 256 })

  assert.equal(smallRandom.ioCosts.writeReads, 2)
  assert.equal(smallRandom.ioCosts.writeWrites, 2)
  assert.equal(fullStripe.ioCosts.readReads, 1)
  assert.equal(fullStripe.ioCosts.writeReads, 0)
  assert.equal(fullStripe.ioCosts.writeWrites, 8 / 7)
  assert.ok(fullStripe.totalIops > smallRandom.totalIops)
  assert.ok(largeBlock.totalIops < smallBlock.totalIops)
  assert.equal(largeBlock.effectiveDiskReadIops, 200 * 1_000_000 / (256 * 1024))
})

test('usage profiles provide valid ratios, access patterns, and block recommendations', () => {
  for (const profile of Object.values(ioProfiles)) {
    assert.ok(profile.readPercent >= 0 && profile.readPercent <= 100)
    assert.ok(['random', 'sequential'].includes(profile.accessPattern))
    assert.ok(profile.blockSizeKiB > 0)
    assert.ok(profile.recommendation.length > 0)
  }

  assert.equal(ioProfiles.database.accessPattern, 'random')
  assert.equal(ioProfiles.files.blockSizeKiB, 64)
  assert.equal(ioProfiles.backup.accessPattern, 'sequential')
  assert.equal(ioProfiles.backup.readPercent, 0)
})

test('invalid workload ratios and block sizes are rejected', () => {
  assert.match(calculateRaid({ ...comparisonArgs, raid: 'RAID5', readPercent: 101 }).message, /entre 0 et 100 %/)
  assert.match(calculateRaid({ ...comparisonArgs, raid: 'RAID5', blockSizeKiB: 0 }).message, /taille de bloc/)
  assert.match(calculateRaid({ ...comparisonArgs, raid: 'RAID5', accessPattern: 'unknown' }).message, /type d’accès/)
})
