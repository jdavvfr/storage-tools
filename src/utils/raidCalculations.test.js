import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRaidComparison, calculateNominalRebuildBandwidth, calculateRaid, DEFAULT_IO_PROFILE, getValidRaidGroupCounts, ioProfiles, raidDefinitions, sortedIoProfiles } from './raidCalculations.js'

const disk = { rebuildMBps: 200, readIops: 100, writeIops: 100, readBandwidthMBps: 200, writeBandwidthMBps: 200 }
const comparisonArgs = { diskCount: 8, hotSpares: 0, diskSizeTB: 10, groupCount: 2, disk, rebuildLoad: 40 }

test('valid RAID 50/60 group counts respect equal groups and minimum group sizes', () => {
  assert.deepEqual(getValidRaidGroupCounts('RAID50', 12), [2, 3, 4])
  assert.deepEqual(getValidRaidGroupCounts('RAID60', 12), [2, 3])
  assert.deepEqual(getValidRaidGroupCounts('RAID50', 10), [2])
  assert.deepEqual(getValidRaidGroupCounts('RAID60', 9), [])
  assert.deepEqual(getValidRaidGroupCounts('RAID5', 12), [])
  assert.deepEqual(getValidRaidGroupCounts('RAID50', 12.5), [])
})

test('RAID 50/60 reject group counts outside the valid disk configuration', () => {
  for (const args of [
    { raid: 'RAID50', diskCount: 8, groupCount: 3 },
    { raid: 'RAID50', diskCount: 8, groupCount: 9 },
    { raid: 'RAID60', diskCount: 12, groupCount: 4 }
  ]) {
    const result = calculateRaid({ ...comparisonArgs, ...args })
    assert.equal(result.valid, false)
    assert.match(result.message, /groupes|divisibles|disques actifs/)
  }
})

test('changing a valid RAID 50 group count updates capacity, IO costs, and rebuild domain', () => {
  const args = { ...comparisonArgs, raid: 'RAID50', diskCount: 12, accessPattern: 'sequential' }
  const twoGroups = calculateRaid({ ...args, groupCount: 2 })
  const fourGroups = calculateRaid({ ...args, groupCount: 4 })

  assert.equal(twoGroups.valid, true)
  assert.equal(fourGroups.valid, true)
  assert.equal(twoGroups.groupCount, 2)
  assert.equal(fourGroups.groupCount, 4)
  assert.equal(twoGroups.usableDisks, 10)
  assert.equal(fourGroups.usableDisks, 8)
  assert.equal(twoGroups.affectedGroupSize, 6)
  assert.equal(fourGroups.affectedGroupSize, 3)
  assert.notEqual(twoGroups.ioCosts.writeWrites, fourGroups.ioCosts.writeWrites)
  assert.notEqual(twoGroups.rebuild.realistic, fourGroups.rebuild.realistic)
})

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

test('IOPS and rebuild estimates can be enabled together', () => {
  const args = { ...comparisonArgs, raid: 'RAID5', calculateIops: true, calculateRebuild: true }
  const result = calculateRaid(args)
  const comparisonRow = buildRaidComparison(args).find(row => row.raid === 'RAID5')

  assert.equal(result.valid, true)
  assert.ok(result.totalIops > 0)
  assert.ok(result.rebuild.realistic > 0)
  assert.equal(comparisonRow.result.totalIops, result.totalIops)
  assert.equal(comparisonRow.result.rebuild.realistic, result.rebuild.realistic)
})

test('custom disk performance drives IOPS, bandwidth, comparison, and nominal rebuild', () => {
  const customizedDisk = {
    ...disk,
    readIops: 50,
    writeIops: 25,
    readBandwidthMBps: 300,
    writeBandwidthMBps: 400
  }
  const calculationDisk = {
    ...customizedDisk,
    rebuildMBps: calculateNominalRebuildBandwidth(disk, customizedDisk)
  }
  const args = { ...comparisonArgs, disk: calculationDisk, raid: 'RAID5' }
  const result = calculateRaid(args)
  const comparisonRow = buildRaidComparison(args).find(row => row.raid === 'RAID5')
  const referenceResult = calculateRaid({ ...args, disk })

  assert.equal(result.valid, true)
  assert.equal(result.effectiveDiskReadIops, 50)
  assert.equal(result.effectiveDiskWriteIops, 25)
  assert.equal(result.readBandwidthMBps, 8 * 300)
  assert.equal(result.writeBandwidthMBps, 7 * 400)
  assert.notEqual(result.totalIops, referenceResult.totalIops)
  assert.equal(comparisonRow.result.totalIops, result.totalIops)
  assert.equal(comparisonRow.result.readBandwidthMBps, result.readBandwidthMBps)
  assert.equal(calculationDisk.rebuildMBps, 300)
  assert.equal(result.rebuild.optimistic, referenceResult.rebuild.optimistic / 1.5)
  assert.equal(comparisonRow.result.rebuild.optimistic, result.rebuild.optimistic)
})

