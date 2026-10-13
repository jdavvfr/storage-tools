import { diskTypes } from '../data/disks.js'
import {
  OPTIMIZATION_PROFILES,
  RECOMMENDATION_DRIVE_TYPES,
  RECOMMENDATION_WORKLOADS
} from '../data/raidRecommendation.js'
import {
  calculateRaid,
  getValidRaidGroupCounts,
  ioProfiles,
  REBUILD_WORKLOAD_PROFILES,
  tiBToTB
} from './raidCalculations.js'

export const BASE_RECOMMENDATION_WEIGHTS = {
  capacity: 0.18,
  efficiency: 0.07,
  performance: 0.08,
  rebuild: 0.12,
  risk: 0.25,
  resilience: 0.30
}

// Fractions of requested usable capacity reserved before a candidate is eligible.
export const WORKLOAD_CAPACITY_RESERVES = {
  backup: 0.20,
  archive: 0.20,
  surveillance: 0.15,
  virtualization: 0.15,
  database: 0.20,
  general: 0.15
}

// Backup covers both selectable backup and archive workloads; these exact weights remain fixed.
export const BASE_WORKLOAD_WEIGHTS = {
  backup: BASE_RECOMMENDATION_WEIGHTS,
  virtualization: { capacity: 0.16, efficiency: 0.08, performance: 0.28, rebuild: 0.10, risk: 0.18, resilience: 0.20 },
  database: { capacity: 0.10, efficiency: 0.05, performance: 0.40, rebuild: 0.08, risk: 0.17, resilience: 0.20 },
  surveillance: { capacity: 0.23, efficiency: 0.12, performance: 0.15, rebuild: 0.12, risk: 0.18, resilience: 0.20 }
}

// Unitless multipliers in RiskIndex; larger parity factors represent the higher single-parity exposure.
export const PARITY_RISK_FACTORS = {
  RAID5: 2.40,
  RAID50: 2.20,
  RAID6: 0.75,
  RAID60: 0.65,
  RAID10: 0.55
}

export const DRIVE_SIZE_RISK_POINTS = [
  [4, 1.00],
  [6, 1.15],
  [8, 1.15],
  [10, 1.35],
  [12, 1.60],
  [14, 2.00],
  [16, 2.00],
  [18, 2.40],
  [20, 2.90],
  [22, 3.50],
  [24, 4.20]
]

// The size lookup and all multipliers are dimensionless; HDD single-parity risk interpolates these points.
export const WORKLOAD_RISK_FACTORS = {
  backup: 1.10,
  virtualization: 1.00,
  database: 1.20,
  surveillance: 0.95
}

// RiskIndex=3,000 maps to risk score 50; exponent p=1 in 100/(1+(RiskIndex/reference)^p).
export const RISK_SCORE_REFERENCE = 3000
// A 48-hour realistic rebuild maps to rebuild score 50 in 100/(1+hours/reference).
export const REBUILD_SCORE_REFERENCE_HOURS = 48

const WIDTH_FACTOR_LIMITS = { RAID5: 2.5, RAID50: 2.5, RAID6: 2, RAID60: 2, RAID10: 1 }
export const RAID_RESILIENCE_BASE_SCORES = { RAID5: 30, RAID50: 38, RAID6: 78, RAID60: 88, RAID10: 82 }
const RESILIENCE_WORKLOAD_DEDUCTIONS = {
  backup: 0,
  virtualization: 1.5,
  database: 3,
  surveillance: 1
}

const PERFORMANCE_FACTORS = {
  backup: { iops: 0.15, bandwidth: 0.85 },
  virtualization: { iops: 0.75, bandwidth: 0.25 },
  database: { iops: 0.9, bandwidth: 0.1 },
  surveillance: { iops: 0.1, bandwidth: 0.9 }
}

const RAID_LEVELS = ['RAID5', 'RAID6', 'RAID10', 'RAID50', 'RAID60']
const STRIPED_RAIDS = new Set(['RAID50', 'RAID60'])

