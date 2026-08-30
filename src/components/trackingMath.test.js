// The map's marker position is pure math: great-circle distance between two
// lat/lng points, and linear interpolation along a multi-segment route at a
// 0..1 progress value. A wrong sign or a bad clamp here puts the robot in
// the ocean, and it's the kind of thing you can't eyeball on a map. These
// run with no Leaflet and no network.
import { haversineMeters, pointAtProgress, STATION_COORDS } from "./trackingMath";

describe("haversineMeters", () => {
  it("is zero between a point and itself", () => {
    expect(haversineMeters({ lat: 37.77, lng: -122.42 }, { lat: 37.77, lng: -122.42 })).toBe(0);
  });

  it("matches the ~111.2 km per degree of latitude near the equator", () => {
    expect(haversineMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111195, 0);
  });

  it("is symmetric", () => {
    const a = STATION_COORDS[1];
    const b = STATION_COORDS[3];
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });

  it("gives a sane real-world distance between two SF stations (a few km)", () => {
    const meters = haversineMeters(STATION_COORDS[1], STATION_COORDS[2]);
    expect(meters).toBeGreaterThan(3000);
    expect(meters).toBeLessThan(8000);
  });
});

describe("pointAtProgress", () => {
  const straight = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 2 },
  ];

  it("returns the only point for a single-point route", () => {
    expect(pointAtProgress([{ lat: 5, lng: 9 }], 0.5)).toEqual({ lat: 5, lng: 9 });
  });

  it("returns the endpoints at progress 0 and 1", () => {
    expect(pointAtProgress(straight, 0)).toEqual({ lat: 0, lng: 0 });
    expect(pointAtProgress(straight, 1)).toEqual({ lat: 0, lng: 2 });
  });

  it("interpolates linearly along a straight segment", () => {
    expect(pointAtProgress(straight, 0.25)).toEqual({ lat: 0, lng: 0.5 });
    expect(pointAtProgress(straight, 0.5)).toEqual({ lat: 0, lng: 1 });
  });

  it("clamps out-of-range progress to the endpoints", () => {
    expect(pointAtProgress(straight, -1)).toEqual({ lat: 0, lng: 0 });
    expect(pointAtProgress(straight, 2)).toEqual({ lat: 0, lng: 2 });
  });

  it("walks across multiple equal-length segments", () => {
    const route = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 0, lng: 2 },
    ];
    // Halfway along the whole route lands exactly on the middle vertex.
    expect(pointAtProgress(route, 0.5)).toEqual({ lat: 0, lng: 1 });
    // Three-quarters is the midpoint of the second segment.
    expect(pointAtProgress(route, 0.75)).toEqual({ lat: 0, lng: 1.5 });
  });
});
