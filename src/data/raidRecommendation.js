export const RECOMMENDATION_DRIVE_TYPES = {
  'HDD SATA': {
    diskProfile: 'SATA 7.2K',
    capacitiesTB: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]
  },
  'HDD SAS': {
    diskProfile: 'NL-SAS 7.2K',
    capacitiesTB: [0.6, 1.2, 1.8, 2.4, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]
  },
  'SSD SATA': {
    diskProfile: 'SSD SATA MU',
    capacitiesTB: [0.48, 0.96, 1.92, 3.84, 7.68, 15.36, 30.72]
  },
  'SSD SAS': {
    diskProfile: 'SSD SAS MU',
    capacitiesTB: [0.48, 0.96, 1.92, 3.84, 7.68, 15.36, 30.72]
  },
  NVMe: {
    diskProfile: 'NVMe MU',
    capacitiesTB: [0.96, 1.92, 3.84, 7.68, 15.36, 30.72, 61.44]
  }
}

export const RECOMMENDATION_PLATFORMS = [
  { id: 'generic-12lff', label: 'Châssis générique 12LFF', driveBays: 12, note: 'Référence de nombre de baies, sans modèle constructeur associé.' },
  { id: 'generic-24lff', label: 'Châssis générique 24LFF', driveBays: 24, note: 'Référence de nombre de baies, sans modèle constructeur associé.' },
  { id: 'generic-24sff', label: 'Châssis générique 24SFF', driveBays: 24, note: 'Référence de nombre de baies, sans modèle constructeur associé.' },
  { id: 'generic-48edsff', label: 'Châssis générique 48EDSFF', driveBays: 48, note: 'Référence de nombre de baies, sans modèle constructeur associé.' },
  { id: 'dell-md2460', label: 'Dell MD2460', driveBays: 60, note: 'Nombre de disques indiqué dans la demande produit ; vérifier la configuration et la compatibilité des médias.' },
  { id: 'hpe-alletra-68lff', label: 'HPE Alletra 4140 — 68LFF', driveBays: 68, note: 'Variante fournie dans la demande produit ; vérifier la configuration exacte auprès du constructeur.' },
  { id: 'hpe-alletra-92lff', label: 'HPE Alletra 4140 — 92LFF', driveBays: 92, note: 'Variante fournie dans la demande produit ; vérifier la configuration exacte auprès du constructeur.' },
  { id: 'custom', label: 'Plateforme personnalisée', driveBays: 256, note: 'Entrez une limite de baies personnalisée.' }
]

export const RECOMMENDATION_WORKLOADS = {
  backup: { label: 'Sauvegarde / Archivage', ioProfile: 'backup', rebuildProfile: 'low' },
  virtualization: { label: 'Virtualisation', ioProfile: 'virtualization', rebuildProfile: 'moderate' },
  database: { label: 'Base de données', ioProfile: 'database', rebuildProfile: 'continuous' },
  surveillance: { label: 'Vidéosurveillance', ioProfile: 'surveillance', rebuildProfile: 'continuous' }
}

export const OPTIMIZATION_PROFILES = {
  capacity: { label: 'Capacité maximale', factors: { capacity: 1.5, exposure: 0.75, rebuild: 0.75, performance: 0.6 } },
  balanced: { label: 'Équilibré', factors: { capacity: 1, exposure: 1, rebuild: 1, performance: 1 } },
  resilience: { label: 'Résilience maximale', factors: { capacity: 0.75, exposure: 1.3, rebuild: 1.25, performance: 0.9 } }
}
