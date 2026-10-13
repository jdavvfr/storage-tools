import assert from 'node:assert/strict'
import test from 'node:test'
import { RECOMMENDATION_DRIVE_TYPES, RECOMMENDATION_PLATFORMS, RECOMMENDATION_WORKLOADS } from '../data/raidRecommendation.js'
import { tbToTiB } from './raidCalculations.js'
import {
  BASE_RECOMMENDATION_WEIGHTS,
  BASE_WORKLOAD_WEIGHTS,
  calculateRecommendationExposure,
  DRIVE_SIZE_RISK_POINTS,
  getDriveSizeRiskFactor,
  getWidthRiskFactor,
  recommendRaid,
  PARITY_RISK_FACTORS,
  RAID_RESILIENCE_BASE_SCORES,
  RISK_SCORE_REFERENCE,
  WORKLOAD_CAPACITY_RESERVES,
  WORKLOAD_RISK_FACTORS
} from './raidRecommendation.js'

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

function roundedBreakdown(candidate) {
  return Object.fromEntries(Object.entries(candidate.scoreBreakdown).map(([key, value]) => [
    key,
    Math.round(value * 10) / 10
  ]))
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
  assert.equal(candidate.exposureIndex, calculateRecommendationExposure({
    raid: candidate.raid,
    rebuildHours: candidate.result.rebuild.realistic,
    groupWidth: candidate.groupSize,
    diskSizeTB: candidate.diskSizeTB,
    workload: 'virtualization',
    utilizationFactor: candidate.utilizationFactor
  }))
  assert.equal(candidate.result.affectedGroupSize, 8)
})

