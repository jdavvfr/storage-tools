export const TB_TO_TIB = 1_000_000_000_000 / 1_099_511_627_776
export const tbToTiB = value => value * TB_TO_TIB
export const tiBToTB = value => value / TB_TO_TIB
export const tiBToPiB = value => value / 1024
export const tbToPB = value => value / 1000

export function parseCapacityInput(value) {
  const input = String(value).trim()
  if (!input) return null
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(input)) return Number.NaN
  const parsed = Number(input.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export const raidDefinitions = {
  RAID0: { label: 'RAID 0', writePenalty: 1, minimumDisks: 2, resilience: 0, description: 'Bandes sans redondance', faultTolerance: 'Aucune panne', rebuildSupported: false, rebuildContentionPerAdditionalDisk: 0 },
  RAID1: { label: 'RAID 1', writePenalty: 2, minimumDisks: 2, resilience: 4, description: 'Miroir', faultTolerance: '1 panne par miroir', rebuildSupported: true, rebuildContentionPerAdditionalDisk: 0 },
  RAID5: { label: 'RAID 5', writePenalty: 4, minimumDisks: 3, resilience: 1, description: 'Parité simple distribuée', faultTolerance: '1 panne', rebuildSupported: true, rebuildContentionPerAdditionalDisk: 0.08 },
  RAID6: { label: 'RAID 6', writePenalty: 6, minimumDisks: 4, resilience: 3, description: 'Double parité distribuée', faultTolerance: '2 pannes', rebuildSupported: true, rebuildContentionPerAdditionalDisk: 0.12 },
  RAID10: { label: 'RAID 10', writePenalty: 2, minimumDisks: 4, resilience: 4, description: 'Agrégation de miroirs', faultTolerance: '1 panne par paire miroir', rebuildSupported: true, rebuildContentionPerAdditionalDisk: 0 },
  RAID50: { label: 'RAID 50', writePenalty: 4, minimumDisks: 6, resilience: 2, description: 'Groupes RAID 5 agrégés', faultTolerance: '1 panne par groupe', rebuildSupported: true, rebuildContentionPerAdditionalDisk: 0.08 },
  RAID60: { label: 'RAID 60', writePenalty: 6, minimumDisks: 8, resilience: 5, description: 'Groupes RAID 6 agrégés', faultTolerance: '2 pannes par groupe', rebuildSupported: true, rebuildContentionPerAdditionalDisk: 0.12 },
}

export function calculateRaid({ raid, diskCount, hotSpares = 0, diskSizeTB, groupCount = 2, disk, rebuildLoad = 40 }) {
  const definition = raidDefinitions[raid]
  const active = Number(diskCount)
  const spares = Number(hotSpares)
  const sizeTB = Number(diskSizeTB)
  const groups = Number(groupCount)
  if (!definition || !disk || !active || !sizeTB) return { ready: false, valid: false, message: '' }
  const message = validate(raid, active, spares, sizeTB, groups)
  if (message) return { ready: true, valid: false, message }

  const installed = active + spares
  const usableDisks = usable(raid, active, groups)
  const activeRawTB = active * sizeTB
  const installedRawTB = installed * sizeTB
  const usableTB = usableDisks * sizeTB
  const baseHours = sizeTB * 1_000_000 / disk.rebuildMBps / 3600
  const affectedGroupSize = ['RAID50', 'RAID60'].includes(raid) ? active / groups : ['RAID1', 'RAID10'].includes(raid) ? 2 : active
  const groupWorkloadFactor = 1 + Math.max(0, affectedGroupSize - 2) * definition.rebuildContentionPerAdditionalDisk
  const realisticHours = baseHours / Math.max(0.15, 1 - Number(rebuildLoad) / 100) * groupWorkloadFactor
  const degradedHours = realisticHours / 0.65

  return {
    ready: true, valid: true, active, spares, installed, usableDisks,
    activeRawTB, activeRawTiB: tbToTiB(activeRawTB),
    installedRawTB, installedRawTiB: tbToTiB(installedRawTB),
    usableTB, usableTiB: tbToTiB(usableTB),
    efficiencyActive: usableDisks / active * 100,
    efficiencyInstalled: usableDisks / installed * 100,
    readIops: active * disk.readIops,
    writeIops: active * disk.writeIops / definition.writePenalty,
    readBandwidthMBps: active * disk.readBandwidthMBps,
    writeBandwidthMBps: usableDisks * disk.writeBandwidthMBps,
    writePenalty: definition.writePenalty,
    faultTolerance: definition.faultTolerance,
    resilience: definition.resilience,
    rebuildSupported: definition.rebuildSupported,
    groupCount: ['RAID50', 'RAID60'].includes(raid) ? groups : 1,
    affectedGroupSize,
    rebuild: definition.rebuildSupported
      ? { optimistic: baseHours, realistic: realisticHours, degraded: degradedHours, groupWorkloadFactor }
      : { optimistic: null, realistic: null, degraded: null, groupWorkloadFactor: null },
    hotSpareStatus: spares > 0 ? `${spares} hot spare${spares > 1 ? 's' : ''} disponible${spares > 1 ? 's' : ''}` : 'Aucun hot spare',
  }
}

export function buildRaidComparison(args) {
  return Object.keys(raidDefinitions).map(raid => ({ raid, definition: raidDefinitions[raid], result: calculateRaid({ ...args, raid }) }))
}

function usable(raid, n, g) {
  return { RAID0: n, RAID1: n / 2, RAID5: n - 1, RAID6: n - 2, RAID10: n / 2, RAID50: n - g, RAID60: n - 2 * g }[raid] || 0
}

function validate(raid, active, spares, sizeTB, groups) {
  const definition = raidDefinitions[raid]
  if (!Number.isInteger(active) || active < definition.minimumDisks) return `${definition.label} nécessite au minimum ${definition.minimumDisks} disques actifs`
  if (!Number.isInteger(spares) || spares < 0) return 'Le nombre de hot spares doit être un entier positif ou nul'
  if (sizeTB <= 0) return 'La capacité doit être supérieure à 0 TB'
  if (['RAID1', 'RAID10'].includes(raid) && active % 2) return `${definition.label} nécessite un nombre pair de disques actifs`
  if (['RAID50', 'RAID60'].includes(raid)) {
    const min = raid === 'RAID50' ? 3 : 4
    if (!Number.isInteger(groups) || groups < 2) return `${definition.label} nécessite au moins 2 groupes`
    if (active % groups) return `${active} disques actifs ne sont pas divisibles en ${groups} groupes égaux`
    if (active / groups < min) return `Chaque groupe nécessite au moins ${min} disques actifs`
  }
  return ''
}
