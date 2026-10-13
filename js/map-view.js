import { el } from './dom.js';
import { renderFacilityCard } from './card.js';
import { statusLabel } from './format.js';
import { facilityName, t } from './i18n.js';

const STATUS_COLORS = { open: '#2e7d32', later: '#f9a825', closed: '#9e9e9e', paused: '#c62828' };
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const MAX_ZOOM = 19;
// これより拡大したときだけ施設名を出す（全体表示では名前が重なって読めないため）
const LABEL_MIN_ZOOM = 17;
const LEGEND_STATUSES = ['open', 'later', 'closed', 'paused'];

function renderLegend() {
  return el('div', { className: 'map-legend' }, [
    el('p', { className: 'legend-title', text: t('map.legend') }),
    el('ul', {}, LEGEND_STATUSES.map((status) => el('li', {}, [
      el('span', { className: `legend-dot status-${status}`, 'aria-hidden': 'true' }),
      statusLabel(status),
    ]))),
  ]);
}

export function createMapView({ mapElement, cardElement }) {
  const L = globalThis.L;
  const map = L.map(mapElement);
  L.tileLayer(TILE_URL, { maxZoom: MAX_ZOOM, attribution: ATTRIBUTION }).addTo(map);
  const pinLayer = L.layerGroup().addTo(map);
  const routeLayer = L.layerGroup().addTo(map);
  let hasFitted = false;

  const legend = L.control({ position: 'bottomleft' });
  legend.onAdd = renderLegend;
  legend.addTo(map);
  map.on('zoomend', () => mapElement.classList.toggle('show-labels', map.getZoom() >= LABEL_MIN_ZOOM));

  function hideCard() {
    cardElement.hidden = true;
    cardElement.replaceChildren();
  }

  function showCard(item, { originLabel, liveAt }) {
    cardElement.replaceChildren(
      el('button', { type: 'button', className: 'card-close', 'aria-label': t('card.close'), text: '×', onClick: hideCard }),
      renderFacilityCard(item, { originLabel, liveAt, exterior: 'inline' }),
    );
    cardElement.hidden = false;
  }

  function addPin(item, cardOptions) {
    L.circleMarker([item.facility.lat, item.facility.lng], {
      radius: 11, color: '#ffffff', weight: 2, fillColor: STATUS_COLORS[item.status], fillOpacity: 1,
      className: `pin pin-${item.status} pin-id-${item.facility.id}`,
    })
      .bindTooltip(el('span', { text: facilityName(item.facility) }), { direction: 'top', permanent: true, className: 'pin-label', offset: [0, -10] })
      .on('click', () => showCard(item, cardOptions))
      .addTo(pinLayer);
  }

  function render({ items, origin, originLabel, liveAt = null, showOriginDot }) {
    pinLayer.clearLayers();
    items.forEach((item) => addPin(item, { originLabel, liveAt }));
    if (showOriginDot) {
      L.circleMarker([origin.lat, origin.lng], {
        radius: 8, color: '#ffffff', weight: 3, fillColor: '#1565c0', fillOpacity: 1, className: 'me',
      }).addTo(pinLayer);
    }
    if (!hasFitted && items.length > 0) {
      const walkableItems = items.filter((item) => item.walk !== null);
      const fitItems = walkableItems.length > 0 ? walkableItems : items;
      map.fitBounds(L.latLngBounds(fitItems.map((item) => [item.facility.lat, item.facility.lng])), { padding: [24, 24] });
      hasFitted = true;
    }
  }

  function showPlan({ plan, origin, goal }) {
    routeLayer.clearLayers();
    hideCard();
    const points = [origin, ...plan.stops.map((stop) => stop.facility), ...(goal ? [goal] : [])]
      .map((point) => [point.lat, point.lng]);
    L.polyline(points, { color: '#6d4c41', weight: 4, dashArray: '8 6', className: 'route-line' }).addTo(routeLayer);
    plan.stops.forEach((stop, index) => {
      L.marker([stop.facility.lat, stop.facility.lng], {
        icon: L.divIcon({ className: 'route-number', html: String(index + 1), iconSize: [26, 26] }),
        interactive: false,
      }).addTo(routeLayer);
    });
    map.fitBounds(L.latLngBounds(points), { padding: [32, 32] });
  }

  function refreshSize() {
    map.invalidateSize();
  }

  return { render, showPlan, refreshSize };
}
