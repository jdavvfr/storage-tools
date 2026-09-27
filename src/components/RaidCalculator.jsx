import { useState } from 'react'
import { diskTypes } from '../data/disks'
import { buildRaidComparison, calculateNominalRebuildBandwidth, calculateRaid, DEFAULT_IO_PROFILE, ioProfiles, raidDefinitions, sortedIoProfiles, tbToPB, tiBToPiB } from '../utils/raidCalculations'
import { sortRaidComparison } from '../utils/raidComparison'
import { formatIops } from '../utils/formatIops'
import AboutSection from './AboutSection'
import { RaidDiagram } from './RaidEnhancements'

const number = (v, d = 0) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: d }).format(v || 0)
const bandwidth = v => v >= 1e3 ? `${number(v / 1e3, 2)} Go/s` : `${number(v)} Mo/s`
const capacity = (tib, pib) => pib ? `${number(tiBToPiB(tib), 3)} PiB` : `${number(tib, 2)} TiB`
const decimal = (tb, pib) => pib ? `${number(tbToPB(tb), 3)} PB` : `${number(tb, 2)} TB`
const duration = h => h >= 48 ? `${number(h / 24, 1)} jours` : `${number(h, 1)} h`
const comparisonSortOptions = [
  { key: 'raid', label: 'RAID' },
  { key: 'usableTB', label: 'CAPACITÉ UTILE' },
  { key: 'efficiencyInstalled', label: 'RENDEMENT INSTALLÉ' },
  { key: 'readBandwidthMBps', label: 'DÉBIT LECTURE' },
  { key: 'readIops', label: 'IOPS LECTURE' },
  { key: 'writeBandwidthMBps', label: 'DÉBIT ÉCRITURE' },
  { key: 'writeIops', label: 'IOPS ÉCRITURE' },
  { key: 'rebuild.realistic', label: 'REBUILD RÉALISTE' },
  { key: 'resilience', label: 'RÉSILIENCE' }
]
const diskPerformanceFields = [
  { key: 'readIops', label: 'IOPS lecture', unit: 'IOPS', format: formatIops },
  { key: 'writeIops', label: 'IOPS écriture', unit: 'IOPS', format: formatIops },
  { key: 'readBandwidthMBps', label: 'Débit lecture', unit: 'Mo/s', format: bandwidth },
  { key: 'writeBandwidthMBps', label: 'Débit écriture', unit: 'Mo/s', format: bandwidth }
]

