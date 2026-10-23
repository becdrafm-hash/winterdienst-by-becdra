import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../src/utils/winterMaintenance.ts';
import { emptyState, newObject, planningWindow } from '../src/garden/model.ts';

function storage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: k => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    clear: () => {
      throw new Error('localStorage.clear() darf niemals verwendet werden!');
    },
    map
  };
}

function createFakeIndexedDbFactory(initialStores = {}) {
  const databases = new Map();
  for (const [dbName, stores] of Object.entries(initialStores)) {
    const dbMap = new Map();
    for (const [storeName, entries] of Object.entries(stores)) {
      dbMap.set(storeName, new Map(Object.entries(entries)));
    }
    databases.set(dbName, dbMap);
  }

  return {
    databases,
    open(dbName) {
      const req = {
        result: null,
        error: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        onblocked: null
      };
      queueMicrotask(() => {
        let isNew = false;
        if (!databases.has(dbName)) {
          databases.set(dbName, new Map());
          isNew = true;
        }
        const dbStores = databases.get(dbName);
        const db = {
          objectStoreNames: {
            contains: name => dbStores.has(name)
          },
          createObjectStore(name) {
            if (!dbStores.has(name)) dbStores.set(name, new Map());
            return {};
          },
          transaction(storeName, mode) {
            const targetStore = dbStores.get(storeName);
            const staged = new Map(targetStore);
            const tx = {
              error: null,
              oncomplete: null,
              onabort: null,
              onerror: null,
              aborted: false,
              abort(reason = new Error('Transaction aborted')) {
                this.aborted = true;
                this.error = reason;
                queueMicrotask(() => {
                  if (typeof this.onabort === 'function') this.onabort();
                });
              },
              objectStore() {
                return {
                  get(key) {
                    const getReq = { result: undefined, error: null, onsuccess: null, onerror: null };
                    queueMicrotask(() => {
                      if (tx.aborted) return;
                      getReq.result = staged.get(key);
                      if (typeof getReq.onsuccess === 'function') getReq.onsuccess();
                    });
                    return getReq;
                  },
                  put(value, key) {
                    if (mode !== 'readwrite') throw new Error('Readonly transaction');
                    staged.set(key, value);
                  },
                  delete(key) {
                    if (mode !== 'readwrite') throw new Error('Readonly transaction');
                    staged.delete(key);
                  }
                };
              }
            };
            queueMicrotask(() => {
              queueMicrotask(() => {
                if (tx.aborted) return;
                targetStore.clear();
                for (const [k, v] of staged.entries()) targetStore.set(k, v);
                if (typeof tx.oncomplete === 'function') tx.oncomplete();
              });
            });
            return tx;
          },
          close() {}
        };
        req.result = db;
        if (isNew && typeof req.onupgradeneeded === 'function') {
          req.onupgradeneeded();
        }
        if (typeof req.onsuccess === 'function') {
          req.onsuccess();
        }
      });
      return req;
    }
  };
}

