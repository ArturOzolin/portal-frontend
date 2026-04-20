const YANDEX_MAPS_BASE_URL = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';

let ymapsPromise;

const isGeoDebugEnabled = () =>
  typeof window !== 'undefined' && (window.__DEBUG_GEO__ === true || process.env.REACT_APP_DEBUG_GEO === 'true');

const geoDebugLog = (traceId, message, payload) => {
  if (!isGeoDebugEnabled()) {
    return;
  }

  const prefix = traceId ? `[geo:${traceId}]` : '[geo]';
  if (payload === undefined) {
    console.debug(prefix, message);
    return;
  }

  console.debug(prefix, message, payload);
};

const getComponent = (components = [], kinds = []) => {
  const found = components.find((component) => kinds.includes(component.kind));
  return found?.name || '';
};

const hasComponentKind = (components = [], kinds = []) =>
  components.some((component) => kinds.includes(component.kind));

const getGeoObjectMetaData = (geoObject) =>
  geoObject?.properties?.get?.('metaDataProperty')?.GeocoderMetaData;

const getGeoObjectComponents = (geoObject) => getGeoObjectMetaData(geoObject)?.Address?.Components || [];

const getGeoObjectPrecision = (geoObject) => String(getGeoObjectMetaData(geoObject)?.precision || '').toLowerCase();

const hasHouseComponent = (components = []) => hasComponentKind(components, ['house', 'premise', 'building']);

const scoreGeoObject = (geoObject, address) => {
  if (!address) {
    return -1;
  }

  const components = getGeoObjectComponents(geoObject);
  const precision = getGeoObjectPrecision(geoObject);
  let score = 0;

  if (hasHouseComponent(components)) {
    score += 2;
  }

  if (precision === 'exact' || precision === 'number') {
    score += 2;
  } else if (precision === 'near') {
    score += 1;
  }

  return score;
};

const normalizePart = (value, prefixes = []) => {
  if (!value) {
    return '';
  }

  const normalized = String(value)
    .replace(/\s+/g, ' ')
    .trim();

  const stripped = prefixes.reduce((acc, prefix) => {
    const regex = new RegExp(`^${prefix}\\.?\\s*`, 'i');
    return acc.replace(regex, '');
  }, normalized);

  return stripped.trim();
};

const formatStructuredAddress = (geoObject) => {
  if (!geoObject) {
    return '';
  }

  const metaData = getGeoObjectMetaData(geoObject);
  const components = metaData?.Address?.Components || [];

  const city = normalizePart(
    getComponent(components, ['locality']) || getComponent(components, ['district']) || getComponent(components, ['province']),
    ['г', 'город']
  );
  const street = normalizePart(getComponent(components, ['street']), ['ул', 'улица']);
  const house = normalizePart(
    getComponent(components, ['house']) || getComponent(components, ['premise']) || getComponent(components, ['building']),
    ['д', 'дом']
  );

  const formattedParts = [
    city ? `г. ${city}` : '',
    street ? `ул. ${street}` : '',
    house ? `д. ${house}` : ''
  ].filter(Boolean);

  return (
    formattedParts.join(', ') ||
    metaData?.Address?.formatted ||
    geoObject.getAddressLine?.() ||
    geoObject.properties?.get?.('text') ||
    metaData?.text ||
    ''
  );
};