function Heading({ n, title, badge }) { return <div className="heading"><div><span>{n}</span><h2>{title}</h2></div><b>{badge}</b></div> }
function Stars({ value }) { return <span className="stars" role="img" aria-label={`Résilience : ${value} sur 5`}>{[1,2,3,4,5].map(x => <i key={x} className={x <= value ? 'on' : ''} />)}</span> }
function Metric({ label, value, detail, accent = '', className = '' }) { return <article className={`metric ${accent} ${className}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article> }
function RebuildCard({ title, value, detail, accent }) { return <article className={`rebuild-card ${accent}`}><span>{title}</span><strong>{value === null ? 'Non disponible' : duration(value)}</strong><small>{detail}</small><div className="rebuild-bar"><i style={{ width: `${value === null ? 0 : Math.min(100, value / 96 * 100)}%` }} /></div></article> }
function ComparisonIndicator({ value, selectedValue, lowerIsBetter = false, metric }) {
  if (!Number.isFinite(value) || !Number.isFinite(selectedValue) || value === selectedValue) return null

  const isHigher = value > selectedValue
  const isBetter = lowerIsBetter ? !isHigher : isHigher
  const direction = isHigher ? '↑' : '↓'
  const difference = isHigher ? 'supérieure' : 'inférieure'

  return <span
    className={`comparison-indicator ${isBetter ? 'better' : 'worse'}`}
    role="img"
    aria-label={`${metric} : valeur ${difference} à la ligne sélectionnée`}
    title={`${metric} : valeur ${difference} à la ligne sélectionnée`}
  >{direction}</span>
}

export default function RaidCalculator({ active = true, advanced = false }) {
  const [raid, setRaid] = useState('')
  const [diskType, setDiskType] = useState('')
  const [diskPerformanceValues, setDiskPerformanceValues] = useState({})
  const [diskCount, setDiskCount] = useState('')
  const [hotSpares, setHotSpares] = useState(0)
  const [diskSizeTB, setDiskSizeTB] = useState('')
  const [groupCount, setGroupCount] = useState(2)
  const [rebuildLoad, setRebuildLoad] = useState(0)
  const calculateIops = true
  const calculateRebuild = advanced
  const [usePiB, setUsePiB] = useState(false)
  const defaultProfile = DEFAULT_IO_PROFILE
  const [ioProfile, setIoProfile] = useState(defaultProfile)
  const [readPercent, setReadPercent] = useState(ioProfiles[defaultProfile].readPercent)
  const [accessPattern, setAccessPattern] = useState(ioProfiles[defaultProfile].accessPattern)
  const [blockSizeKiB, setBlockSizeKiB] = useState(ioProfiles[defaultProfile].blockSizeKiB)
  const [manualSelection, setManualSelection] = useState(null)
  const [parameterRevision, setParameterRevision] = useState(0)
  const [comparisonSort, setComparisonSort] = useState(null)

  const disk = diskTypes[diskType]
  const currentDiskPerformanceValues = disk
    ? Object.fromEntries(diskPerformanceFields.map(({ key }) => [key, diskPerformanceValues[key] ?? String(disk[key])]))
    : {}
  const customizedDiskPerformance = disk && diskPerformanceFields.some(({ key }) =>
    Number(currentDiskPerformanceValues[key]) !== disk[key]
  )
  const calculationDisk = disk && advanced
    ? {
        ...disk,
        ...Object.fromEntries(diskPerformanceFields.map(({ key }) => [key, Number(currentDiskPerformanceValues[key])])),
        rebuildMBps: calculateNominalRebuildBandwidth(disk, {
          readBandwidthMBps: Number(currentDiskPerformanceValues.readBandwidthMBps),
          writeBandwidthMBps: Number(currentDiskPerformanceValues.writeBandwidthMBps)
        })
      }
    : disk
  const validDiskPerformance = disk && diskPerformanceFields.every(({ key }) => {
    const value = Number(currentDiskPerformanceValues[key])
    return Number.isFinite(value) && value > 0
  })
  const definition = raidDefinitions[raid]
  const grouped = ['RAID50', 'RAID60'].includes(raid)
  const args = { raid, diskCount, hotSpares, diskSizeTB, groupCount, disk: calculationDisk, rebuildLoad, readPercent, accessPattern, blockSizeKiB, calculateIops, calculateRebuild }
  const result = calculateRaid(args)
  const comparison = advanced ? buildRaidComparison(args) : []
  const validComparison = comparison.filter(row => row.result.valid)
  const sortedComparison = sortRaidComparison(validComparison, comparisonSort)
  const configuredComparison = validComparison.find(row => row.raid === raid)
  const selectedComparisonRaid = manualSelection?.parameterRevision === parameterRevision &&
    validComparison.some(row => row.raid === manualSelection.raid)
    ? manualSelection.raid
    : configuredComparison?.raid || validComparison[0]?.raid || ''
  const selectedComparison = validComparison.find(row => row.raid === selectedComparisonRaid)
  const selectedResult = selectedComparison?.result
  const ready = raid && diskType && diskCount && diskSizeTB
  const selectedProfile = ioProfiles[ioProfile]
  const updateParameter = (setter, value) => {
    setParameterRevision(revision => revision + 1)
    setter(value)
  }
  const updateReadPercent = value => {
    const percent = Number(value)
    if (Number.isFinite(percent)) {
      updateParameter(setReadPercent, Math.max(0, Math.min(100, percent)))
      setIoProfile('custom')
    }
  }
  const selectIoProfile = value => {
    const profile = ioProfiles[value]
    setParameterRevision(revision => revision + 1)
    setIoProfile(value)
    setReadPercent(profile.readPercent)
    setAccessPattern(profile.accessPattern)
    setBlockSizeKiB(profile.blockSizeKiB)
  }
  const selectDiskType = value => {
    updateParameter(setDiskType, value)
    setDiskPerformanceValues(value
      ? Object.fromEntries(diskPerformanceFields.map(({ key }) => [key, String(diskTypes[value][key])]))
      : {})
  }
  const updateDiskPerformance = (key, value) => {
    setParameterRevision(revision => revision + 1)
    setDiskPerformanceValues(previous => ({ ...previous, [key]: value }))
  }

  return <div hidden={!active}>
    <section className={`raid-layout raid-layout--${advanced ? 'advanced' : 'basic'}`}>
      <div className="raid-parameter-grid">
        <article className="panel"><Heading n="01" title="Configuration RAID" badge={definition?.label || 'À configurer'} /><div className="form-grid">
          <label><span>Type de disque</span><select value={diskType} onChange={e => selectDiskType(e.target.value)}><option value="">Sélectionner un type de disque</option>{Object.keys(diskTypes).map(x => <option key={x}>{x}</option>)}</select></label>
          <label><span>Type de RAID</span><select value={raid} onChange={e => updateParameter(setRaid, e.target.value)}><option value="">Sélectionner un niveau RAID</option>{Object.entries(raidDefinitions).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
          <label><span>Disques actifs</span><input type="number" min="1" step="1" placeholder="Nombre de disques" value={diskCount} onChange={e => updateParameter(setDiskCount, e.target.value)} /></label>
          <label><span>Capacité par disque</span><div className="input-unit"><input type="number" step="1" placeholder="Capacité" value={diskSizeTB} onChange={e => updateParameter(setDiskSizeTB, e.target.value)} /><em>TB</em></div></label>
          <label><span>Hot spares</span><input type="number" min="0" step="1" value={hotSpares} onChange={e => updateParameter(setHotSpares, Number(e.target.value))} /></label>
          <label><span>Profil d’usage</span><select value={ioProfile} onChange={e => selectIoProfile(e.target.value)}>{sortedIoProfiles.map(([key, profile]) => <option key={key} value={key}>{profile.label}</option>)}</select></label>
          {grouped && <label className="wide"><span>Nombre de groupes</span><input type="number" min="2" step="1" value={groupCount} onChange={e => updateParameter(setGroupCount, Number(e.target.value))} /><small>{diskCount && groupCount ? `${number(Number(diskCount) / groupCount, 1)} disques actifs par groupe` : ''}</small></label>}
        </div>
        {definition && <div className="raid-info"><span>{definition.description}</span><strong>Coût d’écriture aléatoire ×{definition.writePenalty}</strong></div>}
        {!ready && <div className="invitation">Sélectionnez le disque, le RAID, le nombre et la capacité des disques</div>}{result.ready && !result.valid && <div className="error">{result.message}</div>}</article>
        {advanced && <article className="panel io-profile">
          <Heading n="02" title="Profil IO" badge="Charge applicative" />
          <div className="form-grid">
            <label><span>Lecture</span><div className="input-unit"><input type="number" min="0" max="100" step="1" value={readPercent} onChange={e => updateReadPercent(e.target.value)} /><em>%</em></div></label>
            <label><span>Écriture</span><div className="input-unit"><input type="number" min="0" max="100" step="1" value={100 - readPercent} onChange={e => updateReadPercent(100 - Number(e.target.value))} /><em>%</em></div></label>
            <label><span>Type d’accès</span><select value={accessPattern} onChange={e => { updateParameter(setAccessPattern, e.target.value); setIoProfile('custom') }}><option value="random">Aléatoire (petites E/S)</option><option value="sequential">Séquentiel (flux contigus)</option></select></label>
            <label><span>Taille de bloc</span><select value={blockSizeKiB} onChange={e => { updateParameter(setBlockSizeKiB, Number(e.target.value)); setIoProfile('custom') }}>{[4, 8, 16, 32, 64, 128, 256].map(size => <option key={size} value={size}>{size} KiB</option>)}</select></label>
          </div>
          <p className="profile-recommendation"><strong>Recommandation — {selectedProfile.label} :</strong> {selectedProfile.recommendation}</p>
          <p className="profile-sum">Lecture + écriture : 100 % de la charge logique.</p>
        </article>}
        {!advanced && <article className="panel"><Heading n="02" title="Disque sélectionné" badge={disk?.technology || 'En attente'} />{disk ? <>
          <div className="disk-title"><strong>{diskType}</strong><span>{disk.technology} · {disk.interface} · {disk.workload}</span></div>
          <div className="disk-grid">
            <div><span>IOPS lecture de référence</span><strong>{formatIops(disk.readIops)}</strong></div>
            <div><span>IOPS écriture de référence</span><strong>{formatIops(disk.writeIops)}</strong></div>
            <div><span>Débit lecture</span><strong>{bandwidth(disk.readBandwidthMBps)}</strong></div>
            <div><span>Débit écriture</span><strong>{bandwidth(disk.writeBandwidthMBps)}</strong></div>
            <div><span>Débit rebuild retenu</span><strong>{bandwidth(disk.rebuildMBps)}</strong></div>
          </div>
          <p className="profile-sum">Valeurs indicatives du calculateur, non rattachées à une référence constructeur.</p>
          </> : <div className="empty">Les caractéristiques du disque apparaîtront ici</div>}</article>}
      </div>
      {advanced && <article className="panel raid-disk-panel"><Heading n="03" title="Disque sélectionné" badge={disk ? `${disk.technology}${customizedDiskPerformance ? ' · Personnalisé' : ''}` : 'En attente'} />{disk ? <>
        <div className="disk-title"><strong>{diskType}</strong><span>{disk.technology} · {disk.interface} · {disk.workload}</span></div>
        <div className="disk-grid">
          {diskPerformanceFields.map(({ key, label, unit, format }) => (
            <label key={key}>
              <span>{label} — valeur de calcul</span>
              <div className="input-unit">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={currentDiskPerformanceValues[key]}
                  aria-invalid={!Number.isFinite(Number(currentDiskPerformanceValues[key])) || Number(currentDiskPerformanceValues[key]) <= 0}
                  aria-describedby={`${key}-reference`}
                  onChange={event => updateDiskPerformance(key, event.target.value)}
                />
                <em>{unit}</em>
              </div>
              <small id={`${key}-reference`}>Référence indicative : {format(disk[key])}</small>
            </label>
          ))}
          <div><span>Débit rebuild nominal retenu</span><strong>{bandwidth(calculationDisk.rebuildMBps)}</strong></div>
        </div>
        <p className="profile-sum">
          {customizedDiskPerformance
            ? 'Au moins une valeur de performance est personnalisée et utilisée dans les calculs. Les références sont indicatives, non rattachées à une référence constructeur.'
            : 'Valeurs de référence indicatives du calculateur, non rattachées à une référence constructeur.'}
          {' '}Le débit rebuild nominal est ajusté automatiquement selon le plus faible des ratios de débit lecture/écriture personnalisés, en conservant le rapport nominal du profil de disque.
        </p>
        {!validDiskPerformance && !result.ready && <p className="error" role="alert">Chaque valeur de performance doit être un nombre fini supérieur à 0.</p>}
        </> : <div className="empty">Les caractéristiques du disque apparaîtront ici</div>}</article>}
    </section>

    {!advanced && result.valid && <>
      <section className="panel"><Heading n="03" title="Capacité et performance" badge={definition.label} />
        <div className="metrics">
          <Metric label="Capacité utile" value={capacity(result.usableTiB, usePiB)} detail={`${decimal(result.usableTB, usePiB)} sur ${number(result.usableDisks)} disques utiles`} accent="cyan" />
          <Metric label="Rendement installé" value={`${number(result.efficiencyInstalled, 1)} %`} detail={`${number(result.installedRawTB, 2)} TB installés, hot spares inclus`} accent="purple" />
          <Metric label="Débit lecture agrégé" value={bandwidth(result.readBandwidthMBps)} detail={`${number(result.active)} disques actifs`} accent="green" />
          <Metric label="Débit écriture agrégé" value={bandwidth(result.writeBandwidthMBps)} detail={`${number(result.usableDisks)} disques de données`} accent="cyan" />
          <Metric label="Capacité brute" value={capacity(result.installedRawTiB, usePiB)} detail={`${decimal(result.installedRawTB, usePiB)} installés, hot spares inclus`} accent="purple" />
          <Metric label="Résilience" value={<><Stars value={result.resilience} /><span>{number(result.resilience)} / 5</span></>} detail={result.faultTolerance} accent="green" className="metric--resilience" />
          <Metric label="IOPS lecture agrégés" value={formatIops(result.readIops)} detail={`${selectedProfile.label} · ${readPercent} % lecture · ${accessPattern === 'random' ? 'aléatoire' : 'séquentiel'} · ${blockSizeKiB} KiB`} accent="cyan" />
          <Metric label="IOPS écriture agrégés" value={formatIops(result.writeIops)} detail={`${selectedProfile.label} · ${readPercent} % lecture · ${accessPattern === 'random' ? 'aléatoire' : 'séquentiel'} · ${blockSizeKiB} KiB`} accent="purple" />
        </div>
        <p className="profile-recommendation"><strong>Recommandation — {selectedProfile.label} :</strong> {selectedProfile.recommendation}</p>
      </section>
      <RaidDiagram raid={raid} diskCount={diskCount} hotSpares={hotSpares} groupCount={groupCount} sectionNumber="04" />
    </>}

    {advanced && validComparison.length > 0 && selectedResult && <>
      <section className="panel"><Heading n="04" title="Comparaison RAID" badge={`${readPercent} % lecture · ${100 - readPercent} % écriture · ${blockSizeKiB} KiB`} />
        <p className="profile-sum">Sélectionnez une ligne (Entrée ou Espace au clavier) pour afficher ce niveau RAID dans l’organisation et l’analyse de reconstruction.</p>
        <div className="table-wrap">
          <table aria-label="Comparaison RAID">
            <thead><tr>{comparisonSortOptions.map(({ key, label }) => {
              const isSorted = comparisonSort?.key === key
              const direction = isSorted ? comparisonSort.direction : null
              const nextDirection = direction === 'ascending' ? 'décroissant' : 'croissant'

              return <th key={key} scope="col" aria-sort={direction || 'none'}>
                <button
                  type="button"
                  className="raid-sort-button"
                  aria-label={`Trier par ${label} par ordre ${nextDirection}`}
                  aria-pressed={isSorted}
                  onClick={() => setComparisonSort(current => ({
                    key,
                    direction: current?.key === key && current.direction === 'ascending' ? 'descending' : 'ascending'
                  }))}
                >
                  {label}<span aria-hidden="true">{direction === 'ascending' ? '↑' : direction === 'descending' ? '↓' : '↕'}</span>
                </button>
              </th>
            })}</tr></thead>
            <tbody>{sortedComparison.map(x => {
              const isSelected = x.raid === selectedComparisonRaid
              const selectRow = () => {
                setManualSelection({ parameterRevision, raid: x.raid })
                setRaid(x.raid)
              }

              return <tr
                key={x.raid}
                className={`raid-comparison__row${isSelected ? ' selected' : ''}`}
                tabIndex={0}
                aria-selected={isSelected}
                onClick={selectRow}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    selectRow()
                  }
                }}
              >
                <td><b>{x.definition.label}</b></td>
                <td>
                  {capacity(x.result.usableTiB, usePiB)}
                  {!isSelected && <ComparisonIndicator value={x.result.usableTB} selectedValue={selectedResult.usableTB} metric="Capacité utile" />}
                  <small>({decimal(x.result.usableTB, usePiB)})</small>
                </td>
                <td>{number(x.result.efficiencyInstalled, 1)} %</td>
                <td>
                  {bandwidth(x.result.readBandwidthMBps)}
                  {!isSelected && <ComparisonIndicator value={x.result.readBandwidthMBps} selectedValue={selectedResult.readBandwidthMBps} metric="Débit lecture" />}
                </td>
                <td>
                  {formatIops(x.result.readIops)}
                  {!isSelected && <ComparisonIndicator value={x.result.readIops} selectedValue={selectedResult.readIops} metric="IOPS lecture" />}
                </td>
                <td>
                  {bandwidth(x.result.writeBandwidthMBps)}
                  {!isSelected && <ComparisonIndicator value={x.result.writeBandwidthMBps} selectedValue={selectedResult.writeBandwidthMBps} metric="Débit écriture" />}
                </td>
                <td>
                  {formatIops(x.result.writeIops)}
                  {!isSelected && <ComparisonIndicator value={x.result.writeIops} selectedValue={selectedResult.writeIops} metric="IOPS écriture" />}
                </td>
                <td>
                  {x.result.rebuild.realistic === null ? 'Non disponible' : <>
                    {duration(x.result.rebuild.realistic)}
                    {!isSelected && <ComparisonIndicator value={x.result.rebuild.realistic} selectedValue={selectedResult.rebuild.realistic} lowerIsBetter metric="Durée de rebuild" />}
                  </>}
                </td>
                <td className={`raid-comparison__resilience raid-comparison__resilience--${x.result.resilience < selectedResult.resilience ? 'worse' : x.result.resilience > selectedResult.resilience ? 'better' : 'equal'}`}>
                  {x.result.resilience !== selectedResult.resilience && <span className="visually-hidden">Résilience {x.result.resilience < selectedResult.resilience ? 'inférieure' : 'supérieure'} à la ligne sélectionnée. </span>}
                  <Stars value={x.result.resilience} />
                </td>
              </tr>
            })}</tbody>
          </table>
        </div>
        <p className="profile-sum">Les IOPS de chaque ligne utilisent le profil sélectionné, le bloc de {blockSizeKiB} KiB et les coûts physiques propres à chaque niveau RAID.</p>
      </section>

      <RaidDiagram raid={selectedComparisonRaid} diskCount={diskCount} hotSpares={hotSpares} groupCount={groupCount} sectionNumber="05" />

      <section className="panel"><Heading n="06" title="Analyse de reconstruction" badge={`${selectedComparison.definition.label} · ${selectedResult.affectedGroupSize} disques dans le domaine concerné`} />
        <div className="rebuild-load"><label><span>Charge pendant le rebuild</span><div className="input-unit"><input type="number" min="0" max="85" step="1" value={rebuildLoad} onChange={e => updateParameter(setRebuildLoad, Number(e.target.value))} /><em>%</em></div></label></div>
        <div className="rebuild-grid">
        <RebuildCard title="Optimiste" value={selectedResult.rebuild.optimistic} detail={selectedResult.rebuildSupported ? 'Débit nominal, aucune charge applicative' : 'Impossible : RAID 0 ne protège pas les données'} accent="green" />
        <RebuildCard title="Réaliste" value={selectedResult.rebuild.realistic} detail={selectedResult.rebuildSupported ? `Charge ${rebuildLoad} % · facteur domaine ×${number(selectedResult.rebuild.groupWorkloadFactor, 2)}` : 'Impossible : RAID 0 ne protège pas les données'} accent="orange" />
        <RebuildCard title="Dégradé" value={selectedResult.rebuild.degraded} detail={selectedResult.rebuildSupported ? 'Temps réaliste divisé par 0,65 (environ +53,8 %)' : 'Impossible : RAID 0 ne protège pas les données'} accent="red" />
      </div><div className={`spare-note ${selectedResult.spares ? 'ok' : 'warning'}`}><strong>{selectedResult.hotSpareStatus}</strong><span>{selectedResult.spares ? 'La reconstruction peut démarrer automatiquement si le contrôleur est configuré pour utiliser le spare' : 'Prévoir un remplacement manuel rapide pour limiter la fenêtre sans redondance complète'}</span></div></section>

      <footer className="raid-assumptions">
        <strong>Hypothèses IOPS et rebuild</strong>
        <div className="raid-assumptions__grid">
          <section>
            <h3>Estimation des IOPS</h3>
            <p>
              Les IOPS logiques sont limitées par les budgets physiques cumulés des disques actifs.
              Une lecture logique coûte une lecture physique. Pour une écriture aléatoire, le modèle
              compte 1 écriture en RAID 0, 2 écritures en RAID 1/10, 2 lectures + 2 écritures en
              RAID 5/50 et 3 lectures + 3 écritures en RAID 6/60. Les écritures séquentielles RAID
              5/6/50/60 supposent des bandes complètes alignées, sans lecture préalable ; leur coût
              est le nombre de disques du groupe divisé par le nombre de disques de données. Les
              lectures des miroirs sont supposées réparties entre leurs membres. Les IOPS par disque
              sont plafonnées par le débit nominal divisé par la taille de bloc ; le profil et le
              ratio lecture/écriture déterminent la charge logique estimée.
            </p>
            <p>
              Ce modèle simplifié n’est ni une mesure ni une garantie constructeur. Il ignore le
              cache, le contrôleur, les files d’attente, la granularité réelle des E/S et les limites
              de bus. Ajustez les recommandations à partir des traces de charge de l’application.
            </p>
          </section>
          <section>
            <h3>Estimation du rebuild</h3>
            <p>
              Le temps nominal correspond à la capacité du disque divisée par le débit de rebuild
              retenu. Le scénario réaliste applique la charge saisie et un facteur de contention :
              8 % par membre au-delà de deux en RAID 5/50, 12 % en RAID 6/60, et aucun facteur
              supplémentaire en RAID 1/10. Pour RAID 50/60, le domaine considéré est un groupe.
              Le scénario dégradé divise le temps réaliste par 0,65 (environ 1,54 fois plus long,
              soit +53,8 %). RAID 0 ne permet pas de reconstruire un disque.
            </p>
            <p>
              Ces scénarios ne sont pas des garanties : contrôleur, firmware, priorités, erreurs de
              lecture et charge réelle peuvent modifier sensiblement les durées.
            </p>
          </section>
        </div>
      </footer>

    </>}

    <AboutSection
      eyebrow="À PROPOS DU CALCULATEUR"
      title={advanced ? 'Évaluer les performances d’un groupe RAID' : 'Dimensionner un groupe RAID en quelques secondes'}
      description={advanced
        ? 'Comparez capacité, performances, IOPS estimées et reconstruction avec un profil IO ajustable.'
        : 'Une lecture synthétique de la capacité, des performances et de la résilience.'}
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
        ...(advanced ? [{
          icon: 'rebuild',
          label: 'Reconstruction',
          value: '3 scénarios',
          description: 'Optimiste, réaliste et dégradé'
        }] : [])
      ]}
      highlights={advanced
        ? ['Calcul en TiB et PiB', 'Disques de secours', 'Comparaison RAID', '100 % navigateur']
        : ['Calcul en TiB et PiB', 'Disques de secours', 'Capacité et performances', 'Organisation RAID']}
    />
  </div>
}