function createProductiveSeed() {
  const gartenObjekt = {
    ...newObject(),
    id: 'garden-obj-1',
    customerId: 101,
    name: 'Gartenanlage Bahnstraße',
    address: 'Bahnstraße 12, 46459 Rees',
    updatedAt: '2026-10-21T10:00:00.000Z'
  };
  const gartenState = {
    ...emptyState(),
    revision: 3,
    objects: [gartenObjekt],
    followUps: [
      {
        id: 'fu-1',
        objectId: 'garden-obj-1',
        text: 'Eibenhecke prüfen',
        due: '2026-11-05',
        status: 'open',
        createdAt: '2026-10-21T10:05:00.000Z'
      }
    ],
    appointments: [],
    visits: []
  };

  return {
    becdra_kunden: JSON.stringify([
      { id: 101, firma: 'Hausverwaltung Niederrhein GmbH', email: 'info@hv-niederrhein.de', whatsapp: '+491701234567', bevorzugterKanal: 'whatsapp' }
    ]),
    becdra_liegenschaften: JSON.stringify([
      { id: 202, kundeId: 101, name: 'Ärztehaus Zentrum', address: 'Markt 1, 46459 Rees', size: '450', material: 'Salz', reihenfolge: 1, lat: 51.758, lon: 6.397 }
    ]),
    becdra_gartenpflege_snapshot: JSON.stringify(gartenState),
    becdra_lager_bestaende: JSON.stringify({ Salz: 500, Splitt: 200, Sand: 50, Lava: 0, Acetat: 100 }),
    becdra_lager: JSON.stringify(500),
    becdra_lager_kg_migration_v1: 'true',
    becdra_material_preise: JSON.stringify({ Salz: { betrag: 8.5, basis: 'sack25kg' } }),
    becdra_startpunkt: 'Groiner Allee 1, 46459 Rees',
    becdra_spritpreis: '1.85',
    becdra_verbrauch: '10.5',
    becdra_dwd_regionen: JSON.stringify(['205554000']),
    becdra_saison_von: '2026-11-01',
    becdra_saison_bis: '2027-03-31',
    becdra_history: JSON.stringify([
      { id: 301, kundeId: 101, objektId: 202, kundeName: 'Hausverwaltung Niederrhein GmbH', objName: 'Ärztehaus Zentrum', date: '23.10.2026 06:30', timestamp: 1792730000000, wetter: '0°C', type: 'streuen', duration: '15 Min.', materialUsed: '10 kg (Auftausalz)', kmGefahren: '4 km', spritKosten: '0.78 €' }
    ]),
    becdra_saison_archiv: JSON.stringify([
      { id: 401, name: 'Test-Archiv', vonDatum: '2025-11-01', bisDatum: '2026-03-31', einsätze: [], gesamtSaecke: 2, gesamtMaterialKg: 50, gesamtKm: 12, gesamtSprit: 2.2 }
    ]),
    becdra_active_kunde: JSON.stringify({ id: 101, firma: 'Hausverwaltung Niederrhein GmbH', email: 'info@hv-niederrhein.de', whatsapp: '+491701234567' }),
    becdra_active_objekt: JSON.stringify({ id: 202, kundeId: 101, name: 'Ärztehaus Zentrum', address: 'Markt 1, 46459 Rees', size: '450', material: 'Salz', reihenfolge: 1 }),
    becdra_starttime: '2026-10-23T05:00:00.000Z',
    becdra_ankunftzeit: '2026-10-23T05:10:00.000Z',
    becdra_gefahrene_km: '3',
    becdra_arbeitszeit: JSON.stringify({ pauseBeginn: null, pausendauerMs: 0 }),
    becdra_manuelle_endzeit: '05:30'
  };
}

const GESCHUETZTE_SCHLUESSEL = [
  'becdra_kunden',
  'becdra_liegenschaften',
  'becdra_gartenpflege_snapshot',
  'becdra_lager_bestaende',
  'becdra_lager',
  'becdra_lager_kg_migration_v1',
  'becdra_material_preise',
  'becdra_startpunkt',
  'becdra_spritpreis',
  'becdra_verbrauch',
  'becdra_dwd_regionen',
  'becdra_saison_von',
  'becdra_saison_bis'
];

function assertGeschuetzteDatenUnveraendert(s, seed) {
  for (const key of GESCHUETZTE_SCHLUESSEL) {
    assert.equal(s.getItem(key), seed[key], `Geschützter Schlüssel "${key}" muss bytegenau unverändert bleiben`);
  }
  const gartenNachher = JSON.parse(s.getItem('becdra_gartenpflege_snapshot'));
  assert.equal(gartenNachher.objects.length, 1);
  assert.equal(gartenNachher.objects[0].name, 'Gartenanlage Bahnstraße');
  assert.equal(gartenNachher.followUps.length, 1);
  assert.equal(planningWindow(gartenNachher.objects[0], gartenNachher.visits, '2026-10-23').paused, false);
}

// --- 1. Die 4 bestehenden Tests aus origin/main unverändert erhalten ---

test('Season boundaries retain other dates and invalid timestamps', () => {
  const logs = ['2026-10-31', '2026-11-01', '2027-03-31', '2027-04-01'].map((d, id) => ({
    id,
    timestamp: new Date(d + 'T12:00:00').getTime()
  }));
  logs.push({ id: 4, timestamp: NaN });
  const result = api.teileWinterSaison(logs, '2026-11-01', '2027-03-31');
  assert.deepEqual(Array.from(result.saison, x => x.id), [1, 2]);
  assert.deepEqual(Array.from(result.verbleibend, x => x.id), [0, 3, 4]);
  assert.throws(() => api.teileWinterSaison(logs, '2027-04-01', '2026-11-01'));
});

test('Cleanup and undo preserve customers, properties and unrelated storage byte for byte', () => {
  const seed = {
    becdra_kunden: '[{"id":1}]',
    becdra_liegenschaften: '[{"id":2}]',
    garden: 'unchanged',
    becdra_lager_bestaende: '{"Salz":15}',
    becdra_material_preise: '{"Salz":5}',
    becdra_history: '[{"id":3}]',
    becdra_saison_archiv: '[{"id":4}]',
    becdra_active_objekt: '{"id":2}'
  };
  const s = storage(seed);
  api.bereinigeWinterTestdaten(s);
  for (const k of ['becdra_kunden', 'becdra_liegenschaften', 'garden', 'becdra_lager_bestaende', 'becdra_material_preise']) {
    assert.equal(s.getItem(k), seed[k]);
  }
  assert.equal(s.getItem('becdra_history'), '[]');
  assert.equal(s.getItem('becdra_active_objekt'), null);
  assert.throws(() => api.bereinigeWinterTestdaten(s));
  api.stelleWinterTestdatenWiederHer(s);
  assert.deepEqual(Object.fromEntries(s.map), seed);
});

