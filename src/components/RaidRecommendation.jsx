import { useMemo, useState } from 'react'
import { RECOMMENDATION_DRIVE_TYPES, RECOMMENDATION_PLATFORMS, RECOMMENDATION_WORKLOADS, OPTIMIZATION_PROFILES } from '../data/raidRecommendation'
import { useLanguage } from '../LanguageContext'
import { formatIops } from '../utils/formatIops'
import { ioProfiles, tbToTiB, tiBToTB } from '../utils/raidCalculations'
import { recommendRaid } from '../utils/raidRecommendation'

const number = (value, digits = 1, language = 'fr') =>
  new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'fr-FR', { maximumFractionDigits: digits }).format(value)

function formatCapacity(valueTB, unit, language) {
  const value = unit === 'TiB' ? tbToTiB(valueTB) : valueTB
  const displayedUnit = unit === 'To' ? (language === 'en' ? 'TB' : 'To') : unit
  return `${number(value, 2, language)} ${displayedUnit}`
}

function formatBandwidth(value, language) {
  if (value >= 1000) return `${number(value / 1000, 2, language)} ${language === 'en' ? 'GB/s' : 'Go/s'}`
  return `${number(value, 0, language)} ${language === 'en' ? 'MB/s' : 'Mo/s'}`
}

function formatDuration(hours, language) {
  if (hours >= 48) return `${number(hours / 24, 1, language)} ${language === 'en' ? 'days' : 'jours'}`
  return `${number(hours, 1, language)} ${language === 'en' ? 'h' : 'h'}`
}

function Heading({ title, badge }) {
  return <div className="heading">
    <div><span>01</span><h2>{title}</h2></div>
    {badge && <div className="heading__actions"><b>{badge}</b></div>}
  </div>
}

function RecommendationCard({ candidate, rank, unit, language, t }) {
  const recommended = rank === 0
  const { result } = candidate
  const breakdownKeys = [
    ['capacity', 'Capacité utile / efficacité'],
    ['exposure', 'Exposition + tolérance aux pannes'],
    ['rebuild', 'Temps de reconstruction'],
    ['performance', 'Performance']
  ]
  const benefits = candidate.raid === 'RAID10'
    ? ['Bonnes performances aléatoires', 'Pas de pénalité de parité']
    : candidate.raid === 'RAID50' || candidate.raid === 'RAID60'
      ? ['Domaines de reconstruction séparés', 'Découpage en groupes explicite']
      : candidate.raid === 'RAID6'
        ? ['Tolérance à deux pannes dans le groupe']
        : ['Efficacité capacitive élevée']
  const tradeoffs = candidate.raid === 'RAID10'
    ? ['Efficacité capacitive de 50 %']
    : candidate.raid === 'RAID5' || candidate.raid === 'RAID50'
      ? ['Tolérance à une panne par groupe']
      : candidate.raid === 'RAID6' || candidate.raid === 'RAID60'
        ? ['Capacité réduite par la double parité']
        : []

  return <article className={`recommendation-card${recommended ? ' recommendation-card--primary' : ''}`}>
    <header className="recommendation-card__header">
      <div>
        <span className="recommendation-card__rank">{recommended ? '🏆' : '🏅'} {t(recommended ? 'Recommandation principale' : 'Alternative')}</span>
        <h3>{candidate.raid}</h3>
        <p>{candidate.layout} · {number(candidate.diskCount, 0, language)} {t('disques')} × {formatCapacity(candidate.diskSizeTB, 'To', language)}</p>
      </div>
      <strong className="recommendation-score">{number(candidate.score, 1, language)}<small>/100</small></strong>
    </header>
    <dl className="recommendation-metrics">
      <div><dt>{t('Capacité utile')}</dt><dd>{formatCapacity(result.usableTB, unit, language)}</dd></div>
      <div><dt>{t('Capacité brute')}</dt><dd>{formatCapacity(candidate.rawCapacityTB, unit, language)}</dd></div>
      <div><dt>{t('Efficacité')}</dt><dd>{number(result.efficiencyActive, 1, language)} %</dd></div>
      <div><dt>{t('IOPS estimées lecture / écriture')}</dt><dd>{formatIops(result.readIops, language)} / {formatIops(result.writeIops, language)}</dd></div>
      <div><dt>{t('Débit estimé lecture / écriture')}</dt><dd>{formatBandwidth(result.readBandwidthMBps, language)} / {formatBandwidth(result.writeBandwidthMBps, language)}</dd></div>
      <div><dt>{t('Pannes tolérées')}</dt><dd>{number(candidate.failureTolerance, 0, language)} · {t(candidate.failureDomain)}</dd></div>
      <div><dt>{t('Reconstruction nominale')}</dt><dd>{formatDuration(result.rebuild.optimistic, language)}</dd></div>
      <div><dt>{t('Reconstruction réaliste')}</dt><dd>{formatDuration(result.rebuild.realistic, language)}</dd></div>
      <div><dt>{t('Hypothèses rebuild')}</dt><dd>{t('Charge')} ×{number(result.rebuild.applicationLoadCoefficient, 2, language)} · {t('Largeur RAID')} ×{number(result.rebuild.groupWidthCoefficient, 2, language)}</dd></div>
      <div><dt>{t('Indice d’exposition ajusté')}</dt><dd>{number(candidate.exposureIndex, 1, language)} {t('h·disques')}</dd></div>
      <div><dt>{t('Facteurs de risque')}</dt><dd>{t('Résilience')} ×{number(candidate.raidResilienceFactor, 2, language)} · {t('Taille')} ×{number(candidate.driveSizeRiskFactor, 2, language)}{candidate.singleParitySurcharge > 1 ? ` · ${t('Parité simple')} ×${number(candidate.singleParitySurcharge, 2, language)}` : ''}</dd></div>
    </dl>
    <div className="recommendation-card__notes">
      <div><strong>{t('Avantages')}</strong><ul>{benefits.map(item => <li key={item}>{t(item)}</li>)}</ul></div>
      <div><strong>{t('Compromis')}</strong><ul>{tradeoffs.map(item => <li key={item}>{t(item)}</li>)}</ul></div>
    </div>
    <details className="recommendation-score-detail">
      <summary>{t('Détail du score /100')}</summary>
      <dl>{breakdownKeys.map(([key, label]) => (
        <div key={key}>
          <dt>{t(label)}</dt>
          <dd>{number(candidate.scoreBreakdown[key], 0, language)} /100</dd>
        </div>
      ))}</dl>
    </details>
  </article>
}

