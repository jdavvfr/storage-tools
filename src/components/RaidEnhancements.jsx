import './RaidEnhancements.css'

const RAID_COLORS = {
  data: '#38bdf8',
  parity: '#f59e0b',
  mirror: '#a78bfa',
  spare: '#64748b'
}

function distribute(total, groups) {
  const safeGroups = Math.max(1, groups)
  const base = Math.floor(total / safeGroups)
  const extra = total % safeGroups

  return Array.from({ length: safeGroups }, (_, index) => base + (index < extra ? 1 : 0))
}

function raidLayout(raid, diskCount, groupCount = 2) {
  const count = Math.max(0, Number(diskCount) || 0)
  if (!count || !raid) return []

  if (raid === 'RAID50') {
    return distribute(count, Math.max(2, Number(groupCount) || 2)).map((groupSize, index) => ({
      name: `Groupe RAID 5 ${index + 1}`,
      parity: 1,
      count: groupSize
    }))
  }

  if (raid === 'RAID60') {
    return distribute(count, Math.max(2, Number(groupCount) || 2)).map((groupSize, index) => ({
      name: `Groupe RAID 6 ${index + 1}`,
      parity: 2,
      count: groupSize
    }))
  }

  if (raid === 'RAID10') {
    const mirrorCount = Math.max(1, Math.floor(count / 2))
    return distribute(count, mirrorCount).map((groupSize, index) => ({
      name: `Miroir ${index + 1}`,
      mirror: true,
      count: groupSize
    }))
  }

  if (raid === 'RAID1') {
    return [{ name: 'Miroir RAID 1', mirror: true, count }]
  }

  const parity = raid === 'RAID6' ? 2 : raid === 'RAID5' ? 1 : 0
  return [{ name: raid, parity, count }]
}

function Disk({ type, label }) {
  const diskLabel = type === 'parity' ? 'P' : type === 'mirror' ? 'M' : 'D'

  return (
    <span className={`raid-disk raid-disk--${type}`} title={label} role="img" aria-label={label}>
      <i />
      <b>{diskLabel}</b>
    </span>
  )
}

export function RaidDiagram({ raid, diskCount, hotSpares = 0, groupCount = 2, sectionNumber = '04' }) {
  const active = Math.max(0, Number(diskCount) || 0)
  const spares = Math.max(0, Number(hotSpares) || 0)
  const groups = raidLayout(raid, active, groupCount)

  if (!raid || active <= 0) return null

  return (
    <section className="panel raid-visual" aria-labelledby="raid-visual-title">
      <div className="heading raid-visual__heading">
        <div>
          <span>{sectionNumber}</span>
          <h2 id="raid-visual-title">Organisation RAID</h2>
        </div>
        <b>{raid} · {active} disques actifs</b>
      </div>
      <div className="raid-groups">
        {groups.map(group => (
          <article className="raid-group" key={group.name}>
            <header>
              <strong>{group.name}</strong>
              <span>
                {group.count} disque{group.count > 1 ? 's' : ''}
              </span>
            </header>
            <div className="raid-disks">
              {Array.from({ length: group.count }, (_, index) => {
                const isParity = !group.mirror && index >= group.count - group.parity
                const type = group.mirror ? 'mirror' : isParity ? 'parity' : 'data'
                const label = group.mirror
                  ? `Disque miroir ${index + 1}`
                  : isParity
                    ? `Parité ${index - (group.count - group.parity) + 1}`
                    : `Données ${index + 1}`

                return <Disk key={index} type={type} label={label} />
              })}
            </div>
          </article>
        ))}
        {spares > 0 && (
          <article className="raid-group raid-group--spares">
            <header>
              <strong>Disques de secours</strong>
              <span>
                {spares} disponible{spares > 1 ? 's' : ''}
              </span>
            </header>
            <div className="raid-disks">
              {Array.from({ length: spares }, (_, index) => (
                <Disk key={index} type="spare" label={`Disque de secours ${index + 1}`} />
              ))}
            </div>
          </article>
        )}
      </div>
      <div className="raid-legend">
        <span>
          <i style={{ background: RAID_COLORS.data }} aria-hidden="true" />
          Données
        </span>
        <span>
          <i style={{ background: RAID_COLORS.parity }} aria-hidden="true" />
          Parité
        </span>
        {['RAID1', 'RAID10'].includes(raid) && (
          <span>
            <i style={{ background: RAID_COLORS.mirror }} aria-hidden="true" />
            Miroir
          </span>
        )}
        {spares > 0 && (
          <span>
            <i style={{ background: RAID_COLORS.spare }} aria-hidden="true" />
            Secours
          </span>
        )}
      </div>
      <p className="raid-visual__note">
        Représentation logique simplifiée. La position physique des blocs et de la parité dépend du
        contrôleur RAID
      </p>
    </section>
  )
}
