import { calculateCopyDurationSeconds } from './copyDuration.js'

export const LTO_COMPRESSION_RATIO = 2.5

export const ltoGenerations = {
  'LTO-7': { nativeCapacityTB: 6, nativeThroughputMBps: 300 },
  'LTO-8': { nativeCapacityTB: 12, nativeThroughputMBps: 360 },
  'LTO-9': { nativeCapacityTB: 18, nativeThroughputMBps: 400 },
}

const volumeUnitBytes = {
  o: 1,
  ko: 1_000,
  Mo: 1_000_000,
  Go: 1_000_000_000,
  To: 1_000_000_000_000,
  KiB: 1_024,
  MiB: 1_048_576,
  GiB: 1_073_741_824,
  TiB: 1_099_511_627_776,
}

export function calculateLtoCartridges(volume, volumeUnit, generation, compressed = false) {
  if (!Number.isFinite(volume) || volume <= 0 ||
    !Object.hasOwn(volumeUnitBytes, volumeUnit) || !Object.hasOwn(ltoGenerations, generation)) return Number.NaN

  const unitBytes = volumeUnitBytes[volumeUnit]
  const lto = ltoGenerations[generation]

  const capacityTB = lto.nativeCapacityTB * (compressed ? LTO_COMPRESSION_RATIO : 1)
  const volumeBytes = volume * unitBytes
  const capacityBytes = capacityTB * 1_000_000_000_000
  const cartridges = Math.ceil(volumeBytes / capacityBytes)
  return Number.isSafeInteger(cartridges) ? cartridges : Number.NaN
}

export function calculateLtoTotalCartridges(cartridgesPerBackup, rotationSets) {
  if (!Number.isSafeInteger(cartridgesPerBackup) || cartridgesPerBackup <= 0 ||
    !Number.isSafeInteger(rotationSets) || rotationSets <= 0) return Number.NaN

  const total = cartridgesPerBackup * rotationSets
  return Number.isSafeInteger(total) ? total : Number.NaN
}

export function calculateLtoWriteDurationSeconds(volume, volumeUnit, generation, customThroughputMBps, readerCount = 1) {
  if (!Object.hasOwn(ltoGenerations, generation)) return Number.NaN
  if (!Number.isSafeInteger(readerCount) || readerCount <= 0) return Number.NaN
  const lto = ltoGenerations[generation]
  const throughput = customThroughputMBps ?? lto.nativeThroughputMBps
  const aggregateThroughput = throughput * readerCount
  if (!Number.isFinite(aggregateThroughput)) return Number.NaN
  return calculateCopyDurationSeconds(volume, volumeUnit, aggregateThroughput, 'Mo/s')
}
