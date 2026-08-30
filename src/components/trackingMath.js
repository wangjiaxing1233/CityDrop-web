// Pure geometry for the tracking map, split out from TrackingMap.js so it
// can be unit-tested without pulling in Leaflet or the network. TrackingMap
// re-imports everything here.

// Copied verbatim from the backend's data.sql seed (coord_x = lat,
// coord_y = lng, per StationEntity/DeliveryService) -- these need to stay in
// sync by hand since there's no endpoint exposing them.
export const STATION_COORDS = {
  1: { lat: 37.777338, lng: -122.464903 },
  2: { lat: 37.774907, lng: -122.412962 },
  3: { lat: 37.731199, lng: -122.429724 },
};

export function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Walks the route's points and linearly interpolates the lat/lng at
// `progress` (0..1) of the way along its total length -- not just snapping
// to the nearest point, so the marker moves smoothly between renders.
export function pointAtProgress(points, progress) {
  if (points.length === 1) return points[0];
  const segmentLengths = points
    .slice(0, -1)
    .map((p, i) => haversineMeters(p, points[i + 1]));
  const total = segmentLengths.reduce((a, b) => a + b, 0);
  let target = Math.max(0, Math.min(1, progress)) * total;

  for (let i = 0; i < segmentLengths.length; i++) {
    if (target <= segmentLengths[i] || i === segmentLengths.length - 1) {
      const t = segmentLengths[i] === 0 ? 0 : target / segmentLengths[i];
      const a = points[i];
      const b = points[i + 1];
      return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
    }
    target -= segmentLengths[i];
  }
  return points[points.length - 1];
}
