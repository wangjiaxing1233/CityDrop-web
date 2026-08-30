// Runs once before the whole Jest suite (Create React App wires this file in
// automatically). Two jobs: load jest-dom's matchers, and polyfill the
// browser APIs that antd v5 and Leaflet touch on import but jsdom doesn't
// implement — without these, rendering almost any antd component throws.
import "@testing-library/jest-dom";

// antd's responsive observers (Grid, Descriptions, Table...) call matchMedia.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// antd's Spin/Watermark and rc-motion use ResizeObserver.
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom has no layout engine, so these are no-ops that just need to exist.
window.scrollTo = window.scrollTo || (() => {});
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
