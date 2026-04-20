import React, { useEffect, useRef, useState } from 'react';
import './YandexLocationPicker.css';
import { geocodeAddress, loadYandexMapsApi, reverseGeocode } from '../utils/yandexMaps';
import { useI18n } from '../i18n/I18nProvider';

const DEFAULT_CENTER = [55.92986, 37.52036]; // МФТИ (Долгопрудный)
const DEFAULT_ZOOM = 15;
const MIN_ZOOM = 14;
const MAX_ZOOM = 17;

// Ограничение области карты: компактная зона вокруг кампуса МФТИ
const DOLGOPRUDNY_BOUNDS = [
  [55.922, 37.506],
  [55.937, 37.535]
];

const formatCoords = (coords) => {
  if (!Array.isArray(coords) || coords.length < 2) {
    return '';
  }

  return `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;
};

const isGeoDebugEnabled = () =>
  typeof window !== 'undefined' && (window.__DEBUG_GEO__ === true || process.env.REACT_APP_DEBUG_GEO === 'true');

const YANDEX_PROMO_TEXT_RE = /открыть\s+в\s+я(ндекс)?/i;

const hideYandexPromoNodes = (container) => {
  if (!container) {
    return;
  }

  const nodes = container.querySelectorAll('a, button, div, span');
  nodes.forEach((node) => {
    const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || !YANDEX_PROMO_TEXT_RE.test(text)) {
      return;
    }

    // Скрываем сам промо-узел и ближайший обертчик с абсолютным позиционированием.
    node.style.display = 'none';
    const wrapper = node.closest('div');
    if (wrapper) {
      wrapper.style.display = 'none';
    }
  });
};

const YandexLocationPicker = ({ onAddressChange, initialAddress = '' }) => {
  const { t } = useI18n();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onAddressChangeRef = useRef(onAddressChange);
  const promoObserverRef = useRef(null);
  const initialAddressRef = useRef(initialAddress);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    onAddressChangeRef.current = onAddressChange;
  }, [onAddressChange]);

  useEffect(() => {
    initialAddressRef.current = initialAddress;
  }, [initialAddress]);

  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      try {
        const ymaps = await loadYandexMapsApi();
        if (!isMounted || !mapContainerRef.current) {
          return;
        }

        mapRef.current = new ymaps.Map(
          mapContainerRef.current,
          {
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
            minZoom: MIN_ZOOM,
            maxZoom: MAX_ZOOM,
            controls: ['zoomControl']
          },
          {
            restrictMapArea: DOLGOPRUDNY_BOUNDS,
            yandexMapDisablePoiInteractivity: true,
            suppressMapOpenBlock: true
          }
        );

        hideYandexPromoNodes(mapContainerRef.current);
        promoObserverRef.current = new MutationObserver(() => {
          hideYandexPromoNodes(mapContainerRef.current);
        });
        promoObserverRef.current.observe(mapContainerRef.current, { childList: true, subtree: true });

        mapRef.current.behaviors.disable([
          'rightMouseButtonMagnifier'
        ]);

        const setMarkerCoords = (coords) => {
          if (!Array.isArray(coords) || coords.length < 2 || !mapRef.current) {
            return;
          }

          if (!markerRef.current) {
            markerRef.current = new ymaps.Placemark(coords);
            mapRef.current.geoObjects.add(markerRef.current);
          } else {
            markerRef.current.geometry.setCoordinates(coords);
          }
        };

        const initialAddressValue = typeof initialAddressRef.current === 'string' ? initialAddressRef.current.trim() : '';
        if (initialAddressValue) {
          const initialCoords = await geocodeAddress(initialAddressValue, { traceId: 'initial-profile-address' });
          if (initialCoords) {
            setMarkerCoords(initialCoords);
            mapRef.current.setCenter(initialCoords, Math.max(DEFAULT_ZOOM, 16));
          }
        }

        mapRef.current.events.add('click', async (event) => {
          const clickedCoords = event.get('coords');
          const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const fallbackAddress = formatCoords(clickedCoords);

          if (isGeoDebugEnabled()) {
            console.debug(`[geo:${traceId}] map click`, { clickedCoords, fallbackCoords: fallbackAddress || '<empty>' });
          }

          setMarkerCoords(clickedCoords);

          try {
            const address = await reverseGeocode(clickedCoords, { traceId });
            const normalizedAddress = typeof address === 'string' ? address.trim() : '';
            if (normalizedAddress && onAddressChangeRef.current) {
              if (isGeoDebugEnabled()) {
                console.debug(`[geo:${traceId}] onAddressChange`, { location: normalizedAddress });
              }
              onAddressChangeRef.current(normalizedAddress);
            } else if (isGeoDebugEnabled()) {
              console.warn(`[geo:${traceId}] address is empty, location is not updated`, {
                rawAddress: address,
                normalizedAddress,
                fallbackCoords: fallbackAddress || '<empty>'
              });
            }
          } catch (geocodeError) {
            console.error('Ошибка обратного геокодирования', geocodeError);

            if (isGeoDebugEnabled()) {
              console.error(`[geo:${traceId}] reverseGeocode exception`, geocodeError);
            }
          }
        });
      } catch (mapError) {
        if (isMounted) {
          setError(mapError.message || t('yandexMap.unavailable'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (promoObserverRef.current) {
        promoObserverRef.current.disconnect();
        promoObserverRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.destroy();
      }
    };
  }, []);

  if (error) {
    return <p className="yandex-map-error">{error}</p>;
  }

  return (
    <div className="yandex-map-picker">
      <div ref={mapContainerRef} className="yandex-map-container" />
      {loading && <p className="yandex-map-hint">{t('yandexMap.loading')}</p>}
      {!loading && <p className="yandex-map-hint">{t('yandexMap.clickHint')}</p>}
    </div>
  );
};

export default YandexLocationPicker;