function normalizeWeights(workload, optimization) {
  const baseWeights = BASE_WORKLOAD_WEIGHTS[workload]
  if (workload === 'backup') return { ...baseWeights }

  const optimizationFactors = OPTIMIZATION_PROFILES[optimization].factors
  const weighted = Object.fromEntries(
    Object.keys(baseWeights).map(key => [
      key,
      baseWeights[key] * optimizationFactors[key]
    ])
  )
  const total = Object.values(weighted).reduce((sum, value) => sum + value, 0)
  return Object.fromEntries(Object.entries(weighted).map(([key, value]) => [key, value / total]))
}

function normalize(values, lowerIsBetter = false) {
  const finiteValues = values.filter(Number.isFinite)
  const min = Math.min(...finiteValues)
  const max = Math.max(...finiteValues)
  if (max === min) return values.map(() => 100)

  return values.map(value => {
    if (!Number.isFinite(value)) return 0
    const score = lowerIsBetter ? (max - value) / (max - min) : (value - min) / (max - min)
    return Math.abs(score * 100) < 1e-10 ? 0 : Math.max(0, Math.min(100, score * 100))
  })
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value))
}

export function getDriveSizeRiskFactor(raid, diskSizeTB) {
  if (!Object.hasOwn(PARITY_RISK_FACTORS, raid) ||
      !Number.isFinite(Number(diskSizeTB)) || Number(diskSizeTB) <= 0) return null

  const size = Number(diskSizeTB)
  if (raid === 'RAID5' || raid === 'RAID50') {
    if (size <= DRIVE_SIZE_RISK_POINTS[0][0]) return DRIVE_SIZE_RISK_POINTS[0][1]
    for (let index = 1; index < DRIVE_SIZE_RISK_POINTS.length; index += 1) {
      const [upperTB, upperFactor] = DRIVE_SIZE_RISK_POINTS[index]
      const [lowerTB, lowerFactor] = DRIVE_SIZE_RISK_POINTS[index - 1]
      if (size <= upperTB) {
        return lowerFactor + (upperFactor - lowerFactor) * (size - lowerTB) / (upperTB - lowerTB)
      }
    }
    return DRIVE_SIZE_RISK_POINTS.at(-1)[1]
  }

  // Double-parity and mirror rebuilds grow only 1.5% per TB above 12 TB, capped at +30%.
  return 1 + clamp(size - 12, 0, 20) * 0.015
}

export function getWidthRiskFactor(raid, groupWidth) {
  const width = Number(groupWidth)
  if (!Object.hasOwn(WIDTH_FACTOR_LIMITS, raid) || !Number.isFinite(width) || width <= 0) return null
  let factor = 1
  // RAID50/60 use the underlying group width, not the total striped disk count.
  if (raid === 'RAID5' || raid === 'RAID50') {
    factor += Math.max(0, width - 8) * 0.08 + Math.max(0, width - 12) * 0.12
  } else if (raid === 'RAID6' || raid === 'RAID60') {
    factor += Math.max(0, width - 12) * 0.06 + Math.max(0, width - 14) * 0.08
  }
  return clamp(factor, 1, WIDTH_FACTOR_LIMITS[raid])
}

export function calculateRecommendationRiskIndex({
  raid,
  rebuildHours,
  groupWidth,
  diskSizeTB,
  workload = 'backup',
  utilizationFactor = 1
}) {
  const driveSizeFactor = getDriveSizeRiskFactor(raid, diskSizeTB)
  const widthFactor = getWidthRiskFactor(raid, groupWidth)
  const workloadRiskFactor = WORKLOAD_RISK_FACTORS[workload]
  if (driveSizeFactor === null || widthFactor === null ||
      !Number.isFinite(Number(rebuildHours)) || Number(rebuildHours) < 0 ||
      !Number.isFinite(Number(groupWidth)) || Number(groupWidth) <= 0 ||
      !Object.hasOwn(PARITY_RISK_FACTORS, raid) ||
      !Number.isFinite(Number(utilizationFactor)) ||
      Number(utilizationFactor) < 0.85 || Number(utilizationFactor) > 1.15 ||
      workloadRiskFactor === undefined) {
    return null
  }

  return Number(rebuildHours) *
    Number(groupWidth) *
    PARITY_RISK_FACTORS[raid] *
    driveSizeFactor *
    widthFactor *
    workloadRiskFactor *
    Number(utilizationFactor)
}

export const calculateRecommendationExposure = calculateRecommendationRiskIndex

