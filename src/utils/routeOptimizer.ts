export const ROUTEN_STARTPUNKT = {
  name: 'Groiner Allee 1, 46459 Rees',
  lat: 51.7580,
  lon: 6.4010
} as const;

export function haversineEntfernung(
  start: { lat: number; lon: number },
  ziel: { lat: number; lon: number }
): number {
  const erdradiusKm = 6371;
  const rad = (grad: number) => (grad * Math.PI) / 180;
  const lat1 = rad(start.lat);
  const lat2 = rad(ziel.lat);
  const deltaLat = rad(ziel.lat - start.lat);
  const deltaLon = rad(ziel.lon - start.lon);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return 2 * erdradiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function hatKoordinaten<T extends { lat?: number; lon?: number }>(
  liegenschaft: T
): liegenschaft is T & { lat: number; lon: number } {
  return typeof liegenschaft.lat === 'number'
    && Number.isFinite(liegenschaft.lat)
    && liegenschaft.lat >= -90
    && liegenschaft.lat <= 90
    && typeof liegenschaft.lon === 'number'
    && Number.isFinite(liegenschaft.lon)
    && liegenschaft.lon >= -180
    && liegenschaft.lon <= 180;
}

export function optimiereTour<T extends { lat?: number; lon?: number }>(liegenschaften: readonly T[]): T[] {
  const offen = liegenschaften.filter(hatKoordinaten);
  const ohneKoordinaten = liegenschaften.filter(liegenschaft => !hatKoordinaten(liegenschaft));
  const route: typeof offen = [];
  let aktuellerPunkt: { lat: number; lon: number } = ROUTEN_STARTPUNKT;

  while (offen.length > 0) {
    let naechsterIndex = 0;
    let kuerzesteEntfernung = haversineEntfernung(aktuellerPunkt, offen[0]);

    for (let index = 1; index < offen.length; index++) {
      const entfernung = haversineEntfernung(aktuellerPunkt, offen[index]);
      if (entfernung < kuerzesteEntfernung) {
        naechsterIndex = index;
        kuerzesteEntfernung = entfernung;
      }
    }

    const [naechsterStopp] = offen.splice(naechsterIndex, 1);
    route.push(naechsterStopp);
    aktuellerPunkt = naechsterStopp;
  }

  let verbessert = true;
  while (verbessert && route.length > 2) {
    verbessert = false;

    for (let start = 0; start < route.length - 1; start++) {
      for (let ende = start + 1; ende < route.length; ende++) {
        const vorher = start === 0 ? ROUTEN_STARTPUNKT : route[start - 1];
        const nachher = ende === route.length - 1 ? null : route[ende + 1];
        const aktuelleKosten = haversineEntfernung(vorher, route[start])
          + (nachher ? haversineEntfernung(route[ende], nachher) : 0);
        const getauschteKosten = haversineEntfernung(vorher, route[ende])
          + (nachher ? haversineEntfernung(route[start], nachher) : 0);

        if (getauschteKosten + 1e-9 < aktuelleKosten) {
          const umgedreht = route.slice(start, ende + 1).reverse();
          route.splice(start, umgedreht.length, ...umgedreht);
          verbessert = true;
        }
      }
    }
  }

  return [...route, ...ohneKoordinaten];
}