test('Failed checkpoint aborts before cleanup', () => {
  const s = storage({ becdra_history: 'history' });
  s.setItem = () => {
    throw new Error('QuotaExceededError');
  };
  assert.throws(() => api.bereinigeWinterTestdaten(s));
  assert.equal(s.getItem('becdra_history'), 'history');
});

test('Failure during cleanup rolls back and retains checkpoint', () => {
  const s = storage({ becdra_history: 'history', becdra_saison_archiv: 'archive' });
  const set = s.setItem;
  let failed = false;
  s.setItem = (k, v) => {
    if (k === 'becdra_saison_archiv' && !failed) {
      failed = true;
      throw new Error('unavailable');
    }
    set(k, v);
  };
  assert.throws(() => api.bereinigeWinterTestdaten(s));
  assert.equal(s.getItem('becdra_history'), 'history');
  assert.equal(s.getItem('becdra_saison_archiv'), 'archive');
  assert.ok(s.getItem(api.WINTER_CHECKPOINT));
});

// --- 2. Ergänzte Tests für Zurücklesen, IndexedDB-Fallback ohne Vorab-Leeren, vorhandene Sicherung und Unterbrechungen ---

test('Sicherung wird vor jeder Änderung zurückgelesen; bei fehlerhaftem Zurücklesen wird unverändert abgebrochen', () => {
  const seed = createProductiveSeed();
  const s = storage(seed);
  const origGet = s.getItem;
  let winterKeyModified = false;
  const origSet = s.setItem;
  const origRemove = s.removeItem;

  s.setItem = (k, v) => {
    if (api.WINTER_TEST_KEYS.includes(k)) winterKeyModified = true;
    origSet(k, v);
  };
  s.removeItem = k => {
    if (api.WINTER_TEST_KEYS.includes(k)) winterKeyModified = true;
    origRemove(k);
  };
  // Simuliere stilles Abschneiden/Korruption beim Zurücklesen der Sicherung
  s.getItem = k => (k === api.WINTER_CHECKPOINT ? '{"becdra_history":"manipuliert"}' : origGet(k));

  assert.throws(
    () => api.bereinigeWinterTestdaten(s),
    err => err instanceof api.WinterWartungsFehler && err.datenStatus === 'unveraendert'
  );
  assert.equal(winterKeyModified, false, 'Kein einziger Winterdienst-Schlüssel darf vor erfolgreichem Zurücklesen verändert werden');
  assert.equal(origGet(api.WINTER_CHECKPOINT), null, 'Unvollständige Sicherung muss entfernt werden');
  assert.deepEqual(Object.fromEntries(s.map), seed);
  assertGeschuetzteDatenUnveraendert(s, seed);
});