function capacityReserve(workload) {
  return WORKLOAD_CAPACITY_RESERVES[workload] ?? WORKLOAD_CAPACITY_RESERVES.general
}

function resilienceScore(candidate, workload) {
  const { raid, diskSizeTB, groupSize } = candidate
  // Single parity loses 8 points per unit of interpolated disk risk; redundant rebuilds lose 0.6/TB above 12 TB.
  const drivePenalty = raid === 'RAID5' || raid === 'RAID50'
    ? (getDriveSizeRiskFactor(raid, diskSizeTB) - 1) * 8
    : Math.max(0, diskSizeTB - 12) * 0.6
  const widthPenalty = raid === 'RAID5' || raid === 'RAID50'
    ? Math.max(0, groupSize - 8) * 1.2 + Math.max(0, groupSize - 12) * 2
    : raid === 'RAID6' || raid === 'RAID60'
      ? Math.max(0, groupSize - 12) * 1 + Math.max(0, groupSize - 14) * 1.5
      : Math.max(0, groupSize - 2) * 0.25

  return clamp(
    RAID_RESILIENCE_BASE_SCORES[raid] -
      drivePenalty -
      widthPenalty -
      RESILIENCE_WORKLOAD_DEDUCTIONS[workload],
    0,
    100
  )
}

function addScores(candidates, workload, weights, requiredCapacityTB) {
  const iopsScores = normalize(candidates.map(candidate => candidate.estimatedIops))
  const bandwidthScores = normalize(candidates.map(candidate => candidate.estimatedBandwidthMBps))
  const performanceFactors = PERFORMANCE_FACTORS[workload]
  const performanceScores = candidates.map((candidate, index) =>
    iopsScores[index] * performanceFactors.iops +
    bandwidthScores[index] * performanceFactors.bandwidth
  )
  const scores = {
    capacity: candidates.map(candidate =>
      90 + clamp((candidate.result.usableTB / requiredCapacityTB - 1) / 0.2, 0, 1) * 10
    ),
    efficiency: candidates.map(candidate => clamp(candidate.result.efficiencyActive, 0, 100)),
    performance: performanceScores,
    rebuild: candidates.map(candidate =>
      100 / (1 + candidate.result.rebuild.realistic / REBUILD_SCORE_REFERENCE_HOURS)
    ),
    risk: candidates.map(candidate =>
      100 / (1 + candidate.riskIndex / RISK_SCORE_REFERENCE)
    ),
    resilience: candidates.map(candidate => resilienceScore(candidate, workload))
  }

  return candidates.map((candidate, index) => {
    const breakdown = Object.fromEntries(
      Object.keys(weights).map(key => [key, clamp(scores[key][index], 0, 100)])
    )
    const score = Object.keys(weights).reduce(
      (total, key) => total + weights[key] * breakdown[key],
      0
    )
    const scoreReasons = Object.entries(breakdown)
      .sort((left, right) => weights[right[0]] * right[1] - weights[left[0]] * left[1])
      .slice(0, 2)
      .map(([criterion, value]) => ({ criterion, value }))
    return { ...candidate, score: Math.round(score * 10) / 10, scoreBreakdown: breakdown, scoreReasons }
  }).sort((left, right) =>
    right.score - left.score ||
    left.riskIndex - right.riskIndex ||
    left.result.rebuild.realistic - right.result.rebuild.realistic ||
    left.diskCount - right.diskCount ||
    left.raid.localeCompare(right.raid)
  )
}

function failureTolerance(raid, diskCount, groupCount) {
  if (raid === 'RAID5') return { count: 1, domain: 'Une panne dans le groupe RAID entier' }
  if (raid === 'RAID6') return { count: 2, domain: 'Deux pannes dans le groupe RAID entier' }
  if (raid === 'RAID10') {
    return {
      count: diskCount / 2,
      domain: 'Une panne par paire miroir ; tolérance maximale si les pannes sont réparties entre les miroirs'
    }
  }
  if (raid === 'RAID50') {
    return {
      count: groupCount,
      domain: 'Une panne par groupe RAID 5 ; les pannes doivent être réparties entre les groupes'
    }
  }
  return {
    count: groupCount * 2,
    domain: 'Deux pannes par groupe RAID 6 ; une troisième panne dans un même groupe entraîne la perte du groupe'
  }
}

