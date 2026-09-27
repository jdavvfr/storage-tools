const RAID_GROUP_GRID = {
  maxColumns: 3,
  disksPerColumn: 8,
  raid10MaxColumns: 8,
  raid10TabletColumns: 4,
  raid10MobileColumns: 2
}

function gridProperties(columns, tabletColumns, mobileColumns) {
  return {
    '--raid-columns': columns,
    '--raid-columns-tablet': tabletColumns,
    '--raid-columns-mobile': mobileColumns
  }
}

export function getRaidGridConfig(raid, groups) {
  if (['RAID50', 'RAID60'].includes(raid)) {
    const count = groups.length
    const largestGroup = Math.max(0, ...groups.map(group => group.count))
    const columns = count <= RAID_GROUP_GRID.maxColumns
      ? count
      : Math.min(
          RAID_GROUP_GRID.maxColumns,
          Math.max(1, Math.floor(
            RAID_GROUP_GRID.maxColumns * RAID_GROUP_GRID.disksPerColumn / largestGroup
          ))
        )

    return {
      className: 'raid-groups--raid50-60',
      style: gridProperties(columns, Math.min(columns, 2), 1)
    }
  }

  if (raid === 'RAID10') {
    const columns = Math.min(groups.length, RAID_GROUP_GRID.raid10MaxColumns)

    return {
      className: 'raid-groups--raid10',
      style: gridProperties(
        columns,
        Math.min(columns, RAID_GROUP_GRID.raid10TabletColumns),
        Math.min(columns, RAID_GROUP_GRID.raid10MobileColumns)
      )
    }
  }

  if (groups.length === 1) {
    return { className: 'raid-groups--single-group', style: undefined }
  }

  return { className: '', style: undefined }
}
