export const TB_TO_TIB = 1_000_000_000_000 / 1_099_511_627_776
export const tbToTiB = value => value * TB_TO_TIB
export const tiBToTB = value => value / TB_TO_TIB
export const tiBToPiB = value => value / 1024
export const tbToPB = value => value / 1000

export function calculateNominalRebuildBandwidth(referenceDisk, performanceDisk) {
  const readScale = performanceDisk.readBandwidthMBps / referenceDisk.readBandwidthMBps
  const writeScale = performanceDisk.writeBandwidthMBps / referenceDisk.writeBandwidthMBps
  return referenceDisk.rebuildMBps * Math.min(readScale, writeScale)
}

export const DEFAULT_IO_PROFILE = 'virtualization'

export const REBUILD_WORKLOAD_PROFILES = {
  low: {
    id: 'low',
    label: 'Faible activité',
    dailyLoadPercent: 30,
    coefficient: 0.85,
    description: 'Sauvegarde (Backup Repository), archivage froid ou repository Veeam.'
  },
  moderate: {
    id: 'moderate',
    label: 'Activité modérée',
    dailyLoadPercent: 60,
    coefficient: 0.70,
    description: 'Virtualisation, serveur de fichiers ou IA / Analytics ; usage en journée avec des périodes creuses.'
  },
  continuous: {
    id: 'continuous',
    label: 'Activité continue',
    dailyLoadPercent: 100,
    coefficient: 0.50,
    description: 'Sollicitation continue, notamment vidéosurveillance, bases de données, systèmes industriels et collecte de logs.'
  }
}

export const rebuildProfileByIoProfile = {
  backup: 'low',
  virtualization: 'moderate',
  files: 'moderate',
  surveillance: 'continuous',
  custom: 'moderate'
}

export function getRebuildWorkloadProfile(ioProfile) {
  const profileId = rebuildProfileByIoProfile[ioProfile]
  return REBUILD_WORKLOAD_PROFILES[profileId]
}

export function getRaidWidthCoefficient(width) {
  if (width <= 8) return 1
  if (width <= 12) return 0.95
  if (width <= 16) return 0.90
  if (width <= 24) return 0.85
  if (width <= 40) return 0.80
  return 0.75
}

export const ioProfiles = {
  backup: {
    label: 'Sauvegarde',
    readPercent: 0,
    accessPattern: 'sequential',
    blockSizeKiB: 256,
    recommendation: 'Point de départ pour une cible de sauvegarde : écritures séquentielles en gros blocs. Le profil d’une source lue pendant la sauvegarde sera différent.'
  },
  virtualization: {
    label: 'Virtualisation',
    readPercent: 70,
    accessPattern: 'random',
    blockSizeKiB: 8,
    recommendation: 'Point de départ pour un datastore de machines virtuelles : charge aléatoire mixte, blocs de 8 KiB et majorité de lectures. Les profils des VM et du datastore peuvent varier ; ajustez avec des mesures réelles.'
  },
  files: {
    label: 'Fichiers NAS',
    readPercent: 70,
    accessPattern: 'random',
    blockSizeKiB: 64,
    recommendation: 'Point de départ pour un serveur de fichiers : charge mixte et blocs de 64 KiB. Les petits fichiers et les accès séquentiels peuvent changer fortement ce profil.'
  },
  surveillance: {
    label: 'Vidéosurveillance',
    readPercent: 10,
    accessPattern: 'sequential',
    blockSizeKiB: 256,
    recommendation: 'Point de départ pour un stockage CCTV dominé par l’enregistrement continu : 90 % d’écritures et 10 % de lectures de consultation, en séquentiel avec des blocs de 256 KiB. Ajustez le ratio selon la fréquence de relecture et les mesures du NVR.'
  },
  custom: {
    label: 'Personnalisé',
    readPercent: 70,
    accessPattern: 'random',
    blockSizeKiB: 4,
    recommendation: 'Définissez un profil représentatif de votre application ou utilisez des mesures de charge réelles.'
  }
}

export const sortedIoProfiles = Object.entries(ioProfiles)
  .sort(([, left], [, right]) => left.label.localeCompare(right.label, 'fr'))

