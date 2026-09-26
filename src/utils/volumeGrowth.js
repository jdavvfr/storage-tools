export function calculateVolumeGrowth(sourceVolume, annualGrowthRate, years) {
  if (
    !Number.isFinite(sourceVolume) ||
    sourceVolume < 0 ||
    !Number.isFinite(annualGrowthRate) ||
    annualGrowthRate < -100 ||
    !Number.isSafeInteger(years) ||
    years < 1
  ) {
    return Number.NaN
  }

  if (sourceVolume === 0 || annualGrowthRate === -100) return 0

  const targetVolume = sourceVolume * (1 + annualGrowthRate / 100) ** years
  return Number.isFinite(targetVolume) ? targetVolume : Number.NaN
}
