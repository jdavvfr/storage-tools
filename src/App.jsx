import { useEffect, useState } from 'react'
import CapacityConverter from './components/CapacityConverter'
import CopyDurationEstimator from './components/CopyDurationEstimator'
import RaidCalculator from './components/RaidCalculator'
import TapeLtoTools from './components/TapeLtoTools'
import VolumeGrowthCalculator from './components/VolumeGrowthCalculator'
import AboutSection from './components/AboutSection'
import ToolInfoPopover from './components/ToolInfoPopover'
import englishFlag from './flag/gb.svg'
import frenchFlag from './flag/fr.svg'
import { useLanguage } from './LanguageContext'
import { TOOL_INFO } from './toolInfo'
import './App.css'

function App() {
  const [activeTool, setActiveTool] = useState('raid')
  const { language, setLanguage, t } = useLanguage()

  useEffect(() => {
    document.title = language === 'en'
      ? 'Storage Tools - RAID Calculator and TB/TiB Converter'
      : 'Storage Tools - RAID Calculator et TB / TiB Converter'
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content',
      language === 'en'
        ? 'Free storage tools: RAID calculator with capacity, performance and rebuild estimates, plus a two-way TB/TiB converter.'
        : 'Outils de stockage gratuits : calculateur RAID avec comparaison des capacités et reconstruction, et convertisseur bidirectionnel To/TiB.'
    )
  }, [language])

  return <>
    <main className="shell">
      <div className="language-bar">
        <span className="visually-hidden" id="language-label">{language === 'fr' ? 'Langue : français' : 'Language: English'}</span>
        <img className={`language-flag${language === 'fr' ? ' language-flag--active' : ''}`} src={frenchFlag} alt="" aria-hidden="true" />
        <button
          type="button"
          className="language-switch"
          role="switch"
          aria-checked={language === 'en'}
          aria-labelledby="language-label"

          onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
        >
          <span className={`language-switch__thumb${language === 'en' ? ' language-switch__thumb--right' : ''}`} />
        </button>
        <img className={`language-flag${language === 'en' ? ' language-flag--active' : ''}`} src={englishFlag} alt="" aria-hidden="true" />
      </div>
      <nav className="tool-navigation" aria-label={t('Outils de stockage')}>
        <button type="button" className={activeTool === 'raid' ? 'active' : ''} aria-current={activeTool === 'raid' ? 'page' : undefined} onClick={() => setActiveTool('raid')}>{t('RAID Calculator Basic')}</button>
        <button type="button" className={activeTool === 'raid-advanced' ? 'active' : ''} aria-current={activeTool === 'raid-advanced' ? 'page' : undefined} onClick={() => setActiveTool('raid-advanced')}>{t('RAID Calculator Advanced')}</button>
        <button type="button" className={activeTool === 'converter' ? 'active' : ''} aria-current={activeTool === 'converter' ? 'page' : undefined} onClick={() => setActiveTool('converter')}>{t('Convertisseur To / TiB')}</button>
        <button type="button" className={activeTool === 'copy' ? 'active' : ''} aria-current={activeTool === 'copy' ? 'page' : undefined} onClick={() => setActiveTool('copy')}>{t('Durée de copie')}</button>
        <button type="button" className={activeTool === 'growth' ? 'active' : ''} aria-current={activeTool === 'growth' ? 'page' : undefined} onClick={() => setActiveTool('growth')}>{t('Croissance volumétrique')}</button>
        <button type="button" className={activeTool === 'tape-lto' ? 'active' : ''} aria-current={activeTool === 'tape-lto' ? 'page' : undefined} onClick={() => setActiveTool('tape-lto')}>{t('Tape LTO')}</button>
      </nav>
      <header className="hero">
        <span>{t('STORAGE TOOLS')}</span>
        <h1>{t(activeTool === 'raid' ? (language === 'fr' ? 'RAID Calculator Basic' : 'RAID Calculator') : activeTool === 'raid-advanced' ? 'RAID Calculator Advanced' : activeTool === 'converter' ? 'Convertisseur To / TiB' : activeTool === 'copy' ? 'Durée de copie' : activeTool === 'growth' ? 'Croissance volumétrique' : 'Outils Tape LTO')}</h1>
        <p>{t(activeTool === 'raid' ? 'Dimensionnement RAID avec capacité, performances et organisation' : activeTool === 'raid-advanced' ? 'Dimensionnement RAID, estimation des IOPS et analyse de reconstruction selon le profil IO' : activeTool === 'converter' ? 'Conversion rapide entre capacités décimales et binaires' : activeTool === 'copy' ? 'Estimation du temps nécessaire pour transférer un volume de données' : activeTool === 'growth' ? 'Projection d’une volumétrie avec un taux de croissance annuel composé' : 'Dimensionnement et estimation d’écriture sur cartouches LTO')}
        <ToolInfoPopover key={activeTool} {...TOOL_INFO[activeTool]} />
      </header>
      {activeTool === 'copy' && <CopyDurationEstimator />}
      {activeTool === 'tape-lto' && <TapeLtoTools />}
      {activeTool === 'converter' && <CapacityConverter />}
      {activeTool === 'growth' && <VolumeGrowthCalculator />}
      <RaidCalculator active={activeTool === 'raid'} />
      <RaidCalculator active={activeTool === 'raid-advanced'} advanced />
    </main>
    <div className="shell shell--footer">
      <AboutSection />
    </div>
  </>
}

export default App
