import { useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { DWD_REGIONEN, type DwdRegionId } from '../services/dwdWetter';

interface EinstellungenTabProps {
  editingStartPunkt: string;
  setEditingStartPunkt: Dispatch<SetStateAction<string>>;
  editingSpritPreis: string;
  setEditingSpritPreis: Dispatch<SetStateAction<string>>;
  editingVerbrauch: string;
  setEditingVerbrauch: Dispatch<SetStateAction<string>>;
  dwdRegionen: DwdRegionId[];
  setDwdRegionen: Dispatch<SetStateAction<DwdRegionId[]>>;
  darkMode: boolean;
  textApp: string;
  textSub: string;
  borderCard: string;
  bgCard: string;
  onSaveStartpunkt: (event: FormEvent<HTMLFormElement>) => void;
  onSaveSpritPreis: (event: FormEvent<HTMLFormElement>) => void;
  onSaveVerbrauch: (event: FormEvent<HTMLFormElement>) => void;
}

interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  residential?: string;
  path?: string;
  house_number?: string;
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
}

async function reverseGeocodiere(latitude: number, longitude: number): Promise<string> {
  const query = new URLSearchParams({
    format: 'json',
    addressdetails: '1',
    'accept-language': 'de',
    lat: latitude.toString(),
    lon: longitude.toString()
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`);
  if (!response.ok) {
    throw new Error(`OpenStreetMap antwortet mit HTTP ${response.status}.`);
  }

  const daten: unknown = await response.json();
  if (typeof daten !== 'object' || daten === null || !('address' in daten)) {
    throw new Error('OpenStreetMap hat keine strukturierte Adresse zurückgegeben.');
  }

  const address = daten.address;
  if (typeof address !== 'object' || address === null) {
    throw new Error('Die Adressdaten von OpenStreetMap sind ungültig.');
  }

  const details = address as NominatimAddress;
  const strasse = details.road || details.pedestrian || details.residential || details.path;
  const ort = details.city || details.town || details.village || details.municipality;
  const strassenzeile = [strasse, details.house_number].filter(Boolean).join(' ');
  const ortszeile = [details.postcode, ort].filter(Boolean).join(' ');
  const adresse = [strassenzeile, ortszeile].filter(Boolean).join(', ');

  if (!adresse) {
    throw new Error('Für diesen Standort wurden keine passenden Adressbestandteile gefunden.');
  }

  return adresse;
}

export default function EinstellungenTab({
  editingStartPunkt,
  setEditingStartPunkt,
  editingSpritPreis,
  setEditingSpritPreis,
  editingVerbrauch,
  setEditingVerbrauch,
  dwdRegionen,
  setDwdRegionen,
  darkMode,
  textApp,
  textSub,
  borderCard,
  bgCard,
  onSaveStartpunkt,
  onSaveSpritPreis,
  onSaveVerbrauch
}: EinstellungenTabProps) {
  const [standortWirdErmittelt, setStandortWirdErmittelt] = useState(false);
  const [standortMeldung, setStandortMeldung] = useState<string | null>(null);

  const feldStil = {
    width: '100%',
    padding: '9px',
    borderRadius: '8px',
    border: '1px solid ' + borderCard,
    backgroundColor: darkMode ? '#14171a' : '#ffffff',
    color: textApp,
    fontSize: '0.85rem'
  };
  const kartenStil = {
    backgroundColor: bgCard,
    padding: '16px',
    borderRadius: '16px',
    border: '1px solid ' + borderCard,
    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px'
  };
  const speichernStil = {
    backgroundColor: '#8cc63f',
    color: '#111827',
    padding: '10px',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    border: 'none',
    cursor: 'pointer'
  };

  const ermittleStandort = () => {
    if (!navigator.geolocation) {
      setStandortMeldung('Die Standortermittlung wird von diesem Browser nicht unterstützt.');
      return;
    }

    setStandortWirdErmittelt(true);
    setStandortMeldung(null);
    navigator.geolocation.getCurrentPosition(
      async position => {
        const { latitude, longitude } = position.coords;
        const gpsText = `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

        try {
          const adresse = await reverseGeocodiere(latitude, longitude);
          setEditingStartPunkt(adresse);
          setStandortMeldung('Adresse übernommen. Speichere den Startpunkt, um ihn zu verwenden.');
        } catch (error) {
          setEditingStartPunkt(gpsText);
          const grund = error instanceof Error ? error.message : 'Unbekannter Fehler.';
          setStandortMeldung(`Adresse konnte nicht ermittelt werden (${grund}). Koordinaten wurden eingetragen.`);
        } finally {
          setStandortWirdErmittelt(false);
        }
      },
      error => {
        const meldung = error.code === error.PERMISSION_DENIED
          ? 'Der Standortzugriff wurde verweigert. Bitte erlaube den Zugriff in den Browsereinstellungen.'
          : error.code === error.POSITION_UNAVAILABLE
            ? 'Der aktuelle Standort ist momentan nicht verfügbar.'
            : error.code === error.TIMEOUT
              ? 'Die Standortermittlung hat zu lange gedauert. Bitte versuche es erneut.'
              : 'Der Standort konnte nicht ermittelt werden.';
        setStandortMeldung(meldung);
        setStandortWirdErmittelt(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 'bold', margin: 0, color: textApp }}>⚙️ Globale Einstellungen</h2>

      <section style={kartenStil}>
        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0, color: textApp }}>🏠 Startpunkt / Basis festlegen</h3>
        <form onSubmit={onSaveStartpunkt} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: textSub, fontSize: '0.75rem', fontWeight: 600 }}>
            Adresse für Start / Lager
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" value={editingStartPunkt} onChange={e => setEditingStartPunkt(e.target.value)} required style={{ ...feldStil, flex: 1, minWidth: 0 }} />
              <button
                type="button"
                onClick={ermittleStandort}
                disabled={standortWirdErmittelt}
                style={{
                  backgroundColor: darkMode ? '#14171a' : '#f3f4f6',
                  border: '1px solid ' + borderCard,
                  borderRadius: '8px',
                  color: textApp,
                  cursor: standortWirdErmittelt ? 'wait' : 'pointer',
                  flexShrink: 0,
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  padding: '8px'
                }}
              >
                {standortWirdErmittelt ? 'Standort wird ermittelt …' : '📍 Aktueller Standort'}
              </button>
            </div>
          </label>
          {standortMeldung && (
            <p role="status" style={{ color: standortMeldung.startsWith('Adresse übernommen') ? '#4d7c0f' : (darkMode ? '#fca5a5' : '#b91c1c'), fontSize: '0.75rem', lineHeight: 1.4, margin: 0 }}>
              {standortMeldung}
            </p>
          )}
          <span style={{ color: textSub, fontSize: '0.65rem' }}>
            Geocoding: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ color: textSub }}>© OpenStreetMap-Mitwirkende</a>
          </span>
          <button type="submit" style={speichernStil}>Startpunkt speichern</button>
        </form>
      </section>

      <section style={kartenStil}>
        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0, color: textApp }}>⛽ Spritpreis anpassen</h3>
        <form onSubmit={onSaveSpritPreis} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: textSub, fontSize: '0.75rem', fontWeight: 600 }}>
            Preis pro Liter (€)
            <input type="number" min="0" step="0.01" value={editingSpritPreis} onChange={e => setEditingSpritPreis(e.target.value)} required style={feldStil} />
          </label>
          <button type="submit" style={speichernStil}>Spritpreis speichern</button>
        </form>
      </section>

      <section style={kartenStil}>
        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0, color: textApp }}>🚗 Fahrzeugverbrauch anpassen</h3>
        <form onSubmit={onSaveVerbrauch} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: textSub, fontSize: '0.75rem', fontWeight: 600 }}>
            Verbrauch (Liter auf 100 km)
            <input type="number" min="0.1" step="0.1" value={editingVerbrauch} onChange={e => setEditingVerbrauch(e.target.value)} required style={feldStil} />
          </label>
          <button type="submit" style={speichernStil}>Verbrauch speichern</button>
        </form>
      </section>

      <fieldset style={{ ...kartenStil, color: textApp }}>
        <legend style={{ fontSize: '1rem', fontWeight: 'bold', padding: '0 6px' }}>🌨️ DWD-Wetterwarnungen</legend>
        <p style={{ color: textSub, fontSize: '0.8rem', lineHeight: 1.4, margin: 0 }}>
          Wähle die Landkreise aus, für die akute Schnee- und Glättewarnungen im Tour-Tab angezeigt werden.
        </p>
        {DWD_REGIONEN.map(region => (
          <label key={region.id} style={{ alignItems: 'center', color: textApp, display: 'flex', gap: '8px', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={dwdRegionen.includes(region.id)}
              onChange={event => setDwdRegionen(aktuelleRegionen =>
                event.target.checked
                  ? [...aktuelleRegionen, region.id]
                  : aktuelleRegionen.filter(id => id !== region.id)
              )}
            />
            {region.name}
          </label>
        ))}
      </fieldset>
    </>
  );
}