test('QuotaExceededError bei localStorage-Sicherung: Kein vorheriges Leeren, stattdessen getrennte IndexedDB-Sicherung (gespeichert + zurückgelesen vor Bereinigung)', async () => {
  const seed = createProductiveSeed();
  const s = storage(seed);
  const ablaufProtokoll = [];

  const origSet = s.setItem;
  const origRemove = s.removeItem;
  s.setItem = (k, v) => {
    if (k === api.WINTER_CHECKPOINT) {
      ablaufProtokoll.push('localStorage:checkpoint:quota_error');
      throw new Error('QuotaExceededError');
    }
    ablaufProtokoll.push(`localStorage:set:${k}`);
    origSet(k, v);
  };
  s.removeItem = k => {
    ablaufProtokoll.push(`localStorage:remove:${k}`);
    origRemove(k);
  };

  // Getrennte IndexedDB-Fabrik inklusive bestehender Garten-Datenbank, die unberührt bleiben muss
  const idbFactory = createFakeIndexedDbFactory({
    'becdra-gartenpflege-v1': {
      data: { state: JSON.parse(seed.becdra_gartenpflege_snapshot) },
      photos: { 'photo-1': { id: 'photo-1', sha256: 'abc' } }
    }
  });
  const basisIdbSpeicher = api.erzeugeIndexedDbWinterSicherungSpeicher(idbFactory);
  const protokollierterIdbSpeicher = {
    async getItem() {
      const val = await basisIdbSpeicher.getItem();
      ablaufProtokoll.push(`indexedDB:get:${val !== null ? 'present' : 'empty'}`);
      return val;
    },
    async setItem(val) {
      // Prüfen, dass zu diesem Zeitpunkt noch KEIN Winterdienst-Schlüssel in localStorage verändert wurde!
      for (const key of api.WINTER_TEST_KEYS) {
        assert.equal(s.getItem(key), seed[key], `Schlüssel "${key}" muss beim Schreiben der IndexedDB-Sicherung noch unverändert sein`);
      }
      await basisIdbSpeicher.setItem(val);
      ablaufProtokoll.push('indexedDB:set');
    },
    async removeItem() {
      await basisIdbSpeicher.removeItem();
      ablaufProtokoll.push('indexedDB:remove');
    }
  };

  const ergebnis = await api.bereinigeWinterTestdatenAsync(s, protokollierterIdbSpeicher);
  assert.equal(ergebnis.status, 'bereinigt');
  assert.equal(ergebnis.sicherungsort, 'indexedDB');

  // Reihenfolge-Nachweis: Erst IndexedDB-Set + IndexedDB-Get (Zurücklesen), DANN erst erste Änderung an localStorage!
  const idxIdbSet = ablaufProtokoll.indexOf('indexedDB:set');
  const idxIdbVerifyGet = ablaufProtokoll.lastIndexOf('indexedDB:get:present');
  const idxFirstLocalMutation = ablaufProtokoll.findIndex(e =>
    api.WINTER_TEST_KEYS.some(k => e === `localStorage:set:${k}` || e === `localStorage:remove:${k}`)
  );
  assert.ok(idxIdbSet >= 0 && idxIdbVerifyGet > idxIdbSet && idxFirstLocalMutation > idxIdbVerifyGet);

  assert.equal(s.getItem('becdra_history'), '[]');
  assert.equal(s.getItem('becdra_saison_archiv'), '[]');
  assert.equal(await api.hatWinterBereinigungsSicherungAsync(s, protokollierterIdbSpeicher), true);
  assertGeschuetzteDatenUnveraendert(s, seed);

  // Garten-IndexedDB blieb völlig unberührt
  const gartenDb = idbFactory.databases.get('becdra-gartenpflege-v1');
  assert.deepEqual(gartenDb.get('data').get('state'), JSON.parse(seed.becdra_gartenpflege_snapshot));
  assert.deepEqual(gartenDb.get('photos').get('photo-1'), { id: 'photo-1', sha256: 'abc' });

  // Wiederherstellung aus der getrennten IndexedDB-Sicherung
  await api.stelleWinterTestdatenWiederHerAsync(s, protokollierterIdbSpeicher);
  assert.deepEqual(Object.fromEntries(s.map), seed);
  assert.equal(await api.hatWinterBereinigungsSicherungAsync(s, protokollierterIdbSpeicher), false);
  assertGeschuetzteDatenUnveraendert(s, seed);
});

test('Scheitern sowohl localStorage-Sicherung als auch IndexedDB-Sicherung, bricht die Bereinigung völlig unverändert ab', async () => {
  const seed = createProductiveSeed();
  const s = storage(seed);
  s.setItem = (k, v) => {
    if (k === api.WINTER_CHECKPOINT) throw new Error('QuotaExceededError');
    throw new Error('Darf keinen anderen Schlüssel schreiben, wenn Sicherung scheitert!');
  };
  s.removeItem = k => {
    if (k === api.WINTER_CHECKPOINT) return;
    throw new Error('Darf keinen Schlüssel entfernen, wenn Sicherung scheitert!');
  };

  const defekterIdbSpeicher = {
    async getItem() {
      return null;
    },
    async setItem() {
      throw new Error('IndexedDB QuotaExceededError');
    },
    async removeItem() {}
  };

  await assert.rejects(
    () => api.bereinigeWinterTestdatenAsync(s, defekterIdbSpeicher),
    err =>
      err instanceof api.WinterWartungsFehler &&
      err.datenStatus === 'unveraendert' &&
      err.message.includes('Unverändert')
  );
  assert.deepEqual(Object.fromEntries(s.map), seed);
  assertGeschuetzteDatenUnveraendert(s, seed);
});

