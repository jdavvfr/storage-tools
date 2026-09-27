import { useState } from 'react'
import { useLanguage } from '../LanguageContext'
import { diskTypes } from '../data/disks'
import { buildRaidComparison, calculateNominalRebuildBandwidth, calculateRaid, DEFAULT_IO_PROFILE, ioProfiles, raidDefinitions, sortedIoProfiles, tbToPB, tiBToPiB } from '../utils/raidCalculations'
import { sortRaidComparison } from '../utils/raidComparison'
import { formatIops } from '../utils/formatIops'
import { RaidDiagram, RaidGroupCountControl } from './RaidEnhancements'

const number = (v, d = 0, language = 'fr') => new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'fr-FR', { maximumFractionDigits: d }).format(v || 0)
const bandwidth = (v, language) => v >= 1e3
  ? `${number(v / 1e3, 2, language)} ${language === 'en' ? 'GB/s' : 'Go/s'}`
  : `${number(v, 0, language)} ${language === 'en' ? 'MB/s' : 'Mo/s'}`
const capacity = (tib, pib, language) => pib ? `${number(tiBToPiB(tib), 3, language)} PiB` : `${number(tib, 2, language)} TiB`
const decimal = (tb, pib, language) => pib ? `${number(tbToPB(tb), 3, language)} PB` : `${number(tb, 2, language)} TB`
const duration = (h, language) => h >= 48
  ? `${number(h / 24, 1, language)} ${language === 'en' ? 'days' : 'jours'}`
  : `${number(h, 1, language)} h`
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
function Stars({ value }) { const { t } = useLanguage(); return <span className="stars" role="img" aria-label={`${t('Résilience')} : ${value} ${t('sur 5')}`}>{[1,2,3,4,5].map(x => <i key={x} className={x <= value ? 'on' : ''} />)}</span> }
function Metric({ label, value, detail, accent = '', className = '' }) { return <article className={`metric ${accent} ${className}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article> }
function RebuildCard({ title, value, detail, accent, language }) { const { t } = useLanguage(); return <article className={`rebuild-card ${accent}`}><span>{t(title)}</span><strong>{value === null ? t('Non disponible') : duration(value, language)}</strong><small>{t(detail)}</small><div className="rebuild-bar"><i style={{ width: `${value === null ? 0 : Math.min(100, value / 96 * 100)}%` }} /></div></article> }
function ComparisonIndicator({ value, selectedValue, lowerIsBetter = false, metric }) {
  if (!Number.isFinite(value) || !Number.isFinite(selectedValue) || value === selectedValue) return null

  const isHigher = value > selectedValue
  const isBetter = lowerIsBetter ? !isHigher : isHigher
  const direction = isHigher ? '↑' : '↓'
  const difference = isHigher ? 'supérieure' : 'inférieure'
  const { t } = useLanguage()

  return <span
    className={`comparison-indicator ${isBetter ? 'better' : 'worse'}`}
    role="img"
    aria-label={`${metric} : ${t('valeur')} ${t(difference)} ${t('à la ligne sélectionnée')}`}
    title={`${metric} : ${t('valeur')} ${t(difference)} ${t('à la ligne sélectionnée')}`}
  >{direction}</span>
}

export default function RaidCalculator({ active = true, advanced = false }) {
  const { language, t } = useLanguage()
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
        <article className="panel"><Heading n="01" title={t('Configuration RAID')} badge={definition ? t(definition.label) : t('À configurer')} /><div className="form-grid">
          <label><span>{t('Type de disque')}</span><select value={diskType} onChange={e => selectDiskType(e.target.value)}><option value="">{t('Sélectionner un type de disque')}</option>{Object.keys(diskTypes).map(x => <option key={x}>{x}</option>)}</select></label>
          <label><span>{t('Type de RAID')}</span><select value={raid} onChange={e => updateParameter(setRaid, e.target.value)}><option value="">{t('Sélectionner un niveau RAID')}</option>{Object.entries(raidDefinitions).map(([k,v]) => <option key={k} value={k}>{t(v.label)}</option>)}</select></label>
          <label><span>{t('Disques actifs')}</span><input type="number" min="1" step="1" placeholder={t('Nombre de disques')} value={diskCount} onChange={e => updateParameter(setDiskCount, e.target.value)} /></label>
          <label><span>{t('Capacité par disque')}</span><div className="input-unit"><input type="number" step="1" placeholder={t('Capacité')} value={diskSizeTB} onChange={e => updateParameter(setDiskSizeTB, e.target.value)} /><em>{t('TB')}</em></div></label>
          <label><span>{t('Hot spares')}</span><input type="number" min="0" step="1" value={hotSpares} onChange={e => updateParameter(setHotSpares, Number(e.target.value))} /></label>
          <label><span>{t('Profil d’usage')}</span><select value={ioProfile} onChange={e => selectIoProfile(e.target.value)}>{sortedIoProfiles.map(([key, profile]) => <option key={key} value={key}>{t(profile.label)}</option>)}</select></label>
          {grouped && <div className="wide"><RaidGroupCountControl id={`raid-group-count-configuration-${advanced ? 'advanced' : 'basic'}`} raid={raid} diskCount={diskCount} groupCount={groupCount} onChange={value => updateParameter(setGroupCount, value)} /></div>}
        </div>
        {definition && <div className="raid-info"><span>{t(definition.description)}</span><strong>{t('Coût d’écriture aléatoire ×')}{definition.writePenalty}</strong></div>}
        {!ready && <div className="invitation">{t('Sélectionnez le disque, le RAID, le nombre et la capacité des disques')}</div>}{result.ready && !result.valid && <div className="error">{t(result.message)}</div>}</article>
        {advanced && <article className="panel io-profile">
          <Heading n="02" title={t('Profil IO')} badge={t('Charge applicative')} />
          <div className="form-grid">
            <label><span>{t('Lecture')}</span><div className="input-unit"><input type="number" min="0" max="100" step="1" value={readPercent} onChange={e => updateReadPercent(e.target.value)} /><em>%</em></div></label>
            <label><span>{t('Écriture')}</span><div className="input-unit"><input type="number" min="0" max="100" step="1" value={100 - readPercent} onChange={e => updateReadPercent(100 - Number(e.target.value))} /><em>%</em></div></label>
            <label><span>{t('Type d’accès')}</span><select value={accessPattern} onChange={e => { updateParameter(setAccessPattern, e.target.value); setIoProfile('custom') }}><option value="random">{t('Aléatoire (petites E/S)')}</option><option value="sequential">{t('Séquentiel (flux contigus)')}</option></select></label>
            <label><span>{t('Taille de bloc')}</span><select value={blockSizeKiB} onChange={e => { updateParameter(setBlockSizeKiB, Number(e.target.value)); setIoProfile('custom') }}>{[4, 8, 16, 32, 64, 128, 256].map(size => <option key={size} value={size}>{size} KiB</option>)}</select></label>
          </div>
          <p className="profile-recommendation"><strong>{t('Recommandation —')} {t(selectedProfile.label)} :</strong> {t(selectedProfile.recommendation)}</p>
          <p className="profile-sum">{t('Lecture + écriture : 100 % de la charge logique.')}</p>
        </article>}
        {!advanced && <article className="panel"><Heading n="02" title={t('Disque sélectionné')} badge={disk?.technology || t('En attente')} />{disk ? <>
          <div className="disk-title"><strong>{diskType}</strong><span>{disk.technology} · {disk.interface} · {t(disk.workload)}</span></div>
          <div className="disk-grid">
            <div><span>{t('IOPS lecture de référence')}</span><strong>{formatIops(disk.readIops, language)}</strong></div>
            <div><span>{t('IOPS écriture de référence')}</span><strong>{formatIops(disk.writeIops, language)}</strong></div>
            <div><span>{t('Débit lecture')}</span><strong>{bandwidth(disk.readBandwidthMBps, language)}</strong></div>
            <div><span>{t('Débit écriture')}</span><strong>{bandwidth(disk.writeBandwidthMBps, language)}</strong></div>
            <div><span>{t('Débit rebuild retenu')}</span><strong>{bandwidth(disk.rebuildMBps, language)}</strong></div>
          </div>
          <p className="profile-sum">{t('Valeurs indicatives du calculateur, non rattachées à une référence constructeur.')}</p>
          </> : <div className="empty">{t('Les caractéristiques du disque apparaîtront ici')}</div>}</article>}
      </div>
      {advanced && <article className="panel raid-disk-panel"><Heading n="03" title={t('Disque sélectionné')} badge={disk ? `${disk.technology}${customizedDiskPerformance ? ` · ${t('Personnalisé')}` : ''}` : t('En attente')} />{disk ? <>
        <div className="disk-title"><strong>{diskType}</strong><span>{disk.technology} · {disk.interface} · {t(disk.workload)}</span></div>
        <div className="disk-grid">
          {diskPerformanceFields.map(({ key, label, unit, format }) => (
            <label key={key}>
              <span>{t(label)} — {t('valeur de calcul')}</span>
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
              <small id={`${key}-reference`}>{t('Référence indicative :')} {format(disk[key], language)}</small>
            </label>
          ))}
          <div><span>{t('Débit rebuild nominal retenu')}</span><strong>{bandwidth(calculationDisk.rebuildMBps, language)}</strong></div>
        </div>
        <p className="profile-sum">
          {customizedDiskPerformance
            ? t('Au moins une valeur de performance est personnalisée et utilisée dans les calculs. Les références sont indicatives, non rattachées à une référence constructeur.')
            : t('Valeurs de référence indicatives du calculateur, non rattachées à une référence constructeur.')}
          {' '}{t('Le débit rebuild nominal est ajusté automatiquement selon le plus faible des ratios de débit lecture/écriture personnalisés, en conservant le rapport nominal du profil de disque.')}
        </p>
        {!validDiskPerformance && !result.ready && <p className="error" role="alert">{t('Chaque valeur de performance doit être un nombre fini supérieur à 0.')}</p>}
        </> : <div className="empty">{t('Les caractéristiques du disque apparaîtront ici')}</div>}</article>}
    </section>

    {!advanced && result.valid && <>
      <section className="panel"><Heading n="03" title={t('Capacité et performance')} badge={t(definition.label)} />
        <div className="metrics">
          <Metric label={t('Capacité utile')} value={capacity(result.usableTiB, usePiB, language)} detail={`${decimal(result.usableTB, usePiB, language)} ${t('sur')} ${number(result.usableDisks, 0, language)} ${t('disques utiles')}`} accent="cyan" />
          <Metric label={t('Rendement installé')} value={`${number(result.efficiencyInstalled, 1, language)} %`} detail={`${number(result.installedRawTB, 2, language)} ${t('TB installés, hot spares inclus')}`} accent="purple" />
          <Metric label={t('Débit lecture agrégé')} value={bandwidth(result.readBandwidthMBps, language)} detail={`${number(result.active, 0, language)} ${t('disques actifs')}`} accent="green" />
          <Metric label={t('Débit écriture agrégé')} value={bandwidth(result.writeBandwidthMBps, language)} detail={`${number(result.usableDisks, 0, language)} ${t('disques de données')}`} accent="cyan" />
          <Metric label={t('Capacité brute')} value={capacity(result.installedRawTiB, usePiB, language)} detail={`${decimal(result.installedRawTB, usePiB, language)} ${t('installés, hot spares inclus')}`} accent="purple" />
          <Metric label={t('Résilience')} value={<><Stars value={result.resilience} /><span>{number(result.resilience, 0, language)} / 5</span></>} detail={t(result.faultTolerance)} accent="green" className="metric--resilience" />
          <Metric label={t('IOPS lecture agrégés')} value={formatIops(result.readIops, language)} detail={`${t(selectedProfile.label)} · ${readPercent} % ${t('lecture')} · ${t(accessPattern === 'random' ? 'aléatoire' : 'séquentiel')} · ${blockSizeKiB} KiB`} accent="cyan" />
          <Metric label={t('IOPS écriture agrégés')} value={formatIops(result.writeIops, language)} detail={`${t(selectedProfile.label)} · ${readPercent} % ${t('lecture')} · ${t(accessPattern === 'random' ? 'aléatoire' : 'séquentiel')} · ${blockSizeKiB} KiB`} accent="purple" />
        </div>
        <p className="profile-recommendation"><strong>{t('Recommandation —')} {t(selectedProfile.label)} :</strong> {t(selectedProfile.recommendation)}</p>
      </section>
      <RaidDiagram raid={raid} diskCount={diskCount} hotSpares={hotSpares} groupCount={groupCount} onGroupCountChange={value => updateParameter(setGroupCount, value)} sectionNumber="04" />
    </>}

    {advanced && validComparison.length > 0 && selectedResult && <>
      <section className="panel"><Heading n="04" title={t('Comparaison RAID')} badge={`${readPercent} % ${t('lecture')} · ${100 - readPercent} % ${t('écriture')} · ${blockSizeKiB} KiB`} />
        <p className="profile-sum">{t('Sélectionnez une ligne pour afficher ce niveau RAID dans l’organisation et l’analyse de reconstruction.')}</p>
        <div className="table-wrap">
          <table aria-label={t('Comparaison RAID')}>
            <thead><tr>{comparisonSortOptions.map(({ key, label }) => {
              const isSorted = comparisonSort?.key === key
              const direction = isSorted ? comparisonSort.direction : null
              const nextDirection = direction === 'ascending' ? 'décroissant' : 'croissant'

              return <th key={key} scope="col" aria-sort={direction || 'none'}>
                <button
                  type="button"
                  className="raid-sort-button"
                  aria-label={`${t('Trier par')} ${t(label)} ${t('par ordre')} ${t(nextDirection)}`}
                  aria-pressed={isSorted}
                  onClick={() => setComparisonSort(current => ({
                    key,
                    direction: current?.key === key && current.direction === 'ascending' ? 'descending' : 'ascending'
                  }))}
                >
                  {t(label)}<span aria-hidden="true">{direction === 'ascending' ? '↑' : direction === 'descending' ? '↓' : '↕'}</span>
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
                <td><b>{t(x.definition.label)}</b></td>
                <td>
                  {capacity(x.result.usableTiB, usePiB, language)}
                  {!isSelected && <ComparisonIndicator value={x.result.usableTB} selectedValue={selectedResult.usableTB} metric={t('Capacité utile')} />}
                  <small>({decimal(x.result.usableTB, usePiB, language)})</small>
                </td>
                <td>{number(x.result.efficiencyInstalled, 1, language)} %</td>
                <td>
                  {bandwidth(x.result.readBandwidthMBps, language)}
                  {!isSelected && <ComparisonIndicator value={x.result.readBandwidthMBps} selectedValue={selectedResult.readBandwidthMBps} metric={t('Débit lecture')} />}
                </td>
                <td>
                  {formatIops(x.result.readIops, language)}
                  {!isSelected && <ComparisonIndicator value={x.result.readIops} selectedValue={selectedResult.readIops} metric={t('IOPS lecture')} />}
                </td>
                <td>
                  {bandwidth(x.result.writeBandwidthMBps, language)}
                  {!isSelected && <ComparisonIndicator value={x.result.writeBandwidthMBps} selectedValue={selectedResult.writeBandwidthMBps} metric={t('Débit écriture')} />}
                </td>
                <td>
                  {formatIops(x.result.writeIops, language)}
                  {!isSelected && <ComparisonIndicator value={x.result.writeIops} selectedValue={selectedResult.writeIops} metric={t('IOPS écriture')} />}
                </td>
                <td>
                  {x.result.rebuild.realistic === null ? t('Non disponible') : <>
                    {duration(x.result.rebuild.realistic, language)}
                    {!isSelected && <ComparisonIndicator value={x.result.rebuild.realistic} selectedValue={selectedResult.rebuild.realistic} lowerIsBetter metric={t('Durée de rebuild')} />}
                  </>}
                </td>
                <td className={`raid-comparison__resilience raid-comparison__resilience--${x.result.resilience < selectedResult.resilience ? 'worse' : x.result.resilience > selectedResult.resilience ? 'better' : 'equal'}`}>
                  {x.result.resilience !== selectedResult.resilience && <span className="visually-hidden">{t('Résilience')} {t(x.result.resilience < selectedResult.resilience ? 'inférieure' : 'supérieure')} {t('à la ligne sélectionnée')}.</span>}
                  <Stars value={x.result.resilience} />
                </td>
              </tr>
            })}</tbody>
          </table>
        </div>
        <p className="profile-sum">{t('Les IOPS de chaque ligne utilisent le profil sélectionné, le bloc de')} {blockSizeKiB} KiB {t('et les coûts physiques propres à chaque niveau RAID.')}</p>
      </section>

      <RaidDiagram raid={selectedComparisonRaid} diskCount={diskCount} hotSpares={hotSpares} groupCount={groupCount} onGroupCountChange={value => updateParameter(setGroupCount, value)} sectionNumber="05" />

      <section className="panel"><Heading n="06" title={t('Analyse de reconstruction')} badge={`${t(selectedComparison.definition.label)} · ${selectedResult.affectedGroupSize} ${t('disques dans le domaine concerné')}`} />
        <div className="rebuild-load"><label><span>{t('Charge pendant le rebuild')}</span><div className="input-unit"><input type="number" min="0" max="85" step="1" value={rebuildLoad} onChange={e => updateParameter(setRebuildLoad, Number(e.target.value))} /><em>%</em></div></label></div>
        <div className="rebuild-grid">
        <RebuildCard title="Optimiste" value={selectedResult.rebuild.optimistic} detail={selectedResult.rebuildSupported ? 'Débit nominal, aucune charge applicative' : 'Impossible : RAID 0 ne protège pas les données'} accent="green" language={language} />
        <RebuildCard title="Réaliste" value={selectedResult.rebuild.realistic} detail={selectedResult.rebuildSupported ? `Charge ${rebuildLoad} % : ×${number(selectedResult.rebuild.applicationLoadFactor, 2, language)} · Domaine de ${selectedResult.affectedGroupSize} disques : ×${number(selectedResult.rebuild.domainContentionFactor, 2, language)} · Facteur cumulé : ×${number(selectedResult.rebuild.combinedFactor, 2, language)}` : 'Impossible : RAID 0 ne protège pas les données'} accent="orange" language={language} />
        <RebuildCard title="Dégradé" value={selectedResult.rebuild.degraded} detail={selectedResult.rebuildSupported ? 'Temps réaliste divisé par 0,65 (environ +53,8 %)' : 'Impossible : RAID 0 ne protège pas les données'} accent="red" language={language} />
      </div><div className={`spare-note ${selectedResult.spares ? 'ok' : 'warning'}`}><strong>{t(selectedResult.hotSpareStatus)}</strong><span>{t(selectedResult.spares ? 'La reconstruction peut démarrer automatiquement si le contrôleur est configuré pour utiliser le spare' : 'Prévoir un remplacement manuel rapide pour limiter la fenêtre sans redondance complète')}</span></div></section>

    </>}

  </div>
}
