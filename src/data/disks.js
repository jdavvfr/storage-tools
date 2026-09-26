export const diskTypes = {
  'SATA 7.2K': {
    technology: 'HDD',
    workload: 'Capacitif',
    interface: 'SATA 6 Gb/s',
    readIops: 80,
    writeIops: 80,
    readBandwidthMBps: 220,
    writeBandwidthMBps: 210,
    rebuildMBps: 160
  },

  'NL-SAS 7.2K': {
    technology: 'HDD',
    workload: 'Capacitif',
    interface: 'SAS 12 Gb/s',
    readIops: 85,
    writeIops: 85,
    readBandwidthMBps: 280,
    writeBandwidthMBps: 270,
    rebuildMBps: 190
  },

  'SAS 10K': {
    technology: 'HDD',
    workload: 'Performance',
    interface: 'SAS 12 Gb/s',
    readIops: 120,
    writeIops: 120,
    readBandwidthMBps: 260,
    writeBandwidthMBps: 250,
    rebuildMBps: 190
  },

  'SAS 15K': {
    technology: 'HDD',
    workload: 'Performance',
    interface: 'SAS 12 Gb/s',
    readIops: 180,
    writeIops: 180,
    readBandwidthMBps: 280,
    writeBandwidthMBps: 270,
    rebuildMBps: 220
  },

  'SSD SATA RI': {
    technology: 'SSD',
    workload: 'Read Intensive',
    interface: 'SATA 6 Gb/s',
    readIops: 95000,
    writeIops: 35000,
    readBandwidthMBps: 550,
    writeBandwidthMBps: 500,
    rebuildMBps: 400
  },

  'SSD SATA MU': {
    technology: 'SSD',
    workload: 'Mixed Use',
    interface: 'SATA 6 Gb/s',
    readIops: 95000,
    writeIops: 60000,
    readBandwidthMBps: 550,
    writeBandwidthMBps: 520,
    rebuildMBps: 450
  },

  'SSD SAS RI': {
    technology: 'SSD',
    workload: 'Read Intensive',
    interface: 'SAS 24 Gb/s',
    readIops: 180000,
    writeIops: 40000,
    readBandwidthMBps: 1800,
    writeBandwidthMBps: 1000,
    rebuildMBps: 1000
  },

  'SSD SAS MU': {
    technology: 'SSD',
    workload: 'Mixed Use',
    interface: 'SAS 24 Gb/s',
    readIops: 200000,
    writeIops: 80000,
    readBandwidthMBps: 2100,
    writeBandwidthMBps: 1800,
    rebuildMBps: 1200
  },

  'SSD SAS WI': {
    technology: 'SSD',
    workload: 'Write Intensive',
    interface: 'SAS 24 Gb/s',
    readIops: 180000,
    writeIops: 150000,
    readBandwidthMBps: 2000,
    writeBandwidthMBps: 1900,
    rebuildMBps: 1300
  },

  'NVMe RI': {
    technology: 'NVMe',
    workload: 'Read Intensive',
    interface: 'PCIe Gen4',
    readIops: 1000000,
    writeIops: 200000,
    readBandwidthMBps: 7000,
    writeBandwidthMBps: 4000,
    rebuildMBps: 2500
  },

  'NVMe MU': {
    technology: 'NVMe',
    workload: 'Mixed Use',
    interface: 'PCIe Gen4',
    readIops: 1000000,
    writeIops: 300000,
    readBandwidthMBps: 7500,
    writeBandwidthMBps: 6500,
    rebuildMBps: 3500
  },

  'NVMe WI': {
    technology: 'NVMe',
    workload: 'Write Intensive',
    interface: 'PCIe Gen4',
    readIops: 900000,
    writeIops: 500000,
    readBandwidthMBps: 7000,
    writeBandwidthMBps: 7000,
    rebuildMBps: 4000
  }
}