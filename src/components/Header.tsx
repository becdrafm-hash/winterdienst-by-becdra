interface HeaderProps {
  lagerBestand: number;
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
}

export default function Header({ lagerBestand, darkMode, setDarkMode }: HeaderProps) {
  const bgCard = darkMode ? '#22262a' : '#ffffff';
  const textApp = darkMode ? '#f3f4f6' : '#1f2937';
  const borderCard = darkMode ? '#374151' : '#e5e7eb';

  return (
    <header style={{ backgroundColor: bgCard, color: textApp, padding: '12px 16px', position: 'sticky', top: 0, zIndex: 50, borderBottom: '3px solid #8cc63f', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'background-color 0.3s ease' }}>
      <div style={{ maxWidth: '440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: darkMode ? '#14171a' : '#ffffff', padding: '4px 8px', borderRadius: '8px', border: '1px solid ' + borderCard }}>
            <span style={{ fontWeight: '900', fontSize: '1.1rem', color: darkMode ? '#ffffff' : '#111827', letterSpacing: '-1px' }}>BF</span>
            <span style={{ fontWeight: 'bold', fontSize: '0.9rem', fontStyle: 'italic', marginLeft: '4px', color: darkMode ? '#ffffff' : '#111827' }}>Becdra FM</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.7rem', backgroundColor: lagerBestand < 3 ? (darkMode ? '#3b1f23' : '#fef2f2') : (darkMode ? '#14171a' : '#eef6e6'), color: lagerBestand < 3 ? '#dc2626' : '#8cc63f', border: '1px solid ' + (lagerBestand < 3 ? '#dc2626' : '#8cc63f'), padding: '5px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
            Lager: {Math.floor(lagerBestand)}
          </span>
          <button onClick={() => setDarkMode(!darkMode)} style={{ backgroundColor: darkMode ? '#8cc63f' : '#111827', color: darkMode ? '#111827' : '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>
            {darkMode ? '☀️ Hell' : '🌙 Dunkel'}
          </button>
        </div>
      </div>
    </header>
  );
}
