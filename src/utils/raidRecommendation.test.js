import assert from 'node:assert/strict'
import test from 'node:test'
import { RECOMMENDATION_DRIVE_TYPES, RECOMMENDATION_PLATFORMS, RECOMMENDATION_WORKLOADS } from '../data/raidRecommendation.js'
import { tbToTiB } from './raidCalculations.js'
import { recommendRaid } from './raidRecommendation.js'

const baseInput = {
  targetCapacity: 100,
  capacityUnit: 'To',
  driveType: 'HDD SATA',
  maxDriveCapacityTB: 24,
  maxDiskCount: 24,
  workload: 'virtualization',
  targetIops: '',
  targetBandwidthMBps: '',
  optimization: 'balanced'
}

test('recommendations meet the target capacity and convert TiB targets without unit mixing', () => {
  const decimal = recommendRaid(baseInput)
  const binary = recommendRaid({
    ...baseInput,
    targetCapacity: tbToTiB(baseInput.targetCapacity),
    capacityUnit: 'TiB'
  })

  assert.equal(decimal.valid, true)
  assert.ok(decimal.recommendations.length >= 1)
  assert.ok(decimal.recommendations.length <= 2)
  assert.ok(decimal.candidates.every(candidate => candidate.result.usableTB >= 100))
  assert.ok(decimal.candidates.every(candidate =>
    candidate.diskCount <= baseInput.maxDiskCount &&
    candidate.diskSizeTB <= baseInput.maxDriveCapacityTB
  ))
  assert.equal(binary.targetCapacityTB, decimal.targetCapacityTB)
  assert.deepEqual(
    binary.recommendations.map(candidate => candidate.id),
    decimal.recommendations.map(candidate => candidate.id)
  )
})

test('RAID 50/60 include every valid 24-drive split and expose group layout', () => {
  const result = recommendRaid({ ...baseInput, targetCapacity: 1, maxDriveCapacityTB: 2 })
  const raid50Layouts = result.candidates.filter(candidate => candidate.raid === 'RAID50' && candidate.diskCount === 24 && candidate.diskSizeTB === 2)
  const raid60Layouts = result.candidates.filter(candidate => candidate.raid === 'RAID60' && candidate.diskCount === 24 && candidate.diskSizeTB === 2)

  for (const expected of ['2 × (11+1)', '3 × (7+1)', '4 × (5+1)', '6 × (3+1)', '8 × (2+1)']) {
    assert.ok(raid50Layouts.some(candidate => candidate.layout === expected), `missing RAID50 ${expected}`)
  }
  for (const expected of ['2 × (10+2)', '3 × (6+2)', '4 × (4+2)', '6 × (2+2)']) {
    assert.ok(raid60Layouts.some(candidate => candidate.layout === expected), `missing RAID60 ${expected}`)
  }
  assert.ok(raid50Layouts.every(candidate => candidate.diskCount <= 24 && candidate.result.usableDisks > 0))
  assert.ok(raid60Layouts.every(candidate => candidate.diskCount <= 24 && candidate.result.usableDisks > 0))
})

test('failure tolerance and failure domains are reported per RAID topology', () => {
  const result = recommendRaid({ ...baseInput, targetCapacity: 1, maxDriveCapacityTB: 2 })
  const candidate = (raid, diskCount, groupCount = 1) =>
    result.candidates.find(item => item.raid === raid && item.diskCount === diskCount && item.groupCount === groupCount && item.diskSizeTB === 2)

  assert.equal(candidate('RAID5', 8).failureTolerance, 1)
  assert.match(candidate('RAID5', 8).failureDomain, /groupe RAID entier/)
  assert.equal(candidate('RAID6', 8).failureTolerance, 2)
  assert.equal(candidate('RAID10', 8).failureTolerance, 4)
  assert.match(candidate('RAID10', 8).failureDomain, /paire miroir/)
  assert.equal(candidate('RAID50', 24, 3).failureTolerance, 3)
  assert.equal(candidate('RAID60', 24, 3).failureTolerance, 6)
  assert.match(candidate('RAID60', 24, 3).failureDomain, /troisième panne/)
})

test('rebuild duration and exposure reuse the RAID calculator workload assumptions', () => {
  const result = recommendRaid({ ...baseInput, targetCapacity: 1, maxDriveCapacityTB: 2 })
  const candidate = result.candidates.find(item =>
    item.raid === 'RAID60' && item.diskCount === 24 && item.groupCount === 3 && item.diskSizeTB === 2
  )

  assert.ok(candidate.result.rebuild.optimistic > 0)
  assert.ok(candidate.result.rebuild.realistic > candidate.result.rebuild.optimistic)
  assert.equal(candidate.result.rebuild.exposureIndex, candidate.result.rebuild.realistic * 8)
  assert.equal(candidate.result.affectedGroupSize, 8)
})

