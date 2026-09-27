import { useState } from 'react'
import { diskTypes } from '../data/disks'
import { buildRaidComparison, calculateRaid, ioProfiles, raidDefinitions, tbToPB, tiBToPiB } from '../utils/raidCalculations'
import { formatIops } from '../utils/formatIops'
import AboutSection from './AboutSection'
import { RaidDiagram } from './RaidEnhancements'

const number = (v, d = 0) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: d }).format(v || 0)
const bandwidth = v => v >= 1e3 ? `${number(v / 1e3, 2)} Go/s` : `${number(v)} Mo/s`
const capacity = (tib, pib) => pib ? `${number(tiBToPiB(tib), 3)} PiB` : `${number(tib, 2)} TiB`
const decimal = (tb, pib) => pib ? `${number(tbToPB(tb), 3)} PB` : `${number(tb, 2)} TB`
const duration = h => h >= 48 ? `${number(h / 24, 1)} jours` : `${number(h, 1)} h`

function Heading({ n, title, badge }) { return <div className="heading"><div><span>{n}</span><h2>{title}</h2></div><b>{badge}</b></div> }
function Stars({ value }) { return <span className="stars">{[1,2,3,4,5].map(x => <i key={x} className={x <= value ? 'on' : ''} />)}</span> }
function Metric({ label, value, detail, accent = '' }) { return <article className={`metric ${accent}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article> }
function RebuildCard({ title, value, detail, accent }) { return <article className={`rebuild-card ${accent}`}><span>{title}</span><strong>{value === null ? 'Non disponible' : duration(value)}</strong><small>{detail}</small><div className="rebuild-bar"><i style={{ width: `${value === null ? 0 : Math.min(100, value / 96 * 100)}%` }} /></div></article> }

export default function RaidCalculator({ active = true, advanced = false }) {
  const [raid, setRaid] = useState('')
  const [diskType, setDiskType] = useState('')
  const [diskCount, setDiskCount] = useState('')
  const [hotSpares, setHotSpares] = useState(0)
  const [diskSizeTB, setDiskSizeTB] = useState('')
  const [groupCount, setGroupCount] = useState(2)
  const [rebuildLoad, setRebuildLoad] = useState(40)
  const calculateIops = advanced
  const calculateRebuild = true
  const [usePiB, setUsePiB] = useState(false)
  const [ioProfile, setIoProfile] = useState('database')
  const [readPercent, setReadPercent] = useState(ioProfiles.database.readPercent)
  const [accessPattern, setAccessPattern] = useState(ioProfiles.database.accessPattern)
  const [blockSizeKiB, setBlockSizeKiB] = useState(ioProfiles.database.blockSizeKiB)

  const disk = diskTypes[diskType]
  const definition = raidDefinitions[raid]
  const grouped = ['RAID50', 'RAID60'].includes(raid)
  const args = { raid, diskCount, hotSpares, diskSizeTB, groupCount, disk, rebuildLoad, readPercent, accessPattern, blockSizeKiB, calculateIops, calculateRebuild }
  const result = calculateRaid(args)
  const comparison = buildRaidComparison(args)
  const ready = raid && diskType && diskCount && diskSizeTB
  const selectedProfile = ioProfiles[ioProfile]
  const updateReadPercent = value => {
    const percent = Number(value)
    if (Number.isFinite(percent)) {
      setReadPercent(Math.max(0, Math.min(100, percent)))
      setIoProfile('custom')
    }
  }
  const selectIoProfile = value => {
    const profile = ioProfiles[value]
    setIoProfile(value)
    setReadPercent(profile.readPercent)
    setAccessPattern(profile.accessPattern)
    setBlockSizeKiB(profile.blockSizeKiB)
  }

  return <div hidden={!active}>
    <section className="workspace">
      <div className="raid-controls">
        <article className="panel"><Heading n="01" title="Configuration RAID" badge={definition?.label || 'À configurer'} /><div className="form-grid">
          <label><span>Type de disque</span><select value={diskType} onChange={e => setDiskType(e.target.value)}><option value="">Sélectionner un type de disque</option>{Object.keys(diskTypes).map(x => <option key={x}>{x}</option>)}</select></label>
          <label><span>Type de RAID</span><select value={raid} onChange={e => setRaid(e.target.value)}><option value="">Sélectionner un niveau RAID</option>{Object.entries(raidDefinitions).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
          <label><span>Disques actifs</span><input type="number" min="1" step="1" placeholder="Nombre de disques" value={diskCount} onChange={e => setDiskCount(e.target.value)} /></label>
          <label><span>Capacité par disque</span><div className="input-unit"><input type="number" step="1" placeholder="Capacité" value={diskSizeTB} onChange={e => setDiskSizeTB(e.target.value)} /><em>TB</em></div></label>
          <label><span>Hot spares</span><input type="number" min="0" step="1" value={hotSpares} onChange={e => setHotSpares(Number(e.target.value))} /></label>
          {grouped && <label className="wide"><span>Nombre de groupes</span><input type="number" min="2" step="1" value={groupCount} onChange={e => setGroupCount(Number(e.target.value))} /><small>{diskCount && groupCount ? `${number(Number(diskCount) / groupCount, 1)} disques actifs par groupe` : ''}</small></label>}
        </div>
        {definition && <div className="raid-info"><span>{definition.description}</span><strong>Coût d’écriture aléatoire ×{definition.writePenalty}</strong></div>}
        {!ready && <div className="invitation">Sélectionnez le disque, le RAID, le nombre et la capacité des disques</div>}{result.ready && !result.valid && <div className="error">{result.message}</div>}</article>
      </div>
      <article className="panel"><Heading n="02" title="Disque sélectionné" badge={disk?.technology || 'En attente'} />{disk ? <>
        <div className="disk-title"><strong>{diskType}</strong><span>{disk.technology} · {disk.interface} · {disk.workload}</span></div>
      <div className="disk-grid">
        <div><span>IOPS lecture de référence</span><strong>{formatIops(disk.readIops)}</strong></div>
        <div><span>IOPS écriture de référence</span><strong>{formatIops(disk.writeIops)}</strong></div>
        <div><span>Débit lecture</span><strong>{bandwidth(disk.readBandwidthMBps)}</strong></div>
        <div><span>Débit écriture</span><strong>{bandwidth(disk.writeBandwidthMBps)}</strong></div>
        <div><span>Débit rebuild retenu</span><strong>{bandwidth(disk.rebuildMBps)}</strong></div>
      </div>
      <p className="profile-sum">Valeurs indicatives du calculateur, non rattachées à une référence constructeur.</p>
      </> : <div className="empty">Les caractéristiques du disque apparaîtront ici</div>}</article>
    </section>

    {calculateIops && <article className="panel io-profile">
      <Heading n="IO" title="Profil IO" badge="Charge applicative" />
      <div className="form-grid">
        <label className="wide"><span>Profil d’usage</span><select value={ioProfile} onChange={e => selectIoProfile(e.target.value)}>{Object.entries(ioProfiles).map(([key, profile]) => <option key={key} value={key}>{profile.label}</option>)}</select></label>
        <label><span>Lecture</span><div className="input-unit"><input type="number" min="0" max="100" step="1" value={readPercent} onChange={e => updateReadPercent(e.target.value)} /><em>%</em></div></label>
        <label><span>Écriture</span><div className="input-unit"><input type="number" min="0" max="100" step="1" value={100 - readPercent} onChange={e => updateReadPercent(100 - Number(e.target.value))} /><em>%</em></div></label>
        <label><span>Type d’accès</span><select value={accessPattern} onChange={e => { setAccessPattern(e.target.value); setIoProfile('custom') }}><option value="random">Aléatoire (petites E/S)</option><option value="sequential">Séquentiel (flux contigus)</option></select></label>
        <label><span>Taille de bloc</span><select value={blockSizeKiB} onChange={e => { setBlockSizeKiB(Number(e.target.value)); setIoProfile('custom') }}>{[4, 8, 16, 32, 64, 128, 256].map(size => <option key={size} value={size}>{size} KiB</option>)}</select></label>
      </div>
      <p className="profile-recommendation"><strong>Recommandation — {selectedProfile.label} :</strong> {selectedProfile.recommendation}</p>
      <p className="profile-sum">Lecture + écriture : 100 % de la charge logique.</p>
    </article>}

    {result.valid && <>
      <section className="panel"><Heading n="03" title="Comparaison RAID" badge={calculateIops ? `${readPercent} % lecture · ${100 - readPercent} % écriture` : 'Capacité'} /><div className="table-wrap"><table><thead><tr><th>RAID</th><th>Capacité utile</th><th>Rendement installé</th>{calculateIops && <th>IOPS lecture estimées</th>}<th>Débit lecture</th>{calculateIops && <th>IOPS écriture estimées</th>}<th>Débit écriture</th>{calculateRebuild && <th>Rebuild réaliste</th>}<th>Résilience</th></tr></thead><tbody>{comparison.filter(x => x.result.valid).map(x => <tr key={x.raid} className={x.raid === raid ? 'selected' : ''}><td><b>{x.definition.label}</b></td><td>{capacity(x.result.usableTiB, usePiB)}<small>({decimal(x.result.usableTB, usePiB)})</small></td><td>{number(x.result.efficiencyInstalled, 1)} %</td>{calculateIops && <td>{formatIops(x.result.readIops)}</td>}<td>{bandwidth(x.result.readBandwidthMBps)}</td>{calculateIops && <td>{formatIops(x.result.writeIops)}</td>}<td>{bandwidth(x.result.writeBandwidthMBps)}</td>{calculateRebuild && <td>{x.result.rebuild.realistic === null ? 'Non disponible' : duration(x.result.rebuild.realistic)}</td>}<td><Stars value={x.result.resilience} /></td></tr>)}</tbody></table></div>{calculateIops && <p className="profile-sum">Les IOPS de ce tableau utilisent le profil sélectionné, le bloc de {blockSizeKiB} KiB et les coûts physiques propres à chaque niveau RAID.</p>}</section>

      <RaidDiagram raid={raid} diskCount={diskCount} hotSpares={hotSpares} groupCount={groupCount}/>

      {calculateRebuild && <section className="panel"><Heading n="05" title="Analyse de reconstruction" badge={`${result.affectedGroupSize} disques dans le domaine concerné`} />
        <div className="rebuild-load"><label><span>Charge pendant le rebuild</span><div className="input-unit"><input type="number" min="0" max="85" step="1" value={rebuildLoad} onChange={e => setRebuildLoad(Number(e.target.value))} /><em>%</em></div></label></div>
        <div className="rebuild-grid">
        <RebuildCard title="Optimiste" value={result.rebuild.optimistic} detail={result.rebuildSupported ? 'Débit nominal, aucune charge applicative' : 'Impossible : RAID 0 ne protège pas les données'} accent="green" />
        <RebuildCard title="Réaliste" value={result.rebuild.realistic} detail={result.rebuildSupported ? `Charge ${rebuildLoad} % · facteur domaine ×${number(result.rebuild.groupWorkloadFactor, 2)}` : 'Impossible : RAID 0 ne protège pas les données'} accent="orange" />
        <RebuildCard title="Dégradé" value={result.rebuild.degraded} detail={result.rebuildSupported ? '35 % de marge supplémentaire sur le temps réaliste' : 'Impossible : RAID 0 ne protège pas les données'} accent="red" />
      </div><div className={`spare-note ${result.spares ? 'ok' : 'warning'}`}><strong>{result.hotSpareStatus}</strong><span>{result.spares ? 'La reconstruction peut démarrer automatiquement si le contrôleur est configuré pour utiliser le spare' : 'Prévoir un remplacement manuel rapide pour limiter la fenêtre sans redondance complète'}</span></div></section>}

      {(calculateIops || calculateRebuild) && <footer><strong>Hypothèses {calculateIops && calculateRebuild ? 'IOPS et rebuild' : calculateIops ? 'IOPS' : 'rebuild'}</strong><span>
        {calculateIops && <>Les IOPS logiques sont limitées par les budgets physiques cumulés des disques actifs : une lecture logique consomme 1 lecture physique ; une écriture aléatoire consomme RAID 0 : 1 écriture, RAID 1/10 : 2 écritures, RAID 5/50 : 2 lectures + 2 écritures, RAID 6/60 : 3 lectures + 3 écritures (read-modify-write). Les écritures séquentielles RAID 5/6/50/60 sont supposées regroupées et alignées en bandes complètes (hypothèse optimiste) : aucune lecture préalable et un coût d’écriture égal au nombre de disques du groupe divisé par ses disques de données. Les lectures des miroirs sont supposées réparties entre leurs membres. Les références IOPS par disque sont plafonnées par le débit nominal divisé par la taille de bloc ; le profil et le ratio lecture/écriture déterminent ensuite la charge logique soutenable. C’est un modèle théorique simplifié, pas une mesure ni une donnée constructeur garantie : il ignore cache, contrôleur, files, granularité réelle des E/S et limites de bus. Les recommandations sont des points de départ à ajuster avec les traces de l’application.</>}
        {calculateIops && calculateRebuild && ' '}
        {calculateRebuild && <>Pour la reconstruction, temps nominal = capacité / débit retenu ; le scénario réaliste applique la charge saisie et ajoute 8 % (RAID 5/50) ou 12 % (RAID 6/60) de contention par membre du domaine au-delà de 2. Le scénario dégradé ajoute 35 % au temps réaliste. RAID 0 ne peut pas reconstruire un disque. Ces facteurs ne sont pas des garanties : contrôleur, firmware, priorité, erreurs de lecture et E/S réelles peuvent fortement modifier les durées.</>}
      </span></footer>}

    </>}

    <AboutSection
      eyebrow="À PROPOS DU CALCULATEUR"
      title={advanced ? 'Évaluer les performances d’un groupe RAID' : 'Dimensionner un groupe RAID en quelques secondes'}
      description={advanced
        ? 'Comparez capacité, performances, IOPS estimées et reconstruction avec un profil IO ajustable.'
        : 'Une lecture synthétique de la capacité, des performances, de la résilience et de la fenêtre de reconstruction.'}
      items={[
        {
          icon: 'capacity',
          label: 'Niveaux RAID',
          value: Object.keys(raidDefinitions).length,
          description: 'RAID 0, 1, 5, 6, 10, 50 et 60'
        },
        {
          icon: 'performance',
          label: 'Technologies disque',
          value: Object.keys(diskTypes).length,
          description: 'HDD SATA/SAS, SSD et NVMe'
        },
        {
          icon: advanced ? 'performance' : 'resilience',
          label: advanced ? 'Estimation' : 'Analyse',
          value: advanced ? 'IOPS' : '3 axes',
          description: advanced ? 'IOPS lecture et écriture selon le profil IO' : 'Capacité, débit et tolérance aux pannes'
        },
        {
          icon: 'rebuild',
          label: 'Reconstruction',
          value: '3 scénarios',
          description: 'Optimiste, réaliste et dégradé'
        }
      ]}
      highlights={['Calcul en TiB et PiB', 'Disques de secours', 'Comparaison RAID', '100 % navigateur']}
    />
  </div>
}
