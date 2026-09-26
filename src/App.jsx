import { useState } from 'react'
import { diskTypes } from './data/disks'
import { buildRaidComparison, calculateRaid, raidDefinitions, tbToPB, tiBToPiB } from './utils/raidCalculations'
import { GraphicalAbout, RaidDiagram } from './components/RaidEnhancements'
import CapacityConverter from './components/CapacityConverter'
import './App.css'

const number = (v, d = 0) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: d }).format(v || 0)
const iops = v => v >= 1e6 ? `${number(v / 1e6, 2)} M` : v >= 1e3 ? `${number(v / 1e3, 1)} k` : number(v)
const bandwidth = v => v >= 1e3 ? `${number(v / 1e3, 2)} Go/s` : `${number(v)} Mo/s`
const capacity = (tib, pib) => pib ? `${number(tiBToPiB(tib), 3)} PiB` : `${number(tib, 2)} TiB`
const decimal = (tb, pib) => pib ? `${number(tbToPB(tb), 3)} PB` : `${number(tb, 2)} TB`
const duration = h => h >= 48 ? `${number(h / 24, 1)} jours` : `${number(h, 1)} h`

function Heading({ n, title, badge }) { return <div className="heading"><div><span>{n}</span><h2>{title}</h2></div><b>{badge}</b></div> }
function Stars({ value }) { return <span className="stars">{[1,2,3,4,5].map(x => <i key={x} className={x <= value ? 'on' : ''} />)}</span> }
function Metric({ label, value, detail, accent = '' }) { return <article className={`metric ${accent}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article> }
function RebuildCard({ title, value, detail, accent }) { return <article className={`rebuild-card ${accent}`}><span>{title}</span><strong>{value === null ? 'Non disponible' : duration(value)}</strong><small>{detail}</small><div className="rebuild-bar"><i style={{ width: `${value === null ? 0 : Math.min(100, value / 96 * 100)}%` }} /></div></article> }

function App() {
  const [activeTool, setActiveTool] = useState('raid')
  const [raid, setRaid] = useState('')
  const [diskType, setDiskType] = useState('')
  const [diskCount, setDiskCount] = useState('')
  const [hotSpares, setHotSpares] = useState(0)
  const [diskSizeTB, setDiskSizeTB] = useState('')
  const [groupCount, setGroupCount] = useState(2)
  const [rebuildLoad, setRebuildLoad] = useState(40)
  const [usePiB, setUsePiB] = useState(false)

  const disk = diskTypes[diskType]
  const definition = raidDefinitions[raid]
  const grouped = ['RAID50', 'RAID60'].includes(raid)
  const args = { raid, diskCount, hotSpares, diskSizeTB, groupCount, disk, rebuildLoad }
  const result = calculateRaid(args)
  const comparison = buildRaidComparison(args)
  const ready = raid && diskType && diskCount && diskSizeTB

  return <main className="shell">
    <nav className="tool-navigation" aria-label="Outils de stockage">
      <button type="button" className={activeTool === 'raid' ? 'active' : ''} aria-current={activeTool === 'raid' ? 'page' : undefined} onClick={() => setActiveTool('raid')}>RAID Calculator</button>
      <button type="button" className={activeTool === 'converter' ? 'active' : ''} aria-current={activeTool === 'converter' ? 'page' : undefined} onClick={() => setActiveTool('converter')}>Convertisseur To / TiB</button>
    </nav>
    <header className="hero"><span>STORAGE TOOLS</span><h1>{activeTool === 'raid' ? 'RAID Calculator' : 'Convertisseur To / TiB'}</h1><p>{activeTool === 'raid' ? 'Dimensionnement d’un RAID matériel pour serveur capacitif' : 'Conversion rapide entre capacités décimales et binaires'}</p></header>
    {activeTool === 'converter' ? <CapacityConverter /> : <>
    <section className="workspace">
      <article className="panel"><Heading n="01" title="Configuration RAID" badge={definition?.label || 'À configurer'} /><div className="form-grid">
        <label><span>Type de disque</span><select value={diskType} onChange={e => setDiskType(e.target.value)}><option value="">Sélectionner un type de disque</option>{Object.keys(diskTypes).map(x => <option key={x}>{x}</option>)}</select></label>
        <label><span>Type de RAID</span><select value={raid} onChange={e => setRaid(e.target.value)}><option value="">Sélectionner un niveau RAID</option>{Object.entries(raidDefinitions).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
        <label><span>Disques actifs</span><input type="number" min="1" placeholder="Ex. 12" value={diskCount} onChange={e => setDiskCount(e.target.value)} /></label>
        <label><span>Capacité par disque</span><div className="input-unit"><input type="number" step="0.01" placeholder="Ex. 20" value={diskSizeTB} onChange={e => setDiskSizeTB(e.target.value)} /><em>TB</em></div></label>
        <label><span>Hot spares</span><input type="number" min="0" step="1" value={hotSpares} onChange={e => setHotSpares(Number(e.target.value))} /></label>
        <label><span>Charge pendant le rebuild</span><div className="input-unit"><input type="number" min="0" max="85" value={rebuildLoad} onChange={e => setRebuildLoad(Number(e.target.value))} /><em>%</em></div></label>
        {grouped && <label className="wide"><span>Nombre de groupes</span><input type="number" min="2" value={groupCount} onChange={e => setGroupCount(Number(e.target.value))} /><small>{diskCount && groupCount ? `${number(Number(diskCount) / groupCount, 1)} disques actifs par groupe` : ''}</small></label>}
      </div>{!ready && <div className="invitation">Sélectionnez le disque, le RAID, le nombre et la capacité des disques</div>}{definition && <div className="raid-info"><span>{definition.description}</span><strong>Pénalité écriture ×{definition.writePenalty}</strong></div>}{result.ready && !result.valid && <div className="error">{result.message}</div>}</article>
      <article className="panel"><Heading n="02" title="Disque sélectionné" badge={disk?.technology || 'En attente'} />{disk ? <>
        <div className="disk-title"><strong>{diskType}</strong><span>{disk.technology} · {disk.interface} · {disk.workload}</span></div>
      <div className="disk-grid">
        <div><span>IOPS lecture</span><strong>{iops(disk.readIops)}</strong></div>
        <div><span>IOPS écriture</span><strong>{iops(disk.writeIops)}</strong></div>
        <div><span>Débit lecture</span><strong>{bandwidth(disk.readBandwidthMBps)}</strong></div>
        <div><span>Débit écriture</span><strong>{bandwidth(disk.writeBandwidthMBps)}</strong></div>
        <div><span>Débit rebuild retenu</span><strong>{bandwidth(disk.rebuildMBps)}</strong></div>
      </div>
      </> : <div className="empty">Les caractéristiques du disque apparaîtront ici</div>}</article>
    </section>

    {result.valid && <>
      <section className="panel"><Heading n="03" title="Capacité et performances" badge={<label className="pib-check"><input type="checkbox" checked={usePiB} onChange={e => setUsePiB(e.target.checked)} /> PiB</label>} /><div className="metrics">
        <Metric label="Capacité utile" value={capacity(result.usableTiB, usePiB)} detail={`(${decimal(result.usableTB, usePiB)})`} accent="cyan" />
        <Metric label="IOPS lecture" value={iops(result.readIops)}accent="purple" />
        <Metric label="IOPS écriture" value={iops(result.writeIops)} detail={`Pénalité ×${result.writePenalty}`} accent="purple" />
        <Metric label="Résilience" value={<Stars value={result.resilience} />} detail={`${result.resilience}/5 · ${result.faultTolerance}`} accent="green" />
        <Metric label="Brut installé" value={capacity(result.installedRawTiB, usePiB)} detail={`(${decimal(result.installedRawTB, usePiB)}) · ${result.hotSpareStatus}`} />
        <Metric label="Débit lecture" value={bandwidth(result.readBandwidthMBps)} detail="Séquentiel théorique" />
        <Metric label="Débit écriture" value={bandwidth(result.writeBandwidthMBps)} detail="Séquentiel théorique" accent="purple" />
        <Metric label="Rendement installé" value={`${number(result.efficiencyInstalled, 1)} %`} detail={`${result.active} actifs + ${result.spares} spare${result.spares > 1 ? 's' : ''}`} /> 
      </div></section>
    
      <RaidDiagram raid={raid} diskCount={diskCount} hotSpares={hotSpares} groupCount={groupCount}/>

      <section className="panel"><Heading n="05" title="Analyse de reconstruction" badge={`${result.affectedGroupSize} disques dans le domaine concerné`} /><div className="rebuild-grid">
        <RebuildCard title="Optimiste" value={result.rebuild.optimistic} detail={result.rebuildSupported ? 'Débit nominal, aucune charge applicative' : 'Impossible : RAID 0 ne protège pas les données'} accent="green" />
        <RebuildCard title="Réaliste" value={result.rebuild.realistic} detail={result.rebuildSupported ? `Charge ${rebuildLoad} % · facteur domaine ×${number(result.rebuild.groupWorkloadFactor, 2)}` : 'Impossible : RAID 0 ne protège pas les données'} accent="orange" />
        <RebuildCard title="Dégradé" value={result.rebuild.degraded} detail={result.rebuildSupported ? '35 % de marge supplémentaire sur le temps réaliste' : 'Impossible : RAID 0 ne protège pas les données'} accent="red" />
      </div><div className={`spare-note ${result.spares ? 'ok' : 'warning'}`}><strong>{result.hotSpareStatus}</strong><span>{result.spares ? 'La reconstruction peut démarrer automatiquement si le contrôleur est configuré pour utiliser le spare' : 'Prévoir un remplacement manuel rapide pour limiter la fenêtre sans redondance complète'}</span></div></section>

      <footer><strong>Hypothèses</strong><span>Estimation par disque : temps nominal = capacité / débit retenu ; le scénario réaliste applique la charge saisie et ajoute 8 % (RAID 5/50) ou 12 % (RAID 6/60) de contention par membre du domaine au-delà de 2. RAID 1/10 : 0 %. RAID 50/60 : le domaine est le groupe. Le scénario dégradé ajoute 35 % au temps réaliste. RAID 0 ne peut pas reconstruire un disque. Ces facteurs sont des hypothèses, pas des garanties : contrôleur, firmware, priorité, erreurs de lecture et E/S réelles peuvent fortement modifier les durées.</span></footer>

      <section className="panel"><Heading n="06" title="Comparaison RAID" badge="Même nombre de disques actifs" /><div className="table-wrap"><table><thead><tr><th>RAID</th><th>Capacité utile</th><th>Rendement installé</th><th>Débit écriture</th><th>Rebuild réaliste</th><th>Résilience</th></tr></thead><tbody>{comparison.filter(x => x.result.valid).map(x => <tr key={x.raid} className={x.raid === raid ? 'selected' : ''}><td><b>{x.definition.label}</b></td><td>{capacity(x.result.usableTiB, usePiB)}<small>({decimal(x.result.usableTB, usePiB)})</small></td><td>{number(x.result.efficiencyInstalled, 1)} %</td><td>{bandwidth(x.result.writeBandwidthMBps)}</td><td>{x.result.rebuild.realistic === null ? 'Non disponible' : duration(x.result.rebuild.realistic)}</td><td><Stars value={x.result.resilience} /></td></tr>)}</tbody></table></div></section>
    </>}

    <GraphicalAbout supportedRaidCount={Object.keys(raidDefinitions).length} supportedDiskCount={Object.keys(diskTypes).length}/>
    </>}
  </main>
}
export default App