export default function RaidRecommendation() {
  const { language, t } = useLanguage()
  const [targetCapacity, setTargetCapacity] = useState('100')
  const [capacityUnit, setCapacityUnit] = useState('To')
  const [driveType, setDriveType] = useState('HDD SATA')
  const [maxDriveCapacityTB, setMaxDriveCapacityTB] = useState(30)
  const [platformId, setPlatformId] = useState('generic-24lff')
  const [maxDiskCount, setMaxDiskCount] = useState(24)
  const [workload, setWorkload] = useState('virtualization')
  const [targetIops, setTargetIops] = useState('')
  const [targetBandwidthMBps, setTargetBandwidthMBps] = useState('')
  const [optimization, setOptimization] = useState('balanced')

  const platform = RECOMMENDATION_PLATFORMS.find(item => item.id === platformId)
  const platformCapacities = RECOMMENDATION_DRIVE_TYPES[driveType].capacitiesTB
  const recommendation = useMemo(() => recommendRaid({
    targetCapacity,
    capacityUnit,
    driveType,
    maxDriveCapacityTB,
    maxDiskCount,
    platformMaxDriveCount: platform.driveBays,
    workload,
    targetIops,
    targetBandwidthMBps,
    optimization
  }), [targetCapacity, capacityUnit, driveType, maxDriveCapacityTB, maxDiskCount, platform.driveBays, workload, targetIops, targetBandwidthMBps, optimization])
  const selectedIoProfile = ioProfiles[RECOMMENDATION_WORKLOADS[workload].ioProfile]
  function changeCapacityUnit(nextUnit) {
    const value = Number(targetCapacity)
    if (Number.isFinite(value) && value > 0 && nextUnit !== capacityUnit) {
      setTargetCapacity(String(nextUnit === 'TiB' ? tbToTiB(value) : tiBToTB(value)))
    }
    setCapacityUnit(nextUnit)
  }

  function changeDriveType(nextType) {
    setDriveType(nextType)
    setMaxDriveCapacityTB(RECOMMENDATION_DRIVE_TYPES[nextType].capacitiesTB.at(-1))
  }

  function changePlatform(nextId) {
    const nextPlatform = RECOMMENDATION_PLATFORMS.find(item => item.id === nextId)
    setPlatformId(nextId)
    setMaxDiskCount(nextPlatform.driveBays)
  }

  const weights = recommendation.weights
  const weightSummary = weights && [
    ['capacity', 'Capacité'],
    ['exposure', 'Exposition / résilience'],
    ['rebuild', 'Rebuild'],
    ['performance', 'Performance']
  ].map(([key, label]) => `${t(label)} ${number(weights[key] * 100, 0, language)} %`).join(' · ')

  return <section className="raid-recommendation" aria-labelledby="raid-recommendation-title">
    <article className="panel">
      <div className="section-intro">
        <span>{t('RECOMMANDATION D’ARCHITECTURE')}</span>
        <h2 id="raid-recommendation-title">{t('Quelle architecture RAID correspond à vos besoins ?')}</h2>
        <p>{t('Décrivez la capacité cible, les limites de votre infrastructure et le workload. Les configurations sont estimées puis classées selon leur adéquation.')}</p>
      </div>
      <div className="recommendation-input-grid">
        <fieldset className="recommendation-fieldset">
          <legend>{t('Capacité cible')}</legend>
          <div className="recommendation-capacity-input">
            <label>
              <span>{t('Capacité utile cible')}</span>
              <input type="number" min="0.01" step="any" value={targetCapacity} onChange={event => setTargetCapacity(event.target.value)} aria-label={t('Capacité utile cible')} />
            </label>
            <label>
              <span>{t('Unité')}</span>
              <select value={capacityUnit} onChange={event => changeCapacityUnit(event.target.value)}>
                <option value="To">{t('To')}</option>
                <option value="TiB">TiB</option>
              </select>
            </label>
          </div>
          <small>{t('La capacité utile cible est convertie en capacité décimale pour les calculs, sans mélanger To et TiB.')}</small>
        </fieldset>
        <fieldset className="recommendation-fieldset">
          <legend>{t('Infrastructure')}</legend>
          <div className="recommendation-form-grid">
            <label><span>{t('Type de disque')}</span><select value={driveType} onChange={event => changeDriveType(event.target.value)}>{Object.keys(RECOMMENDATION_DRIVE_TYPES).map(type => <option key={type} value={type}>{t(type)}</option>)}</select></label>
            <label>
              <span>{t('Capacité maximale par disque')}</span>
              <div className="input-unit">
                <input
                  type="number"
                  min="0.1"
                  max="1000"
                  step="any"
                  list="raid-drive-capacity-suggestions"
                  value={maxDriveCapacityTB}
                  aria-invalid={!Number.isFinite(Number(maxDriveCapacityTB)) || Number(maxDriveCapacityTB) < 0.1 || Number(maxDriveCapacityTB) > 1000}
                  aria-describedby="raid-drive-capacity-note"
                  onChange={event => setMaxDriveCapacityTB(event.target.value)}
                />
                <em>{t('To')}</em>
              </div>
              <datalist id="raid-drive-capacity-suggestions">
                {platformCapacities.map(size => <option key={size} value={size} />)}
              </datalist>
            </label>
            <label><span>{t('Plateforme / châssis')}</span><select value={platformId} onChange={event => changePlatform(event.target.value)}>{RECOMMENDATION_PLATFORMS.map(item => <option key={item.id} value={item.id}>{t(item.label)} — {item.driveBays} {t('baies')}</option>)}</select></label>
            <label><span>{t('Nombre maximal de disques')}</span><input type="number" min="1" max={platform.driveBays} step="1" value={maxDiskCount} onChange={event => setMaxDiskCount(event.target.value)} aria-describedby="recommendation-platform-note" /></label>
          </div>
          <small id="raid-drive-capacity-note">{t('Saisissez une capacité entre 0,1 et 1 000 To. Les capacités du marché proposées ne sont que des suggestions ; la valeur saisie est aussi évaluée par le moteur.')}</small>
          <small id="recommendation-platform-note">{t(platform.note)} {t('Le maximum saisi ne peut pas dépasser les baies de la plateforme sélectionnée.')}</small>
        </fieldset>
        <fieldset className="recommendation-fieldset">
          <legend>{t('Workload et optimisation')}</legend>
          <div className="recommendation-form-grid">
            <label><span>{t('Workload')}</span><select value={workload} onChange={event => setWorkload(event.target.value)}>{Object.entries(RECOMMENDATION_WORKLOADS).map(([key, item]) => <option key={key} value={key}>{t(item.label)}</option>)}</select></label>
            <label><span>{t('Profil d’optimisation')}</span><select value={optimization} onChange={event => setOptimization(event.target.value)}>{Object.entries(OPTIMIZATION_PROFILES).map(([key, item]) => <option key={key} value={key}>{t(item.label)}</option>)}</select></label>
          </div>
          <p className="profile-recommendation"><strong>{t('Profil IO appliqué')} — {t(selectedIoProfile.label)} :</strong> {selectedIoProfile.readPercent} % {t('lecture')}, {selectedIoProfile.accessPattern === 'random' ? t('Aléatoire') : t('Séquentiel')}, {selectedIoProfile.blockSizeKiB} KiB.</p>
        </fieldset>
        <fieldset className="recommendation-fieldset">
          <legend>{t('Objectifs de performance facultatifs')}</legend>
          <div className="recommendation-form-grid">
            <label><span>{t('IOPS minimales')}</span><input type="number" min="0.01" step="any" value={targetIops} placeholder={t('Aucune contrainte')} onChange={event => setTargetIops(event.target.value)} /></label>
            <label><span>{t('Débit minimal')}</span><div className="input-unit"><input type="number" min="0.01" step="any" value={targetBandwidthMBps} placeholder={t('Aucune contrainte')} onChange={event => setTargetBandwidthMBps(event.target.value)} /><em>{language === 'en' ? 'MB/s' : 'Mo/s'}</em></div></label>
          </div>
          <small>{t('Les objectifs renseignés sont des seuils obligatoires ; laissez les champs vides pour ne pas filtrer sur la performance. Le débit vérifié est pondéré par le ratio lecture/écriture du profil IO.')}</small>
        </fieldset>
      </div>
      <p className="recommendation-assumption"><strong>{t('Estimations, pas mesures')}.</strong> {t('Les performances reprennent les références indicatives du calculateur pour le type de média choisi. Le temps nominal est la capacité du disque divisée par son débit rebuild nominal ; le temps réaliste divise ce résultat par les coefficients de charge et de largeur RAID affichés pour chaque candidat. L’exposition ajustée est le temps réaliste en heures × largeur du groupe × facteur de résilience RAID × facteur de risque taille disque × surcharge simple parité éventuelle. Tous les facteurs sont sans unité ; l’exposition reste en heures-disques ajustées.')}</p>
    </article>

    {!recommendation.valid && <p className="error" role="alert">{t('Entrez une capacité cible positive et des limites d’infrastructure valides.')}</p>}
    {recommendation.valid && recommendation.failureReason && <div className="recommendation-empty" role="status">
      <strong>{t('Aucune configuration ne respecte les contraintes.')}</strong>
      <p>{t(recommendation.failureReason === 'capacity'
        ? 'La capacité cible dépasse les configurations possibles avec la capacité de disque et le nombre maximal de baies sélectionnés.'
        : 'La capacité est atteignable, mais aucune configuration ne satisfait aussi les objectifs de performance indiqués.')}</p>
      <p>{t('Aucune recommandation de substitution ne sera affichée. Augmentez une limite ou assouplissez un objectif pour relancer le classement.')}</p>
    </div>}

    {recommendation.recommendations.length > 0 && <>
      <section className="panel" aria-labelledby="recommendation-results-title">
        <Heading title={t('Comparatif « Versus »')} badge={t(OPTIMIZATION_PROFILES[optimization].label)} />
        <h2 className="recommendation-results-title" id="recommendation-results-title">{t('Les meilleures configurations pour')} {t(RECOMMENDATION_WORKLOADS[workload].label)}</h2>
        <p className="profile-sum">{t('Le score /100 combine capacité utile et efficacité capacitive, exposition ajustée selon la tolérance aux pannes, durée réaliste de reconstruction et performances estimées. Le score capacité combine à 55 % une réserve utile plafonnée à deux fois la cible et à 45 % le rendement capacitif normalisé. Les métriques sont normalisées sur les configurations qui satisfont toutes les contraintes ; le meilleur score est la recommandation principale. Le profil d’optimisation « Capacité maximale » utilise la politique capacité existante.')}</p>
        <p className="recommendation-weight-summary"><strong>{t('Pondérations appliquées')} :</strong> {weightSummary}</p>
        <p className="recommendation-fit-reason"><strong>{t('Pourquoi cette recommandation')} :</strong> {t({
          backup: 'Pour la sauvegarde et l’archivage, le classement favorise l’efficacité capacitive et limite l’exposition pendant la reconstruction.',
          virtualization: 'Pour la virtualisation, le classement équilibre efficacité, performances mixtes et taille du domaine de reconstruction.',
          database: 'Pour une base de données, le classement valorise davantage les IOPS estimées et les domaines de panne contenus.',
          surveillance: 'Pour la vidéosurveillance, le classement privilégie la capacité et le débit séquentiel tout en tenant compte de la double parité.'
        }[workload])}</p>
        <div className="recommendation-versus">
          {recommendation.recommendations.map((candidate, index) => (
            <RecommendationCard key={candidate.id} candidate={candidate} rank={index} unit={capacityUnit} language={language} t={t} />
          ))}
        </div>
        <p className="recommendation-assumption">{t('Les scores ne sont pas des garanties de performance : ils servent à comparer ces candidats entre eux, avec les hypothèses affichées. Validez toute architecture avec les exigences du constructeur et des mesures de charge réelles.')}</p>
      </section>
    </>}
  </section>
}