test('invalid disk performance values are rejected before estimates are calculated', () => {
  for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = calculateRaid({
      ...comparisonArgs,
      raid: 'RAID5',
      disk: { ...disk, readIops: value }
    })

    assert.equal(result.valid, false)
    assert.match(result.message, /performances du disque/)
  }
})

test('capacity remains available when IOPS and rebuild calculations are disabled independently', () => {
  const full = calculateRaid({ ...comparisonArgs, raid: 'RAID5' })
  const capacityOnly = calculateRaid({ ...comparisonArgs, raid: 'RAID5', calculateIops: false, calculateRebuild: false })
  const withIopsOnly = calculateRaid({ ...comparisonArgs, raid: 'RAID5', calculateIops: true, calculateRebuild: false })
  const withRebuildOnly = calculateRaid({ ...comparisonArgs, raid: 'RAID5', calculateIops: false, calculateRebuild: true })

  for (const result of [capacityOnly, withIopsOnly, withRebuildOnly]) {
    assert.equal(result.valid, true)
    assert.equal(result.usableTB, full.usableTB)
    assert.equal(result.usableTiB, full.usableTiB)
    assert.equal(result.installedRawTB, full.installedRawTB)
  }
  assert.equal(capacityOnly.totalIops, null)
  assert.equal(capacityOnly.ioCosts, null)
  assert.equal(capacityOnly.rebuild.realistic, null)
  assert.equal(withIopsOnly.totalIops, full.totalIops)
  assert.equal(withIopsOnly.rebuild.realistic, null)
  assert.equal(withRebuildOnly.totalIops, null)
  assert.equal(withRebuildOnly.rebuild.realistic, full.rebuild.realistic)
})

test('IOPS-specific input validation is skipped when IOPS estimates are disabled', () => {
  const result = calculateRaid({
    ...comparisonArgs,
    raid: 'RAID5',
    readPercent: 150,
    accessPattern: 'unsupported',
    blockSizeKiB: 0,
    calculateIops: false,
    calculateRebuild: false
  })

  assert.equal(result.valid, true)
  assert.equal(result.usableTB, 70)
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
  assert.deepEqual(
    sortedIoProfiles.map(([, profile]) => profile.label),
    ['Fichiers NAS', 'Personnalisé', 'Sauvegarde', 'Vidéosurveillance', 'Virtualisation']
  )

  for (const profile of Object.values(ioProfiles)) {
    assert.ok(profile.readPercent >= 0 && profile.readPercent <= 100)
    assert.ok(['random', 'sequential'].includes(profile.accessPattern))
    assert.ok(profile.blockSizeKiB > 0)
    assert.ok(profile.recommendation.length > 0)
  }

  assert.equal(ioProfiles.virtualization.accessPattern, 'random')
  assert.equal(ioProfiles.virtualization.blockSizeKiB, 8)
  assert.equal(ioProfiles.virtualization.readPercent, 70)
  assert.equal(ioProfiles.files.blockSizeKiB, 64)
  assert.equal(ioProfiles.backup.accessPattern, 'sequential')
  assert.equal(ioProfiles.backup.readPercent, 0)
  assert.equal(ioProfiles.surveillance.readPercent, 10)
  assert.equal(ioProfiles.surveillance.accessPattern, 'sequential')
  assert.equal(ioProfiles.surveillance.blockSizeKiB, 256)
  assert.match(ioProfiles.surveillance.recommendation, /enregistrement continu/)
})

test('Virtualisation is the consistent default IO profile', () => {
  assert.equal(DEFAULT_IO_PROFILE, 'virtualization')
  assert.equal(ioProfiles[DEFAULT_IO_PROFILE].readPercent, 70)
  assert.equal(ioProfiles[DEFAULT_IO_PROFILE].accessPattern, 'random')
  assert.equal(ioProfiles[DEFAULT_IO_PROFILE].blockSizeKiB, 8)
})

test('selected usage profiles drive RAID IOPS estimates from their workload settings', () => {
  const highIopsDisk = { ...disk, readIops: 10000, writeIops: 10000 }
  const resultForProfile = profile => calculateRaid({
    ...comparisonArgs,
    disk: highIopsDisk,
    raid: 'RAID5',
    ...profile
  })
  const surveillance = resultForProfile(ioProfiles.surveillance)
  const backup = resultForProfile(ioProfiles.backup)
  const files = resultForProfile(ioProfiles.files)

  assert.notEqual(surveillance.totalIops, backup.totalIops)
  assert.notEqual(surveillance.ioCosts.writeReads, backup.ioCosts.writeReads)
  assert.notEqual(surveillance.effectiveDiskReadIops, files.effectiveDiskReadIops)
})

test('invalid workload ratios and block sizes are rejected', () => {
  assert.match(calculateRaid({ ...comparisonArgs, raid: 'RAID5', readPercent: 101 }).message, /entre 0 et 100 %/)
  assert.match(calculateRaid({ ...comparisonArgs, raid: 'RAID5', blockSizeKiB: 0 }).message, /taille de bloc/)
  assert.match(calculateRaid({ ...comparisonArgs, raid: 'RAID5', accessPattern: 'unknown' }).message, /type d’accès/)
})
