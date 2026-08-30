// TrackingMap has no backend coordinates to work from: it looks the station
// up in a hardcoded table, geocodes the destination via Nominatim, and (for
// ROBOT) pulls a road route from OSRM, falling back to a straight line when
// routing is down. These tests cover the loading/failed/ready states and
// the ROBOT-vs-DRONE branching, with react-leaflet stubbed (it needs a real
// browser) and the two HTTP services mocked.
import React from "react";
import { render, screen } from "@testing-library/react";
import { TrackingMap } from "./TrackingMap";

jest.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: () => <div data-testid="marker" />,
  Polyline: () => <div data-testid="polyline" />,
}));

jest.mock("leaflet", () => ({
  __esModule: true,
  default: { divIcon: () => ({}), latLngBounds: () => ({}) },
}));

const geocodeHit = {
  ok: true,
  json: async () => [{ lat: "37.7900", lon: "-122.4000" }],
};
const osrmHit = {
  ok: true,
  json: async () => ({
    routes: [
      {
        geometry: {
          coordinates: [
            [-122.464903, 37.777338],
            [-122.43, 37.783],
            [-122.4, 37.79],
          ],
        },
      },
    ],
  }),
};

function mockFetch({ geocode = geocodeHit, osrm = osrmHit } = {}) {
  global.fetch = jest.fn((url) => {
    const u = String(url);
    if (u.includes("nominatim")) return Promise.resolve(geocode);
    if (u.includes("osrm") || u.includes("project-osrm")) return Promise.resolve(osrm);
    return Promise.reject(new Error("unexpected fetch: " + u));
  });
}

afterEach(() => {
  jest.clearAllMocks();
  delete global.fetch;
});

it("shows a loading placeholder before the geocode resolves", async () => {
  mockFetch();
  render(<TrackingMap progress={0.5} vehicle="DRONE" destination="1 Main St" stationId={1} />);
  expect(screen.getByText(/Loading map/)).toBeInTheDocument();
  // let the geocode settle so the trailing setState lands inside act()
  await screen.findByTestId("map-container");
});

it("shows 'Map unavailable' for a station id that isn't in the coordinate table", async () => {
  mockFetch();
  render(<TrackingMap progress={0} vehicle="DRONE" destination="1 Main St" stationId={99} />);
  expect(await screen.findByText(/Map unavailable/)).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});

it("shows 'Map unavailable' when there is no destination to geocode", async () => {
  mockFetch();
  render(<TrackingMap progress={0} vehicle="ROBOT" destination="" stationId={1} />);
  expect(await screen.findByText(/Map unavailable/)).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});

it("for DRONE, geocodes only and draws a straight line (no routing call)", async () => {
  mockFetch();
  render(<TrackingMap progress={0.5} vehicle="DRONE" destination="1 Main St" stationId={1} />);

  expect(await screen.findByTestId("map-container")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(String(fetch.mock.calls[0][0])).toContain("nominatim");
});

it("for ROBOT, geocodes and then fetches a road route from OSRM", async () => {
  mockFetch();
  render(<TrackingMap progress={0.4} vehicle="ROBOT" destination="1 Main St" stationId={2} />);

  expect(await screen.findByTestId("map-container")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(String(fetch.mock.calls[1][0])).toContain("project-osrm");
});

it("for ROBOT, still renders the map (straight-line fallback) when routing fails", async () => {
  mockFetch({ osrm: { ok: false, status: 503, json: async () => ({}) } });
  render(<TrackingMap progress={0.4} vehicle="ROBOT" destination="1 Main St" stationId={2} />);

  expect(await screen.findByTestId("map-container")).toBeInTheDocument();
  expect(screen.queryByText(/Map unavailable/)).not.toBeInTheDocument();
});

it("shows 'Map unavailable' when geocoding fails", async () => {
  mockFetch({ geocode: { ok: false, status: 500, json: async () => [] } });
  render(<TrackingMap progress={0} vehicle="DRONE" destination="nowhere" stationId={1} />);

  expect(await screen.findByText(/Map unavailable/)).toBeInTheDocument();
});

it("shows 'Map unavailable' when the address can't be found (empty geocode result)", async () => {
  mockFetch({ geocode: { ok: true, json: async () => [] } });
  render(<TrackingMap progress={0} vehicle="DRONE" destination="nowhere" stationId={1} />);

  expect(await screen.findByText(/Map unavailable/)).toBeInTheDocument();
});
