import { useState } from 'react';
import type { GardenTool } from './model';

export default function ToolsEditor({ initial, onSave, onDirty }: { initial: GardenTool[]; onSave: (tools: GardenTool[]) => Promise<boolean>; onDirty: (dirty: boolean) => void }) {
  const [tools, setTools] = useState(initial), [name, setName] = useState(''), [error, setError] = useState('');
  const add = () => {
    const text = name.trim();
    if (!text) return;
    if (tools.some(t => t.name.toLocaleLowerCase('de') === text.toLocaleLowerCase('de'))) { setError('Dieses Gerät ist bereits in deiner Liste.'); return; }
    setTools(p => [...p, { id: crypto.randomUUID(), name: text }]); setName(''); setError(''); onDirty(true);
  };
  return <form className="gp-stack" onSubmit={async e => {
    e.preventDefault();
    const next = name.trim() ? [...tools, { id: crypto.randomUUID(), name: name.trim() }] : tools;
    if (next.some(t => !t.name.trim()) || new Set(next.map(t => t.name.trim().toLocaleLowerCase('de'))).size !== next.length) { setError('Bitte eindeutige Gerätenamen eingeben.'); return; }
    if (await onSave(next.map(t => ({ ...t, name: t.name.trim() })))) { setTools(next); setName(''); onDirty(false); }
  }}>
    <h3>Meine Geräte und Werkzeuge</h3><p className="gp-hint">Maschinen, Handwerkzeug und Zubehör ergänzen. Anschließend im Objekt unter „Bestand“ den Pflegeaufgaben zuordnen. Daraus entsteht „Das brauchst du heute“ – ohne Abhaken.</p>
    {error && <p className="gp-error" role="alert">{error}</p>}
    {tools.map(tool => <label className="gp-field" key={tool.id}>Gerätename<input value={tool.name} onChange={e => { setTools(p => p.map(t => t.id === tool.id ? { ...t, name: e.target.value } : t)); onDirty(true); }} /></label>)}
    <label className="gp-field">Neues Gerät oder Werkzeug<input value={name} placeholder="Zum Beispiel Freischneider, Laubbläser, Akkus …" onChange={e => { setName(e.target.value); onDirty(true); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} /></label>
    <button type="button" onClick={add}>+ Zur Liste hinzufügen</button><div className="gp-save-bar"><button className="gp-primary" type="submit">Geräteliste speichern</button></div>
  </form>;
}
