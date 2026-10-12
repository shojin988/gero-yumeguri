export const DETOUR_FACTOR = 1.4;
export const WALK_METERS_PER_MINUTE = 80;
export const FAR_FROM_STATION_METERS = 5000;
export const GEOLOCATION_PERMISSION_DENIED = 1;

const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function distanceMeters(a, b) {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function walkMinutes(a, b) {
  return Math.ceil((distanceMeters(a, b) * DETOUR_FACTOR) / WALK_METERS_PER_MINUTE);
}

export function positionAfterError(previous, errorCode) {
  return errorCode === GEOLOCATION_PERMISSION_DENIED ? null : previous;
}

export function resolveOrigin(position, station) {
  if (!position) {
    return { point: station, isFallback: true, reason: 'unavailable' };
  }
  if (distanceMeters(position, station) >= FAR_FROM_STATION_METERS) {
    return { point: station, isFallback: true, reason: 'far' };
  }
  return { point: position, isFallback: false, reason: null };
}