test('Vorhandene Sicherungen in localStorage oder IndexedDB werden niemals ungeprüft zusammengeführt oder überschrieben', async () => {
  const seed = createProductiveSeed();
  const s = storage(seed);
  const idbFactory = createFakeIndexedDbFactory();
  const idbSpeicher = api.erzeugeIndexedDbWinterSicherungSpeicher(idbFactory);

  // 1. Vorhandene Sicherung in IndexedDB schützt vor Überschreiben
  const fruehereSicherung = JSON.stringify({
    ...Object.fromEntries(api.WINTER_TEST_KEYS.map(k => [k, null])),
    becdra_history: '[{"id":999,"kundeName":"Früherer Stand"}]',
    becdra_saison_archiv: '[]'
  });
  await idbSpeicher.setItem(fruehereSicherung);

  await assert.rejects(
    () => api.bereinigeWinterTestdatenAsync(s, idbSpeicher),
    err =>
      err instanceof api.WinterWartungsFehler &&
      err.datenStatus === 'unveraendert' &&
      err.message.includes('Eine frühere Bereinigungssicherung ist vorhanden')
  );
  assert.equal(await idbSpeicher.getItem(), fruehereSicherung, 'Bestehende IndexedDB-Sicherung darf nicht verändert werden');
  assert.deepEqual(Object.fromEntries(s.map), seed, 'Daten in localStorage dürfen nicht verändert werden');

  // 2. Widersprüchliche Sicherungen in localStorage und IndexedDB werden bei Wiederherstellung abgelehnt
  s.setItem(
    api.WINTER_CHECKPOINT,
    JSON.stringify({
      ...Object.fromEntries(api.WINTER_TEST_KEYS.map(k => [k, null])),
      becdra_history: '[{"id":888,"kundeName":"Abweichender Stand"}]',
      becdra_saison_archiv: '[]'
    })
  );
  await assert.rejects(
    () => api.stelleWinterTestdatenWiederHerAsync(s, idbSpeicher),
    err =>
      err instanceof api.WinterWartungsFehler &&
      err.datenStatus === 'unveraendert' &&
      err.message.includes('Widersprüchliche')
  );
  assert.equal(await idbSpeicher.getItem(), fruehereSicherung);
  assertGeschuetzteDatenUnveraendert(s, seed);
});

test('Unterbrechung zwischen Sicherung und Bereinigung sowie mitten in der Bereinigung (mit und ohne Rollback)', async () => {
  const seed = createProductiveSeed();
  const s = storage(seed);
  const idbFactory = createFakeIndexedDbFactory();
  const idbSpeicher = api.erzeugeIndexedDbWinterSicherungSpeicher(idbFactory);

  const origSet = s.setItem;
  let unterbrecheBereinigung = true;
  let blockiereRollback = true;

  s.setItem = (k, v) => {
    if (k === api.WINTER_CHECKPOINT) {
      throw new Error('QuotaExceededError');
    }
    if (unterbrecheBereinigung && k === 'becdra_saison_archiv') {
      throw new Error('Unterbrechung mitten in der Bereinigung nach becdra_history');
    }
    if (blockiereRollback && k === 'becdra_history' && v !== '[]') {
      throw new Error('Unterbrechung verhindert automatischen Rollback');
    }
    origSet(k, v);
  };

  // Bereinigung speichert zuerst die Sicherung in IndexedDB, ändert becdra_history auf '[]',
  // bricht bei becdra_saison_archiv ab und kann becdra_history wegen Unterbrechung nicht zurückrollen.
  await assert.rejects(
    () => api.bereinigeWinterTestdatenAsync(s, idbSpeicher),
    err =>
      err instanceof api.WinterWartungsFehler &&
      err.datenStatus === 'teilweise_veraendert' &&
      err.message.includes('Teilweise verändert')
  );
  assert.equal(s.getItem('becdra_history'), '[]');
  assert.equal(s.getItem('becdra_saison_archiv'), seed.becdra_saison_archiv);
  assertGeschuetzteDatenUnveraendert(s, seed);

  // Ein erneuter Bereinigungsversuch im unterbrochenen Zustand darf die echte Sicherung NICHT mit dem halb-leeren Stand überschreiben!
  await assert.rejects(
    () => api.bereinigeWinterTestdatenAsync(s, idbSpeicher),
    err => err instanceof api.WinterWartungsFehler && err.datenStatus === 'unveraendert'
  );

  // Sobald der Speicher wieder normal arbeitet, stellt die Rücknahme den kompletten Ausgangsstand bytegenau wieder her
  unterbrecheBereinigung = false;
  blockiereRollback = false;
  await api.stelleWinterTestdatenWiederHerAsync(s, idbSpeicher);
  assert.deepEqual(Object.fromEntries(s.map), seed);
  assert.equal(await idbSpeicher.getItem(), null);
  assertGeschuetzteDatenUnveraendert(s, seed);
});

