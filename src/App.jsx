import { useState } from 'react'
import CapacityConverter from './components/CapacityConverter'
import CopyDurationEstimator from './components/CopyDurationEstimator'
import RaidCalculator from './components/RaidCalculator'
import TapeLtoTools from './components/TapeLtoTools'
import VolumeGrowthCalculator from './components/VolumeGrowthCalculator'
import './App.css'

function App() {
  const [activeTool, setActiveTool] = useState('raid')

  return <main className="shell">
    <nav className="tool-navigation" aria-label="Outils de stockage">
      <button type="button" className={activeTool === 'raid' ? 'active' : ''} aria-current={activeTool === 'raid' ? 'page' : undefined} onClick={() => setActiveTool('raid')}>RAID Calculator Basic</button>
      <button type="button" className={activeTool === 'raid-advanced' ? 'active' : ''} aria-current={activeTool === 'raid-advanced' ? 'page' : undefined} onClick={() => setActiveTool('raid-advanced')}>RAID Calculator Advanced</button>
      <button type="button" className={activeTool === 'converter' ? 'active' : ''} aria-current={activeTool === 'converter' ? 'page' : undefined} onClick={() => setActiveTool('converter')}>Convertisseur To / TiB</button>
      <button type="button" className={activeTool === 'copy' ? 'active' : ''} aria-current={activeTool === 'copy' ? 'page' : undefined} onClick={() => setActiveTool('copy')}>Durée de copie</button>
      <button type="button" className={activeTool === 'growth' ? 'active' : ''} aria-current={activeTool === 'growth' ? 'page' : undefined} onClick={() => setActiveTool('growth')}>Croissance volumétrique</button>
      <button type="button" className={activeTool === 'tape-lto' ? 'active' : ''} aria-current={activeTool === 'tape-lto' ? 'page' : undefined} onClick={() => setActiveTool('tape-lto')}>Tape LTO</button>
    </nav>
    <header className="hero"><span>STORAGE TOOLS</span><h1>{activeTool === 'raid' ? 'RAID Calculator' : activeTool === 'raid-advanced' ? 'RAID Calculator Advanced' : activeTool === 'converter' ? 'Convertisseur To / TiB' : activeTool === 'copy' ? 'Durée de copie' : activeTool === 'growth' ? 'Croissance volumétrique' : 'Outils Tape LTO'}</h1><p>{activeTool === 'raid' ? 'Dimensionnement RAID avec capacité, performances et organisation' : activeTool === 'raid-advanced' ? 'Dimensionnement RAID, estimation des IOPS et analyse de reconstruction selon le profil IO' : activeTool === 'converter' ? 'Conversion rapide entre capacités décimales et binaires' : activeTool === 'copy' ? 'Estimation du temps nécessaire pour transférer un volume de données' : activeTool === 'growth' ? 'Projection d’une volumétrie avec un taux de croissance annuel composé' : 'Dimensionnement et estimation d’écriture sur cartouches LTO'}</p></header>
    {activeTool === 'copy' && <CopyDurationEstimator />}
    {activeTool === 'tape-lto' && <TapeLtoTools />}
    {activeTool === 'converter' && <CapacityConverter />}
    {activeTool === 'growth' && <VolumeGrowthCalculator />}
    <RaidCalculator active={activeTool === 'raid'} />
    <RaidCalculator active={activeTool === 'raid-advanced'} advanced />
  </main>
}

export default App
