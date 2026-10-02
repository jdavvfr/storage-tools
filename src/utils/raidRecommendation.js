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
  capacity: 0.40,
  exposure: 0.35,
  rebuild: 0.15,
  performance: 0.10
}

export const RAID_RESILIENCE_FACTORS = {
  RAID5: 1,
  RAID50: 1,
  RAID6: 0.35,
  RAID60: 0.35,
  RAID10: 0.25
}

export const DRIVE_SIZE_RISK_FACTORS = [
  { minimumTB: 22, factor: 1.6 },
  { minimumTB: 18, factor: 1.35 },
  { minimumTB: 12, factor: 1.15 },
  { minimumTB: 0, factor: 1 }
]

export const SINGLE_PARITY_REBUILD_SURCHARGES = [
  { minimumTB: 22, factor: 1.75 },
  { minimumTB: 18, factor: 1.45 },
  { minimumTB: 12, factor: 1.2 },
  { minimumTB: 0, factor: 1 }
]

const WORKLOAD_FACTORS = {
  backup: { capacity: 1.15, exposure: 3, rebuild: 1, performance: 0.5 },
  virtualization: { capacity: 0.875, exposure: 1, rebuild: 1, performance: 1.5 },
  database: { capacity: 0.5, exposure: 0.85, rebuild: 1, performance: 3 },
  surveillance: { capacity: 0.875, exposure: 1.8, rebuild: 1, performance: 1 }
}

const RESILIENCE_FACTORS = {
  backup: 0.3,
  virtualization: 0.2,
  database: 0.25,
  surveillance: 0.65
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
  const workloadFactors = WORKLOAD_FACTORS[workload]
  const optimizationFactors = OPTIMIZATION_PROFILES[optimization].factors
  const weighted = Object.fromEntries(
    Object.keys(BASE_RECOMMENDATION_WEIGHTS).map(key => [
      key,
      BASE_RECOMMENDATION_WEIGHTS[key] * workloadFactors[key] * optimizationFactors[key]
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
    return Math.max(0, Math.min(100, score * 100))
  })
}

function factorForCapacity(diskSizeTB, factors) {
  return factors.find(({ minimumTB }) => diskSizeTB >= minimumTB)?.factor ?? 1
}

export function getDriveSizeRiskFactor(raid, diskSizeTB) {
  if (!Object.hasOwn(RAID_RESILIENCE_FACTORS, raid) ||
      !Number.isFinite(Number(diskSizeTB)) || Number(diskSizeTB) <= 0) return null

  const baseSizeRisk = factorForCapacity(Number(diskSizeTB), DRIVE_SIZE_RISK_FACTORS)
  const singleParitySurcharge = ['RAID5', 'RAID50'].includes(raid)
    ? factorForCapacity(Number(diskSizeTB), SINGLE_PARITY_REBUILD_SURCHARGES)
    : 1
  return RAID_RESILIENCE_FACTORS[raid] * baseSizeRisk * singleParitySurcharge
}

export function calculateRecommendationExposure({ raid, rebuildHours, groupWidth, diskSizeTB }) {
  const raidSizeRiskFactor = getDriveSizeRiskFactor(raid, diskSizeTB)
  if (raidSizeRiskFactor === null ||
      !Number.isFinite(Number(rebuildHours)) || Number(rebuildHours) < 0 ||
      !Number.isFinite(Number(groupWidth)) || Number(groupWidth) <= 0) return null

  return Number(rebuildHours) * Number(groupWidth) * raidSizeRiskFactor
}

function addScores(candidates, workload, weights, targetCapacityTB) {
  const rawExposureScores = normalize(candidates.map(candidate => candidate.exposureIndex), true)
  const faultToleranceScores = normalize(candidates.map(candidate => candidate.failureTolerance))
  const iopsScores = normalize(candidates.map(candidate => candidate.estimatedIops))
  const bandwidthScores = normalize(candidates.map(candidate => candidate.estimatedBandwidthMBps))
  const efficiencyScores = normalize(candidates.map(candidate => candidate.result.efficiencyActive))
  const performanceFactors = PERFORMANCE_FACTORS[workload]
  const resilienceFactor = RESILIENCE_FACTORS[workload]
  const rawPerformanceScores = candidates.map((candidate, index) =>
    iopsScores[index] * performanceFactors.iops +
    bandwidthScores[index] * performanceFactors.bandwidth
  )
  const scores = {
    capacity: candidates.map((candidate, index) =>
      Math.min(100, candidate.result.usableTB / targetCapacityTB * 50) * 0.55 +
      efficiencyScores[index] * 0.45
    ),
    exposure: rawExposureScores.map((score, index) =>
      score * (1 - resilienceFactor) + faultToleranceScores[index] * resilienceFactor
    ),
    rebuild: normalize(candidates.map(candidate => candidate.result.rebuild.realistic), true),
    performance: normalize(rawPerformanceScores)
  }

  return candidates.map((candidate, index) => {
    const breakdown = Object.fromEntries(
      Object.keys(weights).map(key => [key, scores[key][index]])
    )
    const score = Object.keys(weights).reduce(
      (total, key) => total + weights[key] * breakdown[key],
      0
    )
    return { ...candidate, score: Math.round(score * 10) / 10, scoreBreakdown: breakdown }
  }).sort((left, right) =>
    right.score - left.score ||
    left.exposureIndex - right.exposureIndex ||
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
  const workload = RECOMMENDATION_WORKLOADS[input.workload]
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
          if (!result.valid || result.usableTB < targetCapacityTB) continue

          const estimatedBandwidthMBps =
            result.readBandwidthMBps * ioProfile.readPercent / 100 +
            result.writeBandwidthMBps * (100 - ioProfile.readPercent) / 100
          if (input.targetIops != null && result.totalIops < Number(input.targetIops)) continue
          if (input.targetBandwidthMBps != null && estimatedBandwidthMBps < Number(input.targetBandwidthMBps)) continue

          const tolerance = failureTolerance(raid, diskCount, groupCount)
          const exposureIndex = calculateRecommendationExposure({
            raid,
            rebuildHours: result.rebuild.realistic,
            groupWidth: result.affectedGroupSize,
            diskSizeTB
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
            rawCapacityTB: result.activeRawTB,
            result,
            estimatedIops: result.totalIops,
            estimatedBandwidthMBps,
            exposureIndex,
            raidResilienceFactor: RAID_RESILIENCE_FACTORS[raid],
            driveSizeRiskFactor: factorForCapacity(diskSizeTB, DRIVE_SIZE_RISK_FACTORS),
            singleParitySurcharge: ['RAID5', 'RAID50'].includes(raid)
              ? factorForCapacity(diskSizeTB, SINGLE_PARITY_REBUILD_SURCHARGES)
              : 1,
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
            if (result.valid && result.usableTB >= targetCapacityTB) return true
          }
        }
      }
      return false
    })
    return {
      valid: true,
      failureReason: anyCapacityFit ? 'performance' : 'capacity',
      targetCapacityTB,
      candidates: [],
      recommendations: []
    }
  }

  const weights = normalizeWeights(input.workload, input.optimization)
  const ranked = addScores(candidates, input.workload, weights, targetCapacityTB)
  return {
    valid: true,
    failureReason: null,
    targetCapacityTB,
    weights,
    evaluatedCount: candidates.length,
    candidates: ranked,
    recommendations: ranked.slice(0, 2)
  }
}