export function parseCapacityInput(value) {
  const input = String(value).trim()
  if (!input) return null
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(input)) return Number.NaN
  const parsed = Number(input.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export const raidDefinitions = {
  RAID0: { label: 'RAID 0', writePenalty: 1, minimumDisks: 2, resilience: 0, description: 'Bandes sans redondance', faultTolerance: 'Aucune panne', rebuildSupported: false },
  RAID1: { label: 'RAID 1', writePenalty: 2, minimumDisks: 2, resilience: 4, description: 'Miroir', faultTolerance: '1 panne par miroir', rebuildSupported: true },
  RAID5: { label: 'RAID 5', writePenalty: 4, minimumDisks: 3, resilience: 1, description: 'Parité simple distribuée', faultTolerance: '1 panne', rebuildSupported: true },
  RAID6: { label: 'RAID 6', writePenalty: 6, minimumDisks: 4, resilience: 3, description: 'Double parité distribuée', faultTolerance: '2 pannes', rebuildSupported: true },
  RAID10: { label: 'RAID 10', writePenalty: 2, minimumDisks: 4, resilience: 4, description: 'Agrégation de miroirs', faultTolerance: '1 panne par paire miroir', rebuildSupported: true },
  RAID50: { label: 'RAID 50', writePenalty: 4, minimumDisks: 6, resilience: 2, description: 'Groupes RAID 5 agrégés', faultTolerance: '1 panne par groupe', rebuildSupported: true },
  RAID60: { label: 'RAID 60', writePenalty: 6, minimumDisks: 8, resilience: 5, description: 'Groupes RAID 6 agrégés', faultTolerance: '2 pannes par groupe', rebuildSupported: true },
}

export function getValidRaidGroupCounts(raid, diskCount) {
  if (!['RAID50', 'RAID60'].includes(raid)) return []

  const active = Number(diskCount)
  if (!Number.isInteger(active) || active <= 0) return []

  const minimumGroupSize = raid === 'RAID50' ? 3 : 4
  const validCounts = []
  for (let groups = 2; groups <= Math.floor(active / minimumGroupSize); groups += 1) {
    if (active % groups === 0) validCounts.push(groups)
  }
  return validCounts
}

export function calculateRaid({
  raid,
  diskCount,
  hotSpares = 0,
  diskSizeTB,
  groupCount = 2,
  disk,
  rebuildLoadCoefficient = REBUILD_WORKLOAD_PROFILES.moderate.coefficient,
  readPercent = 70,
  accessPattern = 'random',
  blockSizeKiB = 4,
  calculateIops = true,
  calculateRebuild = true
}) {
  const definition = raidDefinitions[raid]
  const active = Number(diskCount)
  const spares = Number(hotSpares)
  const sizeTB = Number(diskSizeTB)
  const groups = Number(groupCount)
  const readRatio = Number(readPercent) / 100
  const writeRatio = 1 - readRatio
  const blockSize = Number(blockSizeKiB)
  if (!definition || !disk || !active || !sizeTB) return { ready: false, valid: false, message: '' }
  const diskMetrics = [disk.readIops, disk.writeIops, disk.readBandwidthMBps, disk.writeBandwidthMBps]
  if (diskMetrics.some(value => !Number.isFinite(Number(value)) || Number(value) <= 0)) {
    return { ready: true, valid: false, message: 'Les performances du disque doivent être des nombres finis supérieurs à 0' }
  }
  if (calculateRebuild && definition.rebuildSupported && (!Number.isFinite(Number(disk.rebuildMBps)) || Number(disk.rebuildMBps) <= 0)) {
    return { ready: true, valid: false, message: 'Le débit nominal de rebuild doit être un nombre fini supérieur à 0' }
  }
  if (calculateRebuild && definition.rebuildSupported && (!Number.isFinite(Number(rebuildLoadCoefficient)) || Number(rebuildLoadCoefficient) <= 0 || Number(rebuildLoadCoefficient) > 1)) {
    return { ready: true, valid: false, message: 'Le coefficient du profil de charge doit être supérieur à 0 et inférieur ou égal à 1' }
  }
  const message = validate(raid, active, spares, sizeTB, groups, readRatio, accessPattern, blockSize, calculateIops)
  if (message) return { ready: true, valid: false, message }

  const installed = active + spares
  const usableDisks = usable(raid, active, groups)
  const activeRawTB = active * sizeTB
  const installedRawTB = installed * sizeTB
  const usableTB = usableDisks * sizeTB
  const affectedGroupSize = ['RAID50', 'RAID60'].includes(raid) ? active / groups : ['RAID1', 'RAID10'].includes(raid) ? 2 : active
  
  let rebuild = { optimistic: null, realistic: null, degraded: null, applicationLoadCoefficient: null, groupWidthCoefficient: null, exposureIndex: null }
  if (calculateRebuild && definition.rebuildSupported) {
    const baseHours = sizeTB * 1_000_000 / disk.rebuildMBps / 3600
    const groupWidthCoefficient = getRaidWidthCoefficient(affectedGroupSize)
    const realisticHours = baseHours / (Number(rebuildLoadCoefficient) * groupWidthCoefficient)
    rebuild = {
      optimistic: baseHours,
      realistic: realisticHours,
      degraded: realisticHours / 0.65,
      applicationLoadCoefficient: Number(rebuildLoadCoefficient),
      groupWidthCoefficient,
      exposureIndex: realisticHours * affectedGroupSize
    }
  }
  
  const ioCosts = calculateIops ? getIoCosts(raid, active, groups, accessPattern) : null
  const diskReadIops = calculateIops ? Math.min(disk.readIops, disk.readBandwidthMBps * 1_000_000 / (blockSize * 1024)) : null
  const diskWriteIops = calculateIops ? Math.min(disk.writeIops, disk.writeBandwidthMBps * 1_000_000 / (blockSize * 1024)) : null
  const readIopsBudget = calculateIops ? active * diskReadIops : null
  const writeIopsBudget = calculateIops ? active * diskWriteIops : null
  const readDemandPerOperation = calculateIops ? readRatio * ioCosts.readReads + writeRatio * ioCosts.writeReads : null
  const writeDemandPerOperation = calculateIops ? writeRatio * ioCosts.writeWrites : null
  const logicalIops = calculateIops
    ? Math.min(
        readDemandPerOperation ? readIopsBudget / readDemandPerOperation : Infinity,
        writeDemandPerOperation ? writeIopsBudget / writeDemandPerOperation : Infinity
      )
    : null

  return {
    ready: true, valid: true, active, spares, installed, usableDisks,
    activeRawTB, activeRawTiB: tbToTiB(activeRawTB),
    installedRawTB, installedRawTiB: tbToTiB(installedRawTB),
    usableTB, usableTiB: tbToTiB(usableTB),
    efficiencyActive: usableDisks / active * 100,
    efficiencyInstalled: usableDisks / installed * 100,
    readIops: calculateIops ? logicalIops * readRatio : null,
    writeIops: calculateIops ? logicalIops * writeRatio : null,
    totalIops: logicalIops,
    ioCosts,
    readPercent: readRatio * 100,
    writePercent: writeRatio * 100,
    accessPattern,
    blockSizeKiB: blockSize,
    effectiveDiskReadIops: diskReadIops,
    effectiveDiskWriteIops: diskWriteIops,
    readBandwidthMBps: active * disk.readBandwidthMBps,
    writeBandwidthMBps: usableDisks * disk.writeBandwidthMBps,
    writePenalty: definition.writePenalty,
    faultTolerance: definition.faultTolerance,
    resilience: definition.resilience,
    rebuildSupported: definition.rebuildSupported,
    groupCount: ['RAID50', 'RAID60'].includes(raid) ? groups : 1,
    affectedGroupSize,
    rebuild,
    hotSpareStatus: spares > 0 ? `${spares} hot spare${spares > 1 ? 's' : ''} disponible${spares > 1 ? 's' : ''}` : 'Aucun hot spare',
  }
}

export function buildRaidComparison(args) {
  return Object.keys(raidDefinitions).map(raid => ({ raid, definition: raidDefinitions[raid], result: calculateRaid({ ...args, raid }) }))
}

function usable(raid, n, g) {
  return { RAID0: n, RAID1: n / 2, RAID5: n - 1, RAID6: n - 2, RAID10: n / 2, RAID50: n - g, RAID60: n - 2 * g }[raid] || 0
}

function getIoCosts(raid, active, groups, accessPattern) {
  if (['RAID5', 'RAID6', 'RAID50', 'RAID60'].includes(raid) && accessPattern === 'sequential') {
    const groupSize = ['RAID50', 'RAID60'].includes(raid) ? active / groups : active
    const parityDisks = ['RAID6', 'RAID60'].includes(raid) ? 2 : 1
    return { readReads: 1, writeReads: 0, writeWrites: groupSize / (groupSize - parityDisks) }
  }

  const writeReads = { RAID0: 0, RAID1: 0, RAID5: 2, RAID6: 3, RAID10: 0, RAID50: 2, RAID60: 3 }[raid]
  const writeWrites = { RAID0: 1, RAID1: 2, RAID5: 2, RAID6: 3, RAID10: 2, RAID50: 2, RAID60: 3 }[raid]
  return { readReads: 1, writeReads, writeWrites }
}

function validate(raid, active, spares, sizeTB, groups, readRatio, accessPattern, blockSize, calculateIops) {
  const definition = raidDefinitions[raid]
  if (!Number.isInteger(active) || active < definition.minimumDisks) return `${definition.label} nécessite au minimum ${definition.minimumDisks} disques actifs`
  if (!Number.isInteger(spares) || spares < 0) return 'Le nombre de hot spares doit être un entier positif ou nul'
  if (sizeTB <= 0) return 'La capacité doit être supérieure à 0 TB'
  if (calculateIops) {
    if (!Number.isFinite(readRatio) || readRatio < 0 || readRatio > 1) return 'Le taux de lecture doit être compris entre 0 et 100 %'
    if (!['random', 'sequential'].includes(accessPattern)) return 'Le type d’accès doit être aléatoire ou séquentiel'
    if (!Number.isFinite(blockSize) || blockSize <= 0) return 'La taille de bloc doit être supérieure à 0 KiB'
  }
  if (['RAID1', 'RAID10'].includes(raid) && active % 2) return `${definition.label} nécessite un nombre pair de disques actifs`
  if (['RAID50', 'RAID60'].includes(raid)) {
    if (!Number.isInteger(groups) || groups < 2) return `${definition.label} nécessite au moins 2 groupes`
    if (groups > active) return `Le nombre de groupes ne peut pas dépasser les ${active} disques actifs`
    if (active % groups) return `${active} disques actifs ne sont pas divisibles en ${groups} groupes égaux`
    if (!getValidRaidGroupCounts(raid, active).includes(groups)) {
      const min = raid === 'RAID50' ? 3 : 4
      return `Chaque groupe nécessite au moins ${min} disques actifs`
    }
  }
  return ''
}
