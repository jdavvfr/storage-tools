const comparisonValue = (row, key) => {
  if (key === 'raid') return Number(row.raid.slice(4))
  if (key === 'rebuild.realistic') return row.result.rebuild.realistic
  return row.result[key]
}

export function sortRaidComparison(rows, sort) {
  if (!sort) return rows

  const direction = sort.direction === 'ascending' ? 1 : -1
  return [...rows].sort((left, right) => {
    const leftValue = comparisonValue(left, sort.key)
    const rightValue = comparisonValue(right, sort.key)

    if (leftValue === null || rightValue === null) {
      if (leftValue === rightValue) return 0
      return leftValue === null ? 1 : -1
    }

    return (leftValue - rightValue) * direction
  })
}