const geocodeBestAddress = async (ymaps, coords, options = {}, debugContext = {}) => {
  const { requireHouse, ...geocodeOptions } = options;
  const { traceId = '', stage = 'unknown' } = debugContext;

  geoDebugLog(traceId, `${stage}: start geocodeBestAddress`, { coords, geocodeOptions, requireHouse: Boolean(requireHouse) });

  const response = await ymaps.geocode(coords, geocodeOptions);
  const geoObjects = response.geoObjects || [];
  const geoObjectsLength = typeof geoObjects.getLength === 'function' ? geoObjects.getLength() : 0;

  geoDebugLog(traceId, `${stage}: geocode response size`, { count: geoObjectsLength });

  let bestAddress = '';
  let bestScore = -1;

  for (let index = 0; index < geoObjects.getLength(); index += 1) {
    const geoObject = geoObjects.get(index);
    const components = getGeoObjectComponents(geoObject);
    const metaData = getGeoObjectMetaData(geoObject);

    if (requireHouse && !hasHouseComponent(components)) {
      geoDebugLog(traceId, `${stage}: skip result without house`, {
        index,
        precision: getGeoObjectPrecision(geoObject),
        rawComponents: components,
        metaDataSnapshot: {
          precision: String(metaData?.precision || '').toLowerCase() || '<empty>',
          kind: metaData?.kind || '<empty>',
          text: metaData?.text || '<empty>',
          formatted: metaData?.Address?.formatted || '<empty>'
        }
      });
      continue;
    }

    const address = formatStructuredAddress(geoObject);
    const score = scoreGeoObject(geoObject, address);

    geoDebugLog(traceId, `${stage}: candidate`, {
      index,
      score,
      precision: getGeoObjectPrecision(geoObject),
      hasHouse: hasHouseComponent(components),
      address: address || '<empty>',
      rawComponents: components,
      metaDataSnapshot: {
        precision: String(metaData?.precision || '').toLowerCase() || '<empty>',
        kind: metaData?.kind || '<empty>',
        text: metaData?.text || '<empty>',
        formatted: metaData?.Address?.formatted || '<empty>'
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestAddress = address;
    }
  }

  geoDebugLog(traceId, `${stage}: bestAddress`, { bestScore, bestAddress: bestAddress || '<empty>' });
  return bestAddress;
};

export const loadYandexMapsApi = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Yandex Maps API доступен только в браузере'));
  }

  if (window.ymaps) {
    return Promise.resolve(window.ymaps);
  }

  if (ymapsPromise) {
    return ymapsPromise;
  }

  const apiKey = process.env.REACT_APP_YANDEX_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error('Добавьте REACT_APP_YANDEX_MAPS_API_KEY в .env.local'));
  }

  ymapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-yandex-maps="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        window.ymaps.ready(() => resolve(window.ymaps));
      });
      existingScript.addEventListener('error', () => reject(new Error('Не удалось загрузить Yandex Maps API')));
      return;
    }

    const script = document.createElement('script');
    script.src = `${YANDEX_MAPS_BASE_URL}&apikey=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;
    script.dataset.yandexMaps = 'true';

    script.onload = () => {
      window.ymaps.ready(() => resolve(window.ymaps));
    };

    script.onerror = () => reject(new Error('Не удалось загрузить Yandex Maps API'));

    document.head.appendChild(script);
  });

  return ymapsPromise;
};

export const reverseGeocode = async (coords, debugContext = {}) => {
  const { traceId = '' } = debugContext;
  geoDebugLog(traceId, 'reverseGeocode start', { coords });

  const ymaps = await loadYandexMapsApi();

  const houseAddress = await geocodeBestAddress(
    ymaps,
    coords,
    { kind: 'house', results: 10, requireHouse: true },
    { traceId, stage: 'house' }
  );
  if (houseAddress) {
    geoDebugLog(traceId, 'reverseGeocode return from house stage', { address: houseAddress });
    return houseAddress;
  }

  geoDebugLog(traceId, 'house stage returned empty');

  const fallbackAddress = await geocodeBestAddress(ymaps, coords, { results: 10 }, { traceId, stage: 'fallback' });
  if (fallbackAddress) {
    geoDebugLog(traceId, 'reverseGeocode return from fallback stage', { address: fallbackAddress });
    return fallbackAddress;
  }

  geoDebugLog(traceId, 'fallback stage returned empty');

  const response = await ymaps.geocode(coords, { results: 1 });
  const firstGeoObject = response.geoObjects?.get?.(0);
  const metaData = firstGeoObject?.properties?.get?.('metaDataProperty')?.GeocoderMetaData;
  const rawComponents = metaData?.Address?.Components || [];

  geoDebugLog(traceId, 'lastChance raw geocoder data', {
    hasFirstGeoObject: Boolean(firstGeoObject),
    precision: String(metaData?.precision || '').toLowerCase() || '<empty>',
    kind: metaData?.kind || '<empty>',
    text: metaData?.text || '<empty>',
    formatted: metaData?.Address?.formatted || '<empty>',
    hasAddressDetails: Boolean(metaData?.AddressDetails),
    rawComponents
  });

  const lastChanceAddress = (
    metaData?.Address?.formatted ||
    firstGeoObject?.getAddressLine?.() ||
    firstGeoObject?.properties?.get?.('text') ||
    metaData?.text ||
    ''
  );

  if (!lastChanceAddress) {
    geoDebugLog(traceId, 'reverseGeocode finished with empty string', {
      reason: 'all geocode stages returned empty',
      hasFirstGeoObject: Boolean(firstGeoObject),
      geocoderPrecision: String(metaData?.precision || '').toLowerCase() || '<empty>',
      geocoderKind: metaData?.kind || '<empty>',
      geocoderText: metaData?.text || '<empty>',
      geocoderFormatted: metaData?.Address?.formatted || '<empty>',
      rawComponents
    });
  } else {
    geoDebugLog(traceId, 'reverseGeocode return from lastChance stage', { address: lastChanceAddress });
  }

  return lastChanceAddress;
};

export const geocodeAddress = async (address, debugContext = {}) => {
  const normalizedAddress = typeof address === 'string' ? address.trim() : '';
  if (!normalizedAddress) {
    return null;
  }

  const { traceId = '' } = debugContext;
  geoDebugLog(traceId, 'geocodeAddress start', { address: normalizedAddress });

  try {
    const ymaps = await loadYandexMapsApi();
    const response = await ymaps.geocode(normalizedAddress, { results: 1 });
    const geoObject = response.geoObjects?.get?.(0);
    const coords = geoObject?.geometry?.getCoordinates?.();

    if (Array.isArray(coords) && coords.length >= 2) {
      geoDebugLog(traceId, 'geocodeAddress success', { coords });
      return coords;
    }

    geoDebugLog(traceId, 'geocodeAddress empty result');
    return null;
  } catch (error) {
    geoDebugLog(traceId, 'geocodeAddress error', { message: error?.message || 'unknown' });
    return null;
  }
};