function candidateLayout(raid, diskCount, groupCount) {
  if (!STRIPED_RAIDS.has(raid)) return raid
  const parity = raid === 'RAID50' ? 1 : 2
  const groupSize = diskCount / groupCount
  return `${groupCount} × (${groupSize - parity}+${parity})`
}

function validateInput(input) {
  if (!input || typeof input !== 'object') return 'invalid-input'
  const target = Number(input.targetCapacity)
  const maxDiskCount = Number(input.maxDiskCount)
  const platformMaxDriveCount = input.platformMaxDriveCount == null
    ? Infinity
    : Number(input.platformMaxDriveCount)
  const maxDriveCapacity = Number(input.maxDriveCapacityTB)
  const targetIops = input.targetIops === '' || input.targetIops == null ? null : Number(input.targetIops)
  const targetBandwidth = input.targetBandwidthMBps === '' || input.targetBandwidthMBps == null
    ? null
    : Number(input.targetBandwidthMBps)
  if (!Number.isFinite(target) || target <= 0) return 'invalid-input'
  if (!Number.isInteger(maxDiskCount) || maxDiskCount < 1) return 'invalid-input'
  if (input.platformMaxDriveCount != null &&
      (!Number.isInteger(platformMaxDriveCount) || platformMaxDriveCount < 1)) return 'invalid-input'
  if (maxDiskCount > platformMaxDriveCount) return 'invalid-input'
  if (!Number.isFinite(maxDriveCapacity) || maxDriveCapacity < 0.1 || maxDriveCapacity > 1000) return 'invalid-input'
  if (!RECOMMENDATION_DRIVE_TYPES[input.driveType] ||
      !RECOMMENDATION_WORKLOADS[input.workload] ||
      !OPTIMIZATION_PROFILES[input.optimization]) return 'invalid-input'
  if (input.capacityUnit !== 'To' && input.capacityUnit !== 'TiB') return 'invalid-input'
  if (targetIops !== null && (!Number.isFinite(targetIops) || targetIops <= 0)) return 'invalid-input'
  if (targetBandwidth !== null && (!Number.isFinite(targetBandwidth) || targetBandwidth <= 0)) return 'invalid-input'

  return null
}

