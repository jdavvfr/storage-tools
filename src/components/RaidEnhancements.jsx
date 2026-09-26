import './RaidEnhancements.css'

const RAID_COLORS = {
  data: '#38bdf8',
  parity: '#f59e0b',
  mirror: '#a78bfa',
  spare: '#64748b'
}

function Icon({ name }) {
  const paths = {
    capacity: <><path d="M4 7h16v12H4z"/><path d="M7 4h10v3M8 15h8M8 11h3"/></>,
    performance: <><path d="M4 15a8 8 0 0 1 16 0"/><path d="m12 15 4-5M6 19h12"/></>,
    resilience: <><path d="M12 3 5 6v5c0 4.4 2.8 8.1 7 10 4.2-1.9 7-5.6 7-10V6z"/><path d="m9 12 2 2 4-5"/></>,
    rebuild: <><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/></>
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function AboutCard({ icon, title, value, text }) {
  return <article className="about-card">
    <div className="about-card__icon"><Icon name={icon}/></div>
    <div><span>{title}</span><strong>{value}</strong><p>{text}</p></div>
  </article>
}

export function GraphicalAbout({ supportedRaidCount = 7, supportedDiskCount = 0 }) {
  return <section className="panel graphical-about" aria-labelledby="about-title">
    <div className="section-intro">
      <span>À PROPOS DE L’OUTIL</span>
      <h2 id="about-title">Dimensionner un Group RAID en quelques secondes</h2>
      <p>Une lecture synthétique de la capacité, des performances, de la résilience et de la fenêtre de reconstruction</p>
    </div>
    <div className="about-grid">
      <AboutCard icon="capacity" title="Niveaux RAID" value={supportedRaidCount} text="RAID 0, 1, 5, 6, 10, 50 et 60"/>
      <AboutCard icon="performance" title="Technologies disque" value={supportedDiskCount || 'Multi'} text="HDD SATA/SAS, SSD et NVMe"/>
      <AboutCard icon="resilience" title="Analyse" value="4 axes" text="Capacité, débit, IOPS et tolérance aux pannes"/>
      <AboutCard icon="rebuild" title="Reconstruction" value="3 scénarios" text="Optimiste, réaliste et dégradé"/>
    </div>
    <div className="about-pill-row">
      <span>Calcul en TiB et PiB</span><span>Disques de secours</span><span>Comparaison RAID</span><span>100 % navigateur</span>
    </div>
  </section>
}

function distribute(total, groups) {
  const safeGroups = Math.max(1, groups)
  const base = Math.floor(total / safeGroups)
  const extra = total % safeGroups
  return Array.from({length: safeGroups}, (_, i) => base + (i < extra ? 1 : 0))
}

function raidLayout(raid, diskCount, groupCount = 2) {
  const count = Math.max(0, Number(diskCount) || 0)
  if (!count || !raid) return []
  if (raid === 'RAID50')return distribute(count,Math.max(2, Number(groupCount) || 2)).map((n, i) => ({name: `Groupe RAID 5 ${i + 1}`,parity: 1,count: n}))
  if (raid === 'RAID60')return distribute(count,Math.max(2, Number(groupCount) || 2)  ).map((n, i) => ({name: `Groupe RAID 6 ${i + 1}`,parity: 2,count: n}))
  if (raid === 'RAID10') return distribute(count, Math.max(1, Math.floor(count/2))).map((n, i) => ({name:`Miroir ${i+1}`, mirror:true, count:n}))
  const parity = raid === 'RAID6' ? 2 : raid === 'RAID5' ? 1 : 0
  return [{name: raid, parity, count}]
}

function Disk({ type, label }) {
  return <span className={`raid-disk raid-disk--${type}`} title={label} aria-label={label}>
    <i/><b>{type === 'parity' ? 'P' : type === 'mirror' ? 'M' : 'D'}</b>
  </span>
}

export function RaidDiagram({ raid, diskCount, hotSpares = 0 ,groupCount = 2}) {
  const active = Math.max(0, (Number(diskCount) || 0) - (Number(hotSpares) || 0))
  const groups = raidLayout(raid, active, groupCount)
  if (!raid || active <= 0) return null
  return <section className="panel raid-visual" aria-labelledby="raid-visual-title">
    <div className="heading raid-visual__heading"><div><span>04</span><h2 id="raid-visual-title">Organisation du RAID</h2></div><b>{active} disques actifs</b></div>
    <div className="raid-groups">
      {groups.map((group, groupIndex) => <article className="raid-group" key={`${group.name}-${groupIndex}`}>
        <header><strong>{group.name}</strong><span>{group.count} disque{group.count > 1 ? 's' : ''}</span></header>
        <div className="raid-disks">
          {Array.from({length: group.count}, (_, i) => {
            const isParity = !group.mirror && i >= group.count - group.parity
            const type = group.mirror ? 'mirror' : isParity ? 'parity' : 'data'
            const label = group.mirror ? `Disque miroir ${i+1}` : isParity ? `Parité ${i-(group.count-group.parity)+1}` : `Données ${i+1}`
            return <Disk key={i} type={type} label={label}/>
          })}
        </div>
      </article>)}
      {Number(hotSpares) > 0 && <article className="raid-group raid-group--spares">
        <header><strong>Disques de secours</strong><span>{hotSpares} disponible{Number(hotSpares) > 1 ? 's' : ''}</span></header>
        <div className="raid-disks">{Array.from({length:Number(hotSpares)},(_,i)=><Disk key={i} type="spare" label={`Disque de secours ${i+1}`}/>)}</div>
      </article>}
    </div>
    <div className="raid-legend">
      <span><i style={{background:RAID_COLORS.data}}/>Données</span>
      <span><i style={{background:RAID_COLORS.parity}}/>Parité</span>
      {raid === 'RAID 10' && <span><i style={{background:RAID_COLORS.mirror}}/>Miroir</span>}
      {Number(hotSpares) > 0 && <span><i style={{background:RAID_COLORS.spare}}/>Secours</span>}
    </div>
    <p className="raid-visual__note">Représentation logique simplifiée. La position physique des blocs et de la parité dépend du contrôleur RAID</p>
  </section>
}