test('Unterbrechung während der Rücknahme löscht die Sicherung nicht vorzeitig und erlaubt vollständige Wiederholung', async () => {
  const seed = createProductiveSeed();
  const s = storage(seed);
  const idbFactory = createFakeIndexedDbFactory();
  const idbSpeicher = api.erzeugeIndexedDbWinterSicherungSpeicher(idbFactory);

  // 1. Reguläre Bereinigung durchführen
  await api.bereinigeWinterTestdatenAsync(s, idbSpeicher);
  assert.equal(s.getItem('becdra_history'), '[]');
  assert.equal(s.getItem('becdra_saison_archiv'), '[]');

  // 2. Rücknahme wird nach dem Schreiben von becdra_history bei becdra_saison_archiv unterbrochen
  const origSet = s.setItem;
  let unterbrecheWiederherstellung = true;
  s.setItem = (k, v) => {
    if (unterbrecheWiederherstellung && k === 'becdra_saison_archiv' && v !== '[]') {
      throw new Error('Unterbrechung während der Rücknahme');
    }
    origSet(k, v);
  };

  await assert.rejects(
    () => api.stelleWinterTestdatenWiederHerAsync(s, idbSpeicher),
    err =>
      err instanceof api.WinterWartungsFehler &&
      err.datenStatus === 'wiederhergestellt' &&
      err.message.includes('Rücknahmesicherung bleibt unverändert erhalten')
  );
  // Stand vor dem Wiederherstellungsversuch ('[]') ist wiederhergestellt UND die Sicherung ist noch vorhanden!
  assert.equal(s.getItem('becdra_history'), '[]');
  assert.equal(await api.hatWinterBereinigungsSicherungAsync(s, idbSpeicher), true);
  assertGeschuetzteDatenUnveraendert(s, seed);

  // 3. Zweiter Versuch der Rücknahme nach Ende der Störung stellt alles vollständig wieder her und löscht erst danach die Sicherung
  unterbrecheWiederherstellung = false;
  await api.stelleWinterTestdatenWiederHerAsync(s, idbSpeicher);
  assert.deepEqual(Object.fromEntries(s.map), seed);
  assert.equal(await api.hatWinterBereinigungsSicherungAsync(s, idbSpeicher), false);
  assertGeschuetzteDatenUnveraendert(s, seed);
});

test('IndexedDB-Lesefehler (unbekannter Sicherungsstatus) und ungültige Datentypen in IndexedDB brechen unverändert ab ohne Überschreiben', async () => {
  const seed = createProductiveSeed();
  const s = storage(seed);

  // Fall A: Vorübergehender Lesefehler der IndexedDB trotz dort bereits gespeicherter Sicherung
  // und gleichzeitig QuotaExceededError in localStorage -> bestehende IndexedDB-Sicherung darf NIEMALS beim Fallback überschrieben werden!
  const bestehendeSicherung = JSON.stringify({
    ...Object.fromEntries(api.WINTER_TEST_KEYS.map(k => [k, null])),
    becdra_history: '[{"id":777,"kundeName":"Geschützte Altsicherung"}]',
    becdra_saison_archiv: '[]'
  });
  let idbInhalt = bestehendeSicherung;
  let setItemAufgerufen = false;
  const instabilerIdbSpeicher = {
    async getItem() {
      throw new Error('IndexedDB-Transaktion beim Lesen unterbrochen');
    },
    async setItem(v) {
      setItemAufgerufen = true;
      idbInhalt = v;
    },
    async removeItem() {
      idbInhalt = null;
    }
  };

  const origSet = s.setItem;
  s.setItem = (k, v) => {
    if (k === api.WINTER_CHECKPOINT) throw new Error('QuotaExceededError');
    origSet(k, v);
  };

  await assert.rejects(
    () => api.bereinigeWinterTestdatenAsync(s, instabilerIdbSpeicher),
    err =>
      err instanceof api.WinterWartungsFehler &&
      err.datenStatus === 'unveraendert' &&
      err.message.includes('Sicherungsstatus in der IndexedDB konnte nicht geprüft werden')
  );
  assert.equal(setItemAufgerufen, false, 'Fallback-Schreiben auf IndexedDB darf bei Lesefehler niemals ausgeführt werden');
  assert.equal(idbInhalt, bestehendeSicherung, 'Bestehende IndexedDB-Sicherung muss unangetastet bleiben');
  assert.deepEqual(Object.fromEntries(s.map), seed, 'localStorage muss unverändert bleiben');

  // Fall B: Ungültige Datentypen im IndexedDB-Sicherungseintrag (Objekt, Zahl, Boolean, Array, Leerstring)
  // dürfen niemals als fehlende Sicherung (null) gewertet werden.
  for (const ungueltigerEintrag of [{ kaputt: true }, 42, true, ['array'], '']) {
    const idbFactory = createFakeIndexedDbFactory({
      [api.WINTER_BACKUP_DB_NAME]: {
        sicherung: { checkpoint_v1: ungueltigerEintrag }
      }
    });
    const idbSpeicher = api.erzeugeIndexedDbWinterSicherungSpeicher(idbFactory);

    await assert.rejects(
      () => api.bereinigeWinterTestdatenAsync(s, idbSpeicher),
      err => err instanceof api.WinterWartungsFehler && err.datenStatus === 'unveraendert'
    );
    await assert.rejects(
      () => api.stelleWinterTestdatenWiederHerAsync(s, idbSpeicher),
      err => err instanceof api.WinterWartungsFehler && err.datenStatus === 'unveraendert'
    );
    assert.deepEqual(
      idbFactory.databases.get(api.WINTER_BACKUP_DB_NAME).get('sicherung').get('checkpoint_v1'),
      ungueltigerEintrag,
      'Ungültiger IndexedDB-Eintrag darf nicht stillschweigend überschrieben oder gelöscht werden'
    );
    assert.deepEqual(Object.fromEntries(s.map), seed);
  }
});

