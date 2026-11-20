import { el } from './dom.js';
import { renderFacilityCard } from './card.js';
import { statusLabel } from './format.js';
import { facilityName, shopName, t } from './i18n.js';
import { renderShopCard } from './shop-card.js';

const STATUS_COLORS = { open: '#2e7d32', later: '#f9a825', closed: '#9e9e9e', paused: '#c62828' };
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const MAX_ZOOM = 19;
// これより拡大したときだけ施設名を出す（全体表示では名前が重なって読めないため）
const LABEL_MIN_ZOOM = 17;
const LEGEND_STATUSES = ['open', 'later', 'closed', 'paused'];
const SHOP_ICON_SIZE = 22;
const SHOP_PANE = 'shops';
const SHOP_PANE_Z_INDEX = '350';
// 店ピンの中身はナイフとフォークの固定の印だけ（データは入れない）
const SHOP_ICON_HTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M7 2v8a2 2 0 0 0 1.5 1.94V22h2V11.94A2 2 0 0 0 12 10V2h-1.5v6h-1V2h-1v6h-1V2H7zm9.5 0C14.6 2 13.5 4.2 13.5 7v6h2v9h2V2h-1z"/></svg>';

function renderLegend() {
  return el('div', { className: 'map-legend' }, [
    el('p', { className: 'legend-title', text: t('map.legend') }),
    el('ul', {}, LEGEND_STATUSES.map((status) => el('li', {}, [
      el('span', { className: `legend-dot status-${status}`, 'aria-hidden': 'true' }),
      statusLabel(status),
    ]))),
    el('ul', { className: 'legend-shops', hidden: true }, [
      el('li', {}, [el('span', { className: 'legend-square shop-open', 'aria-hidden': 'true' }), t('legend.shop')]),
      el('li', {}, [el('span', { className: 'legend-square shop-unknown', 'aria-hidden': 'true' }), t('legend.shopUnknown')]),
    ]),
  ]);
}

export function createMapView({ mapElement, cardElement }) {
  const L = globalThis.L;
  const map = L.map(mapElement);
  L.tileLayer(TILE_URL, { maxZoom: MAX_ZOOM, attribution: ATTRIBUTION }).addTo(map);
  // 温泉のピン（overlay pane、z-index 400）が店のピンに隠れないよう、店は下の層に描く
  map.createPane(SHOP_PANE).style.zIndex = SHOP_PANE_Z_INDEX;
  const pinLayer = L.layerGroup().addTo(map);
  const routeLayer = L.layerGroup().addTo(map);
  let hasFitted = false;

  const legendElement = renderLegend();
  const legend = L.control({ position: 'bottomleft' });
  legend.onAdd = () => legendElement;
  legend.addTo(map);
  map.on('zoomend', () => mapElement.classList.toggle('show-labels', map.getZoom() >= LABEL_MIN_ZOOM));

  function hideCard() {
    cardElement.hidden = true;
    cardElement.replaceChildren();
  }

  function showCard(item, { originLabel, liveAt }) {
    const card = item.shop
      ? renderShopCard(item, { originLabel })
      : renderFacilityCard(item, { originLabel, liveAt, exterior: 'inline' });
    cardElement.replaceChildren(
      el('button', { type: 'button', className: 'card-close', 'aria-label': t('card.close'), text: '×', onClick: hideCard }),
      card,
    );
    cardElement.hidden = false;
  }

  function addLabel(marker, name) {
    return marker.bindTooltip(el('span', { text: name }), { direction: 'top', permanent: true, className: 'pin-label', offset: [0, -10] });
  }

  function addPin(item, cardOptions) {
    const marker = L.circleMarker([item.facility.lat, item.facility.lng], {
      radius: 11, color: '#ffffff', weight: 2, fillColor: STATUS_COLORS[item.status], fillOpacity: 1,
      className: `pin pin-${item.status} pin-id-${item.facility.id}`,
    });
    addLabel(marker, facilityName(item.facility))
      .on('click', () => showCard(item, cardOptions))
      .addTo(pinLayer);
  }

  function addShopPin(item, cardOptions) {
    const marker = L.marker([item.shop.lat, item.shop.lng], {
      icon: L.divIcon({
        className: `shop-pin shop-${item.status} shop-id-${item.shop.id}`,
        html: SHOP_ICON_HTML,
        iconSize: [SHOP_ICON_SIZE, SHOP_ICON_SIZE],
      }),
      pane: SHOP_PANE,
      // Leaflet が icon の title に入れる（読み上げで店名が分かるように）
      title: shopName(item.shop),
    });
    addLabel(marker, shopName(item.shop))
      .on('click', () => showCard(item, cardOptions))
      .addTo(pinLayer);
  }

  function render({ items, fitPoints, origin, originLabel, liveAt = null, showOriginDot, showShopLegend = false }) {
    pinLayer.clearLayers();
    items.forEach((item) => (item.shop ? addShopPin : addPin)(item, { originLabel, liveAt }));
    legendElement.querySelector('.legend-shops').hidden = !showShopLegend;
    if (showOriginDot) {
      L.circleMarker([origin.lat, origin.lng], {
        radius: 8, color: '#ffffff', weight: 3, fillColor: '#1565c0', fillOpacity: 1, className: 'me',
      }).addTo(pinLayer);
    }
    // 最初の表示範囲は、表示中の種類に関係なく歩いて行ける温泉で決める（温泉を消していても地図が出るように）
    if (!hasFitted && fitPoints.length > 0) {
      map.fitBounds(L.latLngBounds(fitPoints.map((point) => [point.lat, point.lng])), { padding: [24, 24] });
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