test('performance targets filter candidates and impossible requirements are explicit', () => {
  const baseline = recommendRaid({ ...baseInput, targetCapacity: 1, maxDriveCapacityTB: 2 })
  const iopsLimited = recommendRaid({ ...baseInput, targetCapacity: 1, maxDriveCapacityTB: 2, targetIops: 1e12 })
  const bandwidthLimited = recommendRaid({ ...baseInput, targetCapacity: 1, maxDriveCapacityTB: 2, targetBandwidthMBps: 1e12 })

  assert.ok(baseline.candidates.length > 0)
  assert.equal(iopsLimited.failureReason, 'performance')
  assert.equal(iopsLimited.recommendations.length, 0)
  assert.equal(bandwidthLimited.failureReason, 'performance')
  assert.ok(recommendRaid({ ...baseInput, targetCapacity: 1e9 }).failureReason === 'capacity')
})

test('scores stay normalized, weights sum to one, and workload/optimization changes weighting', () => {
  const balanced = recommendRaid({ ...baseInput, targetCapacity: 1, maxDriveCapacityTB: 2 })
  const backup = recommendRaid({ ...baseInput, targetCapacity: 1, maxDriveCapacityTB: 2, workload: 'backup' })
  const resilient = recommendRaid({ ...baseInput, targetCapacity: 1, maxDriveCapacityTB: 2, optimization: 'resilience' })
  const database = recommendRaid({ ...baseInput, targetCapacity: 1, maxDriveCapacityTB: 2, workload: 'database' })
  const videoResilience = recommendRaid({
    ...baseInput,
    targetCapacity: 100,
    maxDriveCapacityTB: 2,
    maxDiskCount: 60,
    workload: 'surveillance',
    optimization: 'resilience'
  })

  for (const result of [balanced, backup, resilient]) {
    assert.ok(Math.abs(Object.values(result.weights).reduce((sum, value) => sum + value, 0) - 1) < 1e-12)
    for (const candidate of result.candidates) {
      assert.ok(Number.isFinite(candidate.score))
      assert.ok(candidate.score >= 0 && candidate.score <= 100)
      assert.ok(Object.values(candidate.scoreBreakdown).every(value => value >= 0 && value <= 100))
    }
    assert.ok(result.candidates.every((candidate, index, candidates) =>
      index === 0 || candidates[index - 1].score >= candidate.score
    ))
  }
  assert.notDeepEqual(backup.weights, balanced.weights)
  assert.notDeepEqual(resilient.weights, balanced.weights)
  assert.equal(database.recommendations[0].raid, 'RAID10')
  assert.ok(videoResilience.recommendations.some(candidate => candidate.raid === 'RAID60'))
})

test('platform drive-bay maximum is enforced by the decision engine', () => {
  const result = recommendRaid({
    ...baseInput,
    maxDiskCount: 61,
    platformMaxDriveCount: 60
  })

  assert.equal(result.valid, false)
  assert.equal(result.failureReason, 'invalid-input')
})

test('market reference catalog includes requested capacities, platforms, and workload-to-profile mappings', () => {
  assert.deepEqual(Object.keys(RECOMMENDATION_DRIVE_TYPES), ['HDD SATA', 'HDD SAS', 'SSD SATA', 'SSD SAS', 'NVMe'])
  for (const drive of Object.values(RECOMMENDATION_DRIVE_TYPES)) {
    assert.ok(drive.capacitiesTB.length > 0)
    assert.ok(drive.capacitiesTB.every(size => Number.isFinite(size) && size > 0))
  }
  assert.equal(RECOMMENDATION_PLATFORMS.find(platform => platform.id === 'dell-md2460').driveBays, 60)
  assert.equal(RECOMMENDATION_PLATFORMS.find(platform => platform.id === 'hpe-alletra-68lff').driveBays, 68)
  assert.equal(RECOMMENDATION_PLATFORMS.find(platform => platform.id === 'hpe-alletra-92lff').driveBays, 92)
  assert.deepEqual(Object.fromEntries(Object.entries(RECOMMENDATION_WORKLOADS).map(([key, item]) => [key, item.ioProfile])), {
    backup: 'backup',
    virtualization: 'virtualization',
    database: 'database',
    surveillance: 'surveillance'
  })
})