test('synchronisiereWinterStateAusStorage erhält bei Lese- oder Parsefehlern den bisherigen React-State, verhindert Überschreiben durch Speichereffekte und setzt dauerhaften Fehler', () => {
  const seed = createProductiveSeed();
  const s = storage(seed);

  // Simuliere bestehenden React-State und die zugehörigen React-useEffect-Speichereffekte aus App.tsx
  const bisherigerHistoryStand = JSON.parse(seed.becdra_history);
  const bisherigerArchivStand = JSON.parse(seed.becdra_saison_archiv);
  const bisherigerKundeStand = JSON.parse(seed.becdra_active_kunde);
  const bisherigerObjektStand = JSON.parse(seed.becdra_active_objekt);
  const bisherigeStartZeit = new Date(seed.becdra_starttime);
  const bisherigeAnkunftZeit = new Date(seed.becdra_ankunftzeit);
  const bisherigeArbeitszeit = JSON.parse(seed.becdra_arbeitszeit);

  const reactState = {
    history: bisherigerHistoryStand,
    archivListe: bisherigerArchivStand,
    activeKunde: bisherigerKundeStand,
    activeObjekt: bisherigerObjektStand,
    startTime: bisherigeStartZeit,
    ankunftTime: bisherigeAnkunftZeit,
    manuelleEndZeit: seed.becdra_manuelle_endzeit,
    arbeitszeitStatus: bisherigeArbeitszeit,
    gefahreneKm: seed.becdra_gefahrene_km,
    accumulatedKm: Number(seed.becdra_gefahrene_km),
    wartungsMeldung: null
  };

  let setterAufrufe = 0;
  // Jeder Setter simuliert gleichzeitig den React-useEffect, der bei State-Änderung sofort in localStorage zurückschreiben würde!
  const callbacks = {
    setHistory: val => {
      setterAufrufe++;
      reactState.history = val;
      s.setItem('becdra_history', JSON.stringify(val));
    },
    setArchivListe: val => {
      setterAufrufe++;
      reactState.archivListe = val;
      s.setItem('becdra_saison_archiv', JSON.stringify(val));
    },
    setActiveKunde: val => {
      setterAufrufe++;
      reactState.activeKunde = val;
      if (val) s.setItem('becdra_active_kunde', JSON.stringify(val));
      else s.removeItem('becdra_active_kunde');
    },
    setActiveObjekt: val => {
      setterAufrufe++;
      reactState.activeObjekt = val;
      if (val) s.setItem('becdra_active_objekt', JSON.stringify(val));
      else s.removeItem('becdra_active_objekt');
    },
    setStartTime: val => {
      setterAufrufe++;
      reactState.startTime = val;
      if (val) s.setItem('becdra_starttime', val.toISOString());
      else s.removeItem('becdra_starttime');
    },
    setAnkunftTime: val => {
      setterAufrufe++;
      reactState.ankunftTime = val;
      if (val) s.setItem('becdra_ankunftzeit', val.toISOString());
      else s.removeItem('becdra_ankunftzeit');
    },
    setManuelleEndZeit: val => {
      setterAufrufe++;
      reactState.manuelleEndZeit = val;
      if (val) s.setItem('becdra_manuelle_endzeit', val);
      else s.removeItem('becdra_manuelle_endzeit');
    },
    setArbeitszeitStatus: val => {
      setterAufrufe++;
      reactState.arbeitszeitStatus = val;
      s.setItem('becdra_arbeitszeit', JSON.stringify(val));
    },
    setGefahreneKm: val => {
      setterAufrufe++;
      reactState.gefahreneKm = val;
      s.setItem('becdra_gefahrene_km', val);
    },
    setAccumulatedKm: val => {
      setterAufrufe++;
      reactState.accumulatedKm = val;
    },
    setWartungsMeldung: meldung => {
      reactState.wartungsMeldung = meldung;
    }
  };

  // 1. Fall: Lesefehler bei localStorage.getItem('becdra_saison_archiv') (nachdem becdra_history gelesen wurde)
  const origGet = s.getItem;
  s.getItem = k => {
    if (k === 'becdra_saison_archiv') throw new Error('StorageReadError');
    return origGet(k);
  };

  const lesefehlerErgebnis = api.synchronisiereWinterStateAusStorage(s, callbacks);
  assert.equal(lesefehlerErgebnis.ok, false);
  assert.equal(setterAufrufe, 0, 'Bei Lesefehler darf kein einziger React-State-Setter aufgerufen werden');
  assert.equal(reactState.history, bisherigerHistoryStand, 'Bisheriger React-State (history) muss erhalten bleiben');
  assert.equal(reactState.archivListe, bisherigerArchivStand, 'Bisheriger React-State (archivListe) muss erhalten bleiben');
  assert.equal(reactState.activeObjekt, bisherigerObjektStand, 'Bisheriger React-State (activeObjekt) muss erhalten bleiben');
  assert.equal(reactState.wartungsMeldung?.typ, 'fehler', 'Dauerhafte Fehlermeldung muss gesetzt sein');
  s.getItem = origGet;
  assert.deepEqual(Object.fromEntries(s.map), seed, 'Verbliebene Daten in localStorage dürfen nicht durch Ersatzwerte überschrieben worden sein');

  // 2. Fall: Parsefehler (beschädigtes JSON in becdra_active_objekt) darf weder becdra_history noch becdra_active_objekt überschreiben
  reactState.wartungsMeldung = null;
  s.setItem('becdra_active_objekt', '{ungueltiges_json');
  const parsefehlerErgebnis = api.synchronisiereWinterStateAusStorage(s, callbacks);
  assert.equal(parsefehlerErgebnis.ok, false);
  assert.equal(setterAufrufe, 0, 'Auch bei Parsefehler in einem späteren Schlüssel darf kein vorheriger Setter ausgelöst werden');
  assert.equal(reactState.activeObjekt, bisherigerObjektStand);
  assert.equal(s.getItem('becdra_active_objekt'), '{ungueltiges_json', 'Beschädigter Eintrag wurde nicht durch null/removeItem gelöscht');
  assert.equal(s.getItem('becdra_history'), seed.becdra_history);
  assert.equal(reactState.wartungsMeldung?.typ, 'fehler');

  // 3. Fall: Reguläre Synchronisierung bei gültigen Daten aktualisiert alle States fehlerfrei
  s.setItem('becdra_active_objekt', seed.becdra_active_objekt);
  const erfolgsErgebnis = api.synchronisiereWinterStateAusStorage(s, callbacks);
  assert.equal(erfolgsErgebnis.ok, true);
  assert.equal(setterAufrufe, 10);
  assert.deepEqual(reactState.history, bisherigerHistoryStand);
});

