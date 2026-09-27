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

const throughputUnitBytesPerSecond = {
  'o/s': 1,
  'ko/s': 1_000,
  'Mo/s': 1_000_000,
  'Go/s': 1_000_000_000,
  'To/s': 1_000_000_000_000,
  'KiB/s': 1_024,
  'MiB/s': 1_048_576,
  'GiB/s': 1_073_741_824,
  'TiB/s': 1_099_511_627_776,
  'kbit/s': 1_000 / 8,
  'Mbit/s': 1_000_000 / 8,
  'Gbit/s': 1_000_000_000 / 8,
}

export function calculateCopyDurationSeconds(volume, volumeUnit, throughput, throughputUnit) {
  if (!Object.hasOwn(volumeUnitBytes, volumeUnit) || !Object.hasOwn(throughputUnitBytesPerSecond, throughputUnit)) return Number.NaN

  const bytesPerVolumeUnit = volumeUnitBytes[volumeUnit]
  const bytesPerSecondPerThroughputUnit = throughputUnitBytesPerSecond[throughputUnit]
  if (!Number.isFinite(volume) || volume <= 0 || !Number.isFinite(throughput) || throughput <= 0 ||
    !bytesPerVolumeUnit || !bytesPerSecondPerThroughputUnit) return Number.NaN

  const seconds = (volume / throughput) * (bytesPerVolumeUnit / bytesPerSecondPerThroughputUnit)
  return Number.isFinite(seconds) ? seconds : Number.NaN
}

export function formatCopyDuration(seconds, language = 'fr') {
  if (!Number.isFinite(seconds) || seconds < 0) return ''

  let remaining = Math.ceil(seconds)
  const units = language === 'en'
    ? [
        [31_536_000, 'year', 'years'],
        [86_400, 'day', 'days'],
        [3_600, 'hour', 'hours'],
        [60, 'minute', 'minutes'],
        [1, 'second', 'seconds'],
      ]
    : [
        [31_536_000, 'an', 'ans'],
        [86_400, 'jour', 'jours'],
        [3_600, 'heure', 'heures'],
        [60, 'minute', 'minutes'],
        [1, 'seconde', 'secondes'],
      ]
  const formatNumber = value => new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'fr-FR', { maximumFractionDigits: 0 }).format(value)
  const parts = []

  for (const [unitSeconds, singular, plural] of units) {
    const count = Math.floor(remaining / unitSeconds)
    if (count > 0) {
      parts.push(`${formatNumber(count)} ${count === 1 ? singular : plural}`)
      remaining %= unitSeconds
    }
    if (parts.length === 2) break
  }

  return parts.join(language === 'en' ? ' and ' : ' et ') || (language === 'en' ? '1 second' : '1 seconde')
}