export function recommendRaid(input) {
  const validationFailure = validateInput(input)
  if (validationFailure) {
    return { valid: false, failureReason: validationFailure, candidates: [], recommendations: [] }
  }

  const targetCapacityTB = input.capacityUnit === 'TiB'
    ? tiBToTB(Number(input.targetCapacity))
    : Number(input.targetCapacity)
  const workloadId = input.workload
  const workload = RECOMMENDATION_WORKLOADS[workloadId]
  const requiredCapacityTB = targetCapacityTB * (1 + capacityReserve(workloadId))
  const ioProfile = ioProfiles[workload.ioProfile]
  const rebuildProfile = REBUILD_WORKLOAD_PROFILES[workload.rebuildProfile]
  const driveType = RECOMMENDATION_DRIVE_TYPES[input.driveType]
  const disk = diskTypes[driveType.diskProfile]
  const maxDriveSizeTB = Number(input.maxDriveCapacityTB)
  const driveSizes = [...new Set([
    ...driveType.capacitiesTB.filter(size => size <= maxDriveSizeTB),
    maxDriveSizeTB
  ])].sort((left, right) => left - right)
  const candidates = []

  for (const diskSizeTB of driveSizes) {
    for (let diskCount = 1; diskCount <= Number(input.maxDiskCount); diskCount += 1) {
      for (const raid of RAID_LEVELS) {
        const groupCounts = STRIPED_RAIDS.has(raid)
          ? getValidRaidGroupCounts(raid, diskCount)
          : [1]
        for (const groupCount of groupCounts) {
          const result = calculateRaid({
            raid,
            diskCount,
            diskSizeTB,
            groupCount,
            disk,
            rebuildLoadCoefficient: rebuildProfile.coefficient,
            readPercent: ioProfile.readPercent,
            accessPattern: ioProfile.accessPattern,
            blockSizeKiB: ioProfile.blockSizeKiB
          })
          if (!result.valid || result.usableTB < requiredCapacityTB) continue

          const estimatedBandwidthMBps =
            result.readBandwidthMBps * ioProfile.readPercent / 100 +
            result.writeBandwidthMBps * (100 - ioProfile.readPercent) / 100
          if (input.targetIops != null && result.totalIops < Number(input.targetIops)) continue
          if (input.targetBandwidthMBps != null && estimatedBandwidthMBps < Number(input.targetBandwidthMBps)) continue

          const tolerance = failureTolerance(raid, diskCount, groupCount)
          const utilizationFactor = clamp(
            0.85 + 0.3 * targetCapacityTB / result.usableTB,
            0.85,
            1.15
          )
          // Bounded multiplier: 0.85 at low utilization and 1.15 at full target utilization.
          const riskIndex = calculateRecommendationRiskIndex({
            raid,
            rebuildHours: result.rebuild.realistic,
            groupWidth: result.affectedGroupSize,
            diskSizeTB,
            workload: workloadId,
            utilizationFactor
          })
          candidates.push({
            id: `${raid}-${diskCount}-${diskSizeTB}-${groupCount}`,
            raid,
            layout: candidateLayout(raid, diskCount, groupCount),
            groupCount,
            groupSize: result.affectedGroupSize,
            diskCount,
            diskSizeTB,
            targetCapacityTB,
            requiredCapacityTB,
            rawCapacityTB: result.activeRawTB,
            result,
            estimatedIops: result.totalIops,
            estimatedBandwidthMBps,
            riskIndex,
            exposureIndex: riskIndex,
            parityRiskFactor: PARITY_RISK_FACTORS[raid],
            driveSizeRiskFactor: getDriveSizeRiskFactor(raid, diskSizeTB),
            widthRiskFactor: getWidthRiskFactor(raid, result.affectedGroupSize),
            workloadRiskFactor: WORKLOAD_RISK_FACTORS[workloadId],
            utilizationFactor,
            failureTolerance: tolerance.count,
            failureDomain: tolerance.domain
          })
        }
      }
    }
  }

  if (!candidates.length) {
    const anyCapacityFit = driveSizes.some(diskSizeTB => {
      for (let diskCount = 1; diskCount <= Number(input.maxDiskCount); diskCount += 1) {
        for (const raid of RAID_LEVELS) {
          const groupCounts = STRIPED_RAIDS.has(raid)
            ? getValidRaidGroupCounts(raid, diskCount)
            : [1]
          for (const groupCount of groupCounts) {
            const result = calculateRaid({ raid, diskCount, diskSizeTB, groupCount, disk })
            if (result.valid && result.usableTB >= requiredCapacityTB) return true
          }
        }
      }
      return false
    })
    return {
      valid: true,
      failureReason: anyCapacityFit ? 'performance' : 'capacity',
      targetCapacityTB,
      requiredCapacityTB,
      capacityReserve: capacityReserve(workloadId),
      candidates: [],
      recommendations: []
    }
  }

  const weights = normalizeWeights(workloadId, input.optimization)
  const ranked = addScores(candidates, workloadId, weights, requiredCapacityTB)
  const recommendations = ranked.slice(0, 2)
  const matchedParityComparison = (() => {
    const pairs = []
    for (const raid50 of ranked.filter(candidate => candidate.raid === 'RAID50')) {
      const raid60 = ranked.find(candidate =>
        candidate.raid === 'RAID60' &&
        candidate.diskCount === raid50.diskCount &&
        candidate.diskSizeTB === raid50.diskSizeTB &&
        candidate.groupCount === raid50.groupCount
      )
      if (raid60) pairs.push({ raid50, raid60 })
    }
    pairs.sort((left, right) =>
      (right.raid50.score + right.raid60.score) - (left.raid50.score + left.raid60.score)
    )
    const pair = pairs[0]
    return pair
      ? { ...pair, capacityDifferenceTB: pair.raid50.result.usableTB - pair.raid60.result.usableTB }
      : null
  })()
  return {
    valid: true,
    failureReason: null,
    targetCapacityTB,
    requiredCapacityTB,
    capacityReserve: capacityReserve(workloadId),
    weights,
    evaluatedCount: candidates.length,
    candidates: ranked,
    recommendations,
    comparison: {
      rankedWinners: recommendations,
      raid50VsRaid60: matchedParityComparison
    }
  }
}
