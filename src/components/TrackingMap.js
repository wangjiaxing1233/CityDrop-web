import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { STATION_COORDS, pointAtProgress } from "./trackingMath";

// A real map (OpenStreetMap tiles via Leaflet), showing the package's route
// from its station to the destination, with a marker that moves along the
// route as the order's status advances. Free, no API key needed -- swap the
// tile/geocoding/routing URLs for a paid provider if this ever needs to
// handle real production load.
//
// The backend never returns coordinates for an order -- only stationId (an
// int) and destination (a plain address string) -- so this component:
//   - looks up the station's real lat/lng from a small hardcoded table
//     (station_id/coord_x/coord_y in data.sql; only 3 stations exist and
//     they essentially never change, so a new backend endpoint just to
//     expose 3 fixed points isn't worth it)
//   - geocodes the destination address itself, client-side, via Nominatim
//   - for ROBOT, fetches a real road route from OSRM (matches
//     DeliveryService's own "drives the real road network" model); for
//     DRONE, just draws a straight line (matches the backend's fixed-speed
//     straight-line drone model -- same distinction, just mirrored visually)
//
// There's still no live vehicle-position feed from the backend (see
// TrackingMap's original design note) -- the marker's position along the
// route is still an estimate driven by the order's status, same as before.
// This only replaces the *background* with a real map; it doesn't change
// what "progress" means.

// STATION_COORDS and the route geometry (haversineMeters / pointAtProgress)
// live in ./trackingMath so they can be unit-tested without Leaflet.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OSRM_URL = "https://router.project-osrm.org/route/v1";

async function geocodeAddress(address) {
  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Geocoding request failed");
  const results = await response.json();
  if (!results.length) throw new Error("Address not found");
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

async function fetchRoadRoute(from, to) {
  const url = `${OSRM_URL}/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Routing request failed");
  const data = await response.json();
  const coords = data.routes?.[0]?.geometry?.coordinates;
  if (!coords || !coords.length) throw new Error("No route found");
  return coords.map(([lng, lat]) => ({ lat, lng }));
}

// Emoji-as-marker avoids Leaflet's default-icon asset path, which needs
// extra webpack config to work under Create React App.
function emojiIcon(emoji, size) {
  return L.divIcon({
    html: `<div style="font-size:${size}px; line-height:1;">${emoji}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// All 3 stations get shown on every order's map for context, not just the
// one dispatching this particular package -- the one actually in use here
// is drawn at full size/opacity with the route running through it; the
// other two are smaller/dimmer so the eye still lands on what matters.
function stationIcon(label, active) {
  const size = active ? 26 : 18;
  return L.divIcon({
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; opacity:${active ? 1 : 0.6};">
        <div style="font-size:${size}px; line-height:1;">🏢</div>
        <div style="font-size:10px; font-weight:700; color:#1E2761; background:#ffffffdd; padding:1px 5px; border-radius:4px; margin-top:2px; white-space:nowrap;">${label}</div>
      </div>
    `,
    className: "",
    iconSize: [size, size + 16],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapPlaceholder({ text }) {
  return (
    <div
      style={{
        height: 220,
        borderRadius: 12,
        background: "#eef2f7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#7c8aa5",
        fontSize: 13,
      }}
    >
      {text}
    </div>
  );
}

// progress: 0 (still at station) .. 1 (delivered), same meaning as before.
// destination/stationId/vehicle are all real fields already present on
// every order (mock or real backend alike).
export function TrackingMap({ progress, vehicle, destination, stationId }) {
  const stationCoords = STATION_COORDS[stationId];
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    if (!stationCoords || !destination) {
      setState({ status: "failed" });
      return undefined;
    }

    (async () => {
      try {
        const destCoords = await geocodeAddress(destination);
        if (cancelled) return;

        let routePoints;
        if (vehicle === "DRONE") {
          routePoints = [stationCoords, destCoords];
        } else {
          try {
            routePoints = await fetchRoadRoute(stationCoords, destCoords);
          } catch (routingErr) {
            // The free OSRM demo instance being flaky shouldn't sink the
            // whole map -- a straight line is still a reasonable fallback.
            routePoints = [stationCoords, destCoords];
          }
        }
        if (!cancelled) setState({ status: "ready", destCoords, routePoints });
      } catch (err) {
        if (!cancelled) setState({ status: "failed" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [destination, stationId, vehicle, stationCoords]);

  if (state.status === "loading") return <MapPlaceholder text="Loading map…" />;
  if (state.status === "failed") return <MapPlaceholder text="Map unavailable right now." />;

  const { routePoints, destCoords } = state;
  const vehiclePos = pointAtProgress(routePoints, progress);
  // Bounds include every station, not just this route's two endpoints, so
  // all 3 stay visible on screen -- gives a sense of the whole network,
  // not just this one delivery in isolation.
  const bounds = L.latLngBounds([
    ...routePoints.map((p) => [p.lat, p.lng]),
    ...Object.values(STATION_COORDS).map((p) => [p.lat, p.lng]),
  ]);

  return (
    <div style={{ height: 220, borderRadius: 12, overflow: "hidden" }}>
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [30, 30] }}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Polyline
          positions={routePoints.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: "#1E2761", weight: 4, opacity: 0.85 }}
        />
        {Object.entries(STATION_COORDS).map(([id, coords]) => (
          <Marker
            key={id}
            position={[coords.lat, coords.lng]}
            icon={stationIcon("Station " + id, Number(id) === stationId)}
          />
        ))}
        <Marker position={[destCoords.lat, destCoords.lng]} icon={emojiIcon("📍", 26)} />
        <Marker
          position={[vehiclePos.lat, vehiclePos.lng]}
          icon={emojiIcon(vehicle === "DRONE" ? "🛸" : "🤖", 30)}
        />
      </MapContainer>
    </div>
  );
}
