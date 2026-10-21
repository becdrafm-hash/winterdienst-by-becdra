export interface LiegenschaftKoordinaten {
  lat: number;
  lon: number;
  quelle: 'nominatim' | 'regionaler-fallback';
  region?: string;
  grund?: string;
}

interface RegionalerStandort {
  name: string;
  lat: number;
  lon: number;
  postleitzahlen: readonly string[];
}

const REGIONALE_STANDORTE: readonly RegionalerStandort[] = [
  {
    name: 'Rees',
    lat: 51.7627,
    lon: 6.3979,
    postleitzahlen: ['46459']
  },
  {
    name: 'Wesel',
    lat: 51.6580,
    lon: 6.6175,
    postleitzahlen: [
      '46483', '46485', '46487', '46499', '46509', '46514', '46519',
      '46535', '46537', '46539', '46562', '46569', '47441', '47443',
      '47445', '47447', '47475', '47495'
    ]
  },
  {
    name: 'Kleve',
    lat: 51.7883,
    lon: 6.1386,
    postleitzahlen: [
      '46446', '47533', '47546', '47551', '47559', '47574', '47589',
      '47608', '47623', '47624', '47625', '47626', '47627', '47638',
      '47647', '47652', '47661'
    ]
  },
  {
    name: 'Borken',
    lat: 51.8430,
    lon: 6.8577,
    postleitzahlen: [
      '46325', '46342', '46354', '46359', '46414', '46419', '48683',
      '48691', '48703', '48712', '48734', '48739'
    ]
  }
];

function istKoordinatenGueltig(lat: number, lon: number): boolean {
  return Number.isFinite(lat)
    && lat >= -90
    && lat <= 90
    && Number.isFinite(lon)
    && lon >= -180
    && lon <= 180;
}

function regionalerFallback(adresse: string, grund: string): LiegenschaftKoordinaten {
  const postleitzahl = adresse.match(/\b\d{5}\b/)?.[0];
  const region = REGIONALE_STANDORTE.find(standort =>
    postleitzahl !== undefined && standort.postleitzahlen.includes(postleitzahl)
  ) ?? REGIONALE_STANDORTE[0];

  return {
    lat: region.lat,
    lon: region.lon,
    quelle: 'regionaler-fallback',
    region: region.name,
    grund
  };
}

export async function ermittleLiegenschaftKoordinaten(adresse: string): Promise<LiegenschaftKoordinaten> {
  const query = new URLSearchParams({
    format: 'json',
    q: adresse,
    limit: '1',
    countrycodes: 'de'
  });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${query}`, {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Nominatim antwortet mit HTTP ${response.status}.`);
    }

    const ergebnisse: unknown = await response.json();
    if (!Array.isArray(ergebnisse) || ergebnisse.length === 0) {
      throw new Error('Für diese Adresse wurde kein Geocoding-Treffer gefunden.');
    }

    const ersterTreffer: unknown = ergebnisse[0];
    if (typeof ersterTreffer !== 'object' || ersterTreffer === null || !('lat' in ersterTreffer) || !('lon' in ersterTreffer)) {
      throw new Error('Der Geocoding-Treffer enthält keine Koordinaten.');
    }

    const lat = Number(ersterTreffer.lat);
    const lon = Number(ersterTreffer.lon);
    if (!istKoordinatenGueltig(lat, lon)) {
      throw new Error('Der Geocoding-Treffer enthält ungültige Koordinaten.');
    }

    return { lat, lon, quelle: 'nominatim' };
  } catch (error) {
    const grund = error instanceof Error
      ? error.message
      : 'Unbekannter Fehler bei der Adresssuche.';
    return regionalerFallback(adresse, grund);
  }
}
