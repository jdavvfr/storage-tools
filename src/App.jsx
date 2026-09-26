import { useState } from 'react'
import CapacityConverter from './components/CapacityConverter'
import CopyDurationEstimator from './components/CopyDurationEstimator'
import RaidCalculator from './components/RaidCalculator'
import TapeLtoTools from './components/TapeLtoTools'
import './App.css'

function App() {
  const [activeTool, setActiveTool] = useState('raid')

  return <main className="shell">
    <nav className="tool-navigation" aria-label="Outils de stockage">
      <button type="button" className={activeTool === 'raid' ? 'active' : ''} aria-current={activeTool === 'raid' ? 'page' : undefined} onClick={() => setActiveTool('raid')}>RAID Calculator</button>
      <button type="button" className={activeTool === 'converter' ? 'active' : ''} aria-current={activeTool === 'converter' ? 'page' : undefined} onClick={() => setActiveTool('converter')}>Convertisseur To / TiB</button>
      <button type="button" className={activeTool === 'copy' ? 'active' : ''} aria-current={activeTool === 'copy' ? 'page' : undefined} onClick={() => setActiveTool('copy')}>Durée de copie</button>
      <button type="button" className={activeTool === 'tape-lto' ? 'active' : ''} aria-current={activeTool === 'tape-lto' ? 'page' : undefined} onClick={() => setActiveTool('tape-lto')}>Tape LTO</button>
    </nav>
    <header className="hero"><span>STORAGE TOOLS</span><h1>{activeTool === 'raid' ? 'RAID Calculator' : activeTool === 'converter' ? 'Convertisseur To / TiB' : activeTool === 'copy' ? 'Durée de copie' : 'Outils Tape LTO'}</h1><p>{activeTool === 'raid' ? 'Dimensionnement d’un RAID matériel pour serveur capacitif' : activeTool === 'converter' ? 'Conversion rapide entre capacités décimales et binaires' : activeTool === 'copy' ? 'Estimation du temps nécessaire pour transférer un volume de données' : 'Dimensionnement et estimation d’écriture sur cartouches LTO'}</p></header>
    {activeTool === 'copy' && <CopyDurationEstimator />}
    {activeTool === 'tape-lto' && <TapeLtoTools />}
    {activeTool === 'converter' && <CapacityConverter />}
    <RaidCalculator active={activeTool === 'raid'} />
  </main>
}

export default App