test('Während einer laufenden asynchronen Wartung kann keine zweite Bereinigung oder Rücknahme gestartet werden', async () => {
  const seed = createProductiveSeed();
  const s = storage(seed);
  const idbFactory = createFakeIndexedDbFactory();
  const basisIdb = api.erzeugeIndexedDbWinterSicherungSpeicher(idbFactory);

  let entblockeIdbGet;
  const verzögerterIdbSpeicher = {
    async getItem() {
      await new Promise(resolve => {
        entblockeIdbGet = resolve;
      });
      return basisIdb.getItem();
    },
    async setItem(v) {
      return basisIdb.setItem(v);
    },
    async removeItem() {
      return basisIdb.removeItem();
    }
  };

  // Starte erste asynchrone Bereinigung (wartet nun an verzögerterIdbSpeicher.getItem)
  const ersteBereinigungPromise = api.bereinigeWinterTestdatenAsync(s, verzögerterIdbSpeicher);
  assert.equal(api.istWinterWartungAktiv(), true);

  // Während die erste Wartung läuft, müssen parallele Bereinigungs- und Rücknahme-Aufrufe sofort unverändert abbrechen
  await assert.rejects(
    () => api.bereinigeWinterTestdatenAsync(s, basisIdb),
    err =>
      err instanceof api.WinterWartungsFehler &&
      err.datenStatus === 'unveraendert' &&
      err.message.includes('läuft bereits')
  );
  await assert.rejects(
    () => api.stelleWinterTestdatenWiederHerAsync(s, basisIdb),
    err =>
      err instanceof api.WinterWartungsFehler &&
      err.datenStatus === 'unveraendert' &&
      err.message.includes('läuft bereits')
  );
  assert.throws(
    () => api.bereinigeWinterTestdaten(s),
    err => err instanceof api.WinterWartungsFehler && err.datenStatus === 'unveraendert'
  );
  assert.throws(
    () => api.stelleWinterTestdatenWiederHer(s),
    err => err instanceof api.WinterWartungsFehler && err.datenStatus === 'unveraendert'
  );

  // Erste Bereinigung freigeben und regulär abschließen
  entblockeIdbGet();
  const ergebnis = await ersteBereinigungPromise;
  assert.equal(ergebnis.status, 'bereinigt');
  assert.equal(api.istWinterWartungAktiv(), false);

  // Danach ist die reguläre Rücknahme wieder möglich
  await api.stelleWinterTestdatenWiederHerAsync(s, basisIdb);
  assert.deepEqual(Object.fromEntries(s.map), seed);
});