test('RiskIndex applies unitless parity, interpolated size, progressive width, workload, and utilization factors', () => {
  assert.equal(PARITY_RISK_FACTORS.RAID5, 2.4)
  assert.equal(PARITY_RISK_FACTORS.RAID50, 2.2)
  assert.equal(PARITY_RISK_FACTORS.RAID6, 0.75)
  assert.equal(PARITY_RISK_FACTORS.RAID60, 0.65)
  assert.equal(PARITY_RISK_FACTORS.RAID10, 0.55)
  assert.ok(Math.abs(calculateRecommendationExposure({
    raid: 'RAID50',
    rebuildHours: 10,
    groupWidth: 8,
    diskSizeTB: 10
  }) - 261.36) < 1e-10)
  assert.equal(getDriveSizeRiskFactor('RAID50', 4), 1)
  assert.equal(getDriveSizeRiskFactor('RAID50', 5), 1.075)
  assert.equal(getDriveSizeRiskFactor('RAID50', 6), 1.15)
  assert.equal(getDriveSizeRiskFactor('RAID50', 8), 1.15)
  assert.equal(getDriveSizeRiskFactor('RAID50', 10), 1.35)
  assert.equal(getDriveSizeRiskFactor('RAID50', 12), 1.6)
  assert.equal(getDriveSizeRiskFactor('RAID50', 14), 2)
  assert.equal(getDriveSizeRiskFactor('RAID50', 16), 2)
  assert.equal(getDriveSizeRiskFactor('RAID50', 18), 2.4)
  assert.equal(getDriveSizeRiskFactor('RAID50', 20), 2.9)
  assert.equal(getDriveSizeRiskFactor('RAID50', 22), 3.5)
  assert.equal(getDriveSizeRiskFactor('RAID50', 24), 4.2)
  assert.equal(getDriveSizeRiskFactor('RAID50', 30), 4.2)
  assert.equal(getDriveSizeRiskFactor('RAID60', 24), 1.18)
  assert.equal(getDriveSizeRiskFactor('RAID10', 24), 1.18)
  assert.ok(getDriveSizeRiskFactor('RAID60', 24) < getDriveSizeRiskFactor('RAID50', 24))
  assert.equal(getWidthRiskFactor('RAID50', 8), 1)
  assert.equal(getWidthRiskFactor('RAID50', 10), 1.16)
  assert.equal(getWidthRiskFactor('RAID50', 14), 1.72)
  assert.equal(getWidthRiskFactor('RAID60', 12), 1)
  assert.equal(getWidthRiskFactor('RAID60', 14), 1.12)
  assert.equal(getWidthRiskFactor('RAID60', 16), 1.4)
  assert.equal(getWidthRiskFactor('RAID10', 2), 1)
  assert.equal(getWidthRiskFactor('RAID10', 20), 1)
  assert.ok(Math.abs(calculateRecommendationExposure({
    raid: 'RAID50',
    rebuildHours: 10,
    groupWidth: 8,
    diskSizeTB: 22
  }) - 10 * 8 * 2.2 * 3.5 * 1.1) < 1e-10)
  assert.ok(Math.abs(calculateRecommendationExposure({
    raid: 'RAID60',
    rebuildHours: 10,
    groupWidth: 8,
    diskSizeTB: 22
  }) - 10 * 8 * 0.65 * 1.15 * 1.1) < 1e-10)
  assert.ok(calculateRecommendationExposure({
    raid: 'RAID50',
    rebuildHours: 10,
    groupWidth: 8,
    diskSizeTB: 10,
    workload: 'database',
    utilizationFactor: 1.1
  }) > calculateRecommendationExposure({
    raid: 'RAID50',
    rebuildHours: 10,
    groupWidth: 8,
    diskSizeTB: 10,
    workload: 'backup',
    utilizationFactor: 1
  }))
  assert.equal(getDriveSizeRiskFactor('RAID0', 22), null)
  assert.equal(calculateRecommendationExposure({
    raid: 'RAID60',
    rebuildHours: -1,
    groupWidth: 8,
    diskSizeTB: 22
  }), null)
  assert.deepEqual(DRIVE_SIZE_RISK_POINTS, [
    [4, 1], [6, 1.15], [8, 1.15], [10, 1.35], [12, 1.6], [14, 2],
    [16, 2], [18, 2.4], [20, 2.9], [22, 3.5], [24, 4.2]
  ])
  assert.equal(WORKLOAD_RISK_FACTORS.database, 1.2)
  assert.equal(RISK_SCORE_REFERENCE, 3000)
  assert.deepEqual(RAID_RESILIENCE_BASE_SCORES, {
    RAID5: 30, RAID50: 38, RAID6: 78, RAID60: 88, RAID10: 82
  })
  assert.deepEqual(WORKLOAD_CAPACITY_RESERVES, {
    backup: 0.20,
    archive: 0.20,
    surveillance: 0.15,
    virtualization: 0.15,
    database: 0.20,
    general: 0.15
  })
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

test('six bounded scores sum to normalized workload weights and high-IOPS workloads favor RAID10', () => {
  const balanced = recommendRaid({ ...baseInput, targetCapacity: 1, maxDriveCapacityTB: 2 })
  const backup = recommendRaid({ ...baseInput, targetCapacity: 1, maxDriveCapacityTB: 2, workload: 'backup' })
  const resilient = recommendRaid({ ...baseInput, targetCapacity: 1, maxDriveCapacityTB: 2, optimization: 'resilience' })
  const database = recommendRaid({ ...baseInput, targetCapacity: 1, maxDriveCapacityTB: 2, workload: 'database' })
  const videoResilience = recommendRaid({
    ...baseInput,
    targetCapacity: 90,
    maxDriveCapacityTB: 2,
    maxDiskCount: 60,
    workload: 'surveillance',
    optimization: 'resilience'
  })

  for (const result of [balanced, backup, resilient, database, videoResilience]) {
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
  assert.ok(videoResilience.candidates.some(candidate => candidate.raid === 'RAID60'))
  assert.deepEqual(BASE_RECOMMENDATION_WEIGHTS, {
    capacity: 0.18,
    efficiency: 0.07,
    performance: 0.08,
    rebuild: 0.12,
    risk: 0.25,
    resilience: 0.30
  })
  assert.equal(Object.values(BASE_RECOMMENDATION_WEIGHTS).reduce((sum, value) => sum + value, 0), 1)
  assert.deepEqual(backup.weights, BASE_RECOMMENDATION_WEIGHTS)
  for (const profile of ['balanced', 'capacity', 'resilience']) {
    const backupResult = recommendRaid({ ...baseInput, targetCapacity: 1, maxDriveCapacityTB: 2, workload: 'backup', optimization: profile })
    assert.deepEqual(backupResult.weights, BASE_RECOMMENDATION_WEIGHTS)
  }
  assert.deepEqual(BASE_WORKLOAD_WEIGHTS.database, {
    capacity: 0.10, efficiency: 0.05, performance: 0.40, rebuild: 0.08, risk: 0.17, resilience: 0.20
  })
  for (const workload of Object.keys(BASE_WORKLOAD_WEIGHTS)) {
    for (const optimization of ['capacity', 'balanced', 'resilience']) {
      const result = recommendRaid({ ...baseInput, targetCapacity: 1, maxDriveCapacityTB: 2, workload, optimization })
      assert.ok(Math.abs(Object.values(result.weights).reduce((sum, value) => sum + value, 0) - 1) < 1e-12)
      if (workload === 'backup') assert.deepEqual(result.weights, BASE_RECOMMENDATION_WEIGHTS)
    }
  }
  assert.equal(balanced.candidates[0].scoreBreakdown.risk, 100 / (1 + balanced.candidates[0].riskIndex / RISK_SCORE_REFERENCE))
  const expandedCandidates = recommendRaid({ ...baseInput, targetCapacity: 1, maxDriveCapacityTB: 3 })
  const sameCandidate = result =>
    result.candidates.find(candidate => candidate.raid === 'RAID6' && candidate.diskCount === 8 && candidate.diskSizeTB === 2)
  assert.equal(sameCandidate(balanced).riskIndex, sameCandidate(expandedCandidates).riskIndex)
  assert.equal(sameCandidate(balanced).scoreBreakdown.risk, sameCandidate(expandedCandidates).scoreBreakdown.risk)
  assert.ok(database.weights.performance > backup.weights.performance)
})

test('24-drive backup scenarios rank RAID60 ahead of RAID50 with a growing score and risk gap', () => {
  const cases = [
    {
      diskSizeTB: 10, targetCapacity: 150,
      raid50Breakdown: [98.3, 87.5, 60, 70.1, 84.1, 35.2],
      raid60Breakdown: [90, 75, 0, 70.1, 95.9, 88]
    },
    {
      diskSizeTB: 20, targetCapacity: 300,
      raid50Breakdown: [98.3, 87.5, 60, 54, 55.1, 22.8],
      raid60Breakdown: [90, 75, 0, 54, 91.2, 83.2]
    },
    {
      diskSizeTB: 22, targetCapacity: 330,
      raid50Breakdown: [98.3, 87.5, 60, 51.6, 48.1, 18],
      raid60Breakdown: [90, 75, 0, 51.6, 90.2, 82]
    },
    {
      diskSizeTB: 24, targetCapacity: 360,
      raid50Breakdown: [98.3, 87.5, 60, 49.5, 41.4, 12.4],
      raid60Breakdown: [90, 75, 0, 49.5, 89.2, 80.8]
    }
  ]

  let previousRiskGap = -Infinity
  let previousRiskIndexGap = -Infinity
  for (const { diskSizeTB, targetCapacity, raid50Breakdown, raid60Breakdown } of cases) {
    const result = recommendRaid({
      ...baseInput,
      targetCapacity,
      maxDriveCapacityTB: diskSizeTB,
      maxDiskCount: 24,
      workload: 'backup',
      optimization: 'capacity'
    })
    const raid50 = result.candidates.find(candidate =>
      candidate.raid === 'RAID50' && candidate.diskCount === 24 &&
      candidate.diskSizeTB === diskSizeTB && candidate.groupCount === 3
    )
    const raid60 = result.candidates.find(candidate =>
      candidate.raid === 'RAID60' && candidate.diskCount === 24 &&
      candidate.diskSizeTB === diskSizeTB && candidate.groupCount === 3
    )

    assert.ok(raid50, `expected capacity-eligible RAID50 24x${diskSizeTB}`)
    assert.ok(raid60, `expected capacity-eligible RAID60 24x${diskSizeTB}`)
    assert.ok(raid60.result.usableTB >= targetCapacity)
    assert.ok(raid60.score > raid50.score, `RAID60 should outscore RAID50 at ${diskSizeTB} TB`)
    assert.deepEqual(Object.keys(raid50.scoreBreakdown), ['capacity', 'efficiency', 'performance', 'rebuild', 'risk', 'resilience'])
    assert.deepEqual(
      Object.values(roundedBreakdown(raid50)),
      raid50Breakdown
    )
    assert.deepEqual(
      Object.values(roundedBreakdown(raid60)),
      raid60Breakdown
    )
    assert.ok(raid50.scoreBreakdown.risk < raid60.scoreBreakdown.risk)
    const riskGap = raid60.scoreBreakdown.risk - raid50.scoreBreakdown.risk
    assert.ok(riskGap > previousRiskGap, `risk-score gap should grow at ${diskSizeTB} TB`)
    previousRiskGap = riskGap
    const riskIndexGap = raid50.exposureIndex - raid60.exposureIndex
    assert.ok(riskIndexGap > previousRiskIndexGap, `absolute RiskIndex gap should grow at ${diskSizeTB} TB`)
    previousRiskIndexGap = riskIndexGap
  }
})

test('reserve-aware capacity filtering and hard performance floors preserve feasible RAID50 options', () => {
  const capacityLimited = recommendRaid({
    ...baseInput,
    targetCapacity: 340,
    maxDriveCapacityTB: 20,
    maxDiskCount: 24,
    workload: 'backup',
    optimization: 'capacity'
  })
  assert.ok(capacityLimited.candidates.some(candidate => candidate.raid === 'RAID50'))
  assert.ok(capacityLimited.candidates.every(candidate => candidate.raid !== 'RAID60'))

  const reserveFiltered = recommendRaid({
    ...baseInput,
    targetCapacity: 384,
    maxDriveCapacityTB: 20,
    maxDiskCount: 24,
    workload: 'backup'
  })
  assert.equal(reserveFiltered.failureReason, 'capacity')
  assert.ok(Math.abs(reserveFiltered.requiredCapacityTB - 460.8) < 1e-10)
  assert.equal(reserveFiltered.candidates.length, 0)

  const performanceDriven = recommendRaid({
    ...baseInput,
    targetCapacity: 1,
    maxDriveCapacityTB: 2,
    maxDiskCount: 12,
    workload: 'backup',
    optimization: 'capacity',
    targetBandwidthMBps: 2000
  })
  assert.ok(performanceDriven.candidates.length < recommendRaid({
    ...baseInput,
    targetCapacity: 1,
    maxDriveCapacityTB: 2,
    maxDiskCount: 12,
    workload: 'backup',
    optimization: 'capacity'
  }).candidates.length)
  assert.ok(performanceDriven.candidates.some(candidate =>
    candidate.raid === 'RAID50' && candidate.estimatedBandwidthMBps >= 2000
  ))
})

test('surveillance, virtualization, and high-IOPS database scenarios keep suitable alternatives competitive', () => {
  const surveillance = recommendRaid({
    ...baseInput,
    targetCapacity: 26,
    maxDriveCapacityTB: 4,
    maxDiskCount: 12,
    workload: 'surveillance'
  })
  const virtualization = recommendRaid({
    ...baseInput,
    targetCapacity: 40,
    maxDriveCapacityTB: 8,
    maxDiskCount: 12,
    workload: 'virtualization'
  })
  const database = recommendRaid({
    ...baseInput,
    targetCapacity: 7,
    driveType: 'SSD SATA',
    maxDriveCapacityTB: 3.84,
    maxDiskCount: 8,
    workload: 'database',
    targetIops: 50000
  })

  assert.equal(surveillance.requiredCapacityTB, 29.9)
  assert.ok(surveillance.candidates.every(candidate => candidate.result.usableTB >= 29.9))
  assert.ok(surveillance.candidates.some(candidate => candidate.raid === 'RAID6'))
  assert.equal(virtualization.recommendations[0].raid, 'RAID10')
  assert.equal(database.recommendations[0].raid, 'RAID10')
  assert.ok(database.recommendations[0].estimatedIops >= 50000)
  assert.ok(database.weights.performance > 0.35)
  assert.equal(database.comparison.rankedWinners[0], database.recommendations[0])
  assert.ok(database.recommendations[0].scoreReasons.length > 0)
})

test('seven requested scenarios have stable, measured top-ranked recommendations and all six scores', () => {
  const cases = [
    {
      targetCapacity: 150, maxDriveCapacityTB: 10, maxDiskCount: 24, workload: 'backup',
      topId: 'RAID60-24-10-2', score: 84.4, breakdown: [95.6, 83.3, 40, 69.1, 93.8, 88],
      alternativeId: 'RAID60-24-10-3', alternativeScore: 80.2,
      alternativeBreakdown: [90, 75, 0, 70.1, 95.9, 88]
    },
    {
      targetCapacity: 300, maxDriveCapacityTB: 20, maxDiskCount: 24, workload: 'backup',
      topId: 'RAID60-24-18-2', score: 79.3, breakdown: [90, 83.3, 40, 55.4, 88.3, 84.4],
      alternativeId: 'RAID60-24-20-2', alternativeScore: 79.3,
      alternativeBreakdown: [95.6, 83.3, 40, 52.7, 87.1, 83.2]
    },
    {
      targetCapacity: 330, maxDriveCapacityTB: 22, maxDiskCount: 24, workload: 'backup',
      topId: 'RAID60-24-20-2', score: 78.3, breakdown: [90.5, 83.3, 40, 52.7, 86.9, 83.2],
      alternativeId: 'RAID60-24-22-2', alternativeScore: 78.3,
      alternativeBreakdown: [95.6, 83.3, 40, 50.4, 85.7, 82]
    },
    {
      targetCapacity: 360, maxDriveCapacityTB: 24, maxDiskCount: 24, workload: 'backup',
      topId: 'RAID60-24-22-2', score: 77.4, breakdown: [90.9, 83.3, 40, 50.4, 85.4, 82],
      alternativeId: 'RAID60-24-24-2', alternativeScore: 77.3,
      alternativeBreakdown: [95.6, 83.3, 40, 48.2, 84.2, 80.8]
    },
    {
      targetCapacity: 26, maxDriveCapacityTB: 4, maxDiskCount: 12, workload: 'surveillance',
      topId: 'RAID6-12-4-1', score: 85.3, breakdown: [100, 83.3, 69.8, 76.7, 95.8, 77],
      alternativeId: 'RAID6-11-4-1', alternativeScore: 80.2,
      alternativeBreakdown: [100, 81.8, 36.5, 76.7, 96.1, 77]
    },
    {
      targetCapacity: 40, maxDriveCapacityTB: 8, maxDiskCount: 12, workload: 'virtualization',
      topId: 'RAID10-12-8-1', score: 85.7, breakdown: [92.2, 50, 92.7, 70.8, 99.2, 80.5],
      alternativeId: 'RAID6-12-6-1', alternativeScore: 73.6,
      alternativeBreakdown: [100, 83.3, 39, 75.4, 95.3, 76.5]
    },
    {
      targetCapacity: 7, maxDriveCapacityTB: 3.84, maxDiskCount: 8, workload: 'database',
      driveType: 'SSD SATA', targetIops: 50000, topId: 'RAID10-8-3.84-1',
      score: 91.7, breakdown: [100, 50, 97.8, 91, 99.8, 79],
      alternativeId: 'RAID10-6-3.84-1', alternativeScore: 77.7,
      alternativeBreakdown: [100, 50, 62.8, 91, 99.8, 79]
    }
  ]

  for (const scenario of cases) {
    const result = recommendRaid({
      ...baseInput,
      ...scenario,
      driveType: scenario.driveType ?? 'HDD SATA',
      targetIops: scenario.targetIops ?? '',
      targetBandwidthMBps: '',
      capacityUnit: 'To',
      optimization: 'balanced'
    })
    const [top, alternative] = result.recommendations
    assert.equal(top.id, scenario.topId)
    assert.equal(top.score, scenario.score)
    assert.deepEqual(Object.values(roundedBreakdown(top)), scenario.breakdown)
    assert.ok(alternative)
    assert.equal(alternative.id, scenario.alternativeId)
    assert.equal(alternative.score, scenario.alternativeScore)
    assert.deepEqual(Object.values(roundedBreakdown(alternative)), scenario.alternativeBreakdown)
    assert.deepEqual(Object.keys(top.scoreBreakdown), ['capacity', 'efficiency', 'performance', 'rebuild', 'risk', 'resilience'])
    assert.ok(result.candidates.every(candidate =>
      Object.values(candidate.scoreBreakdown).every(value => value >= 0 && value <= 100)
    ))
    assert.ok(result.comparison.rankedWinners[0] === top && result.comparison.rankedWinners[1] === alternative)
    assert.ok(Math.abs(Object.values(result.weights).reduce((sum, value) => sum + value, 0) - 1) < 1e-12)
  }
})

test('custom maximum drive capacity is directly considered in candidate generation', () => {
  const result = recommendRaid({
    ...baseInput,
    targetCapacity: 250,
    maxDriveCapacityTB: 20.5,
    maxDiskCount: 16
  })

  assert.ok(result.candidates.some(candidate => candidate.diskSizeTB === 20.5))
  assert.ok(result.candidates.every(candidate => candidate.diskSizeTB <= 20.5))
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
