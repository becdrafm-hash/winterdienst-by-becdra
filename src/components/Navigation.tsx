import type { Dispatch, SetStateAction } from 'react';
import type { Liegenschaft } from '../types';

type AppTab = 'tour' | 'liegenschaften' | 'lager' | 'mehr' | 'kunden' | 'statistik' | 'history_saison' | 'garten';

interface NavigationProps {
  activeTab: AppTab;
  setActiveTab: Dispatch<SetStateAction<AppTab>>;
  activeObjekt: Liegenschaft | null;
  darkMode: boolean;
  textSub: string;
  bgCard: string;
  borderCard: string;
}

export default function Navigation({
  activeTab,
  setActiveTab,
  activeObjekt,
  darkMode,
  textSub,
  bgCard,
  borderCard
}: NavigationProps) {
  if (activeObjekt) return null;

  const navButtonStyle = (isActive: boolean) => ({
    minHeight: '48px',
    padding: '12px 4px',
    textAlign: 'center' as const,
    fontSize: '0.8rem',
    fontWeight: 'bold',
    borderRadius: '9px',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: isActive ? '#8cc63f' : (darkMode ? '#14171a' : '#f3f4f6'),
    color: isActive ? '#111827' : textSub
  });
  const isMehrActive = ['mehr', 'liegenschaften', 'kunden', 'statistik', 'history_saison'].includes(activeTab);

  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', backgroundColor: bgCard, borderTop: '2px solid #8cc63f', borderInline: '1px solid ' + borderCard, boxShadow: '0 -4px 15px rgba(0,0,0,0.08)', zIndex: 100, transition: 'background-color 0.3s ease' }}>
      <div style={{ maxWidth: '440px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '8px', gap: '6px' }}>
        <button onClick={() => setActiveTab('garten')} style={navButtonStyle(activeTab === 'garten')}>🌿 Garten</button>
        <button onClick={() => setActiveTab('mehr')} style={navButtonStyle(isMehrActive)}>
          ⚙️ Mehr
        </button>
        <button onClick={() => setActiveTab('tour')} style={navButtonStyle(activeTab === 'tour')}>
          🚗 Tour
        </button>
        <button onClick={() => setActiveTab('lager')} style={navButtonStyle(activeTab === 'lager')}>
          📦 Lager
        </button>
      </div>
    </nav>
  );
}
