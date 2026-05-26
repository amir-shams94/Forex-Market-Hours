// Renders an SVG silhouette of a country into a target container.
// Path data lives in country-paths.js (Robinson projection, viewBox 0 0 2000 1001).
// We compute the bounding box once per country using getBBox() and cache it so
// repeated renders are instant.

import { COUNTRY_PATHS, COUNTRY_VIEWBOX } from './country-paths.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const bboxCache = new Map();

/**
 * Render an SVG silhouette of the country into the given container.
 * The SVG fills the container's width while preserving aspect ratio.
 *
 * @param {Element} container
 * @param {string} countryCode ISO 3166-1 alpha-2 (e.g. "GB")
 * @param {object} [options]
 * @param {string} [options.fill='currentColor']
 * @param {string} [options.stroke='none']
 * @param {number} [options.padding=0.1] Padding ratio relative to the bbox
 */
export function renderCountryMap(container, countryCode, options = {}) {
  if (!container) return null;
  const path = countryCode ? COUNTRY_PATHS[countryCode.toUpperCase()] : null;
  container.innerHTML = '';
  if (!path) {
    container.classList.add('no-map');
    return null;
  }
  container.classList.remove('no-map');

  const {
    fill = 'currentColor',
    stroke = 'none',
    strokeWidth = 1,
    padding = 0.1
  } = options;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${countryCode} map`);

  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', path);
  p.setAttribute('fill', fill);
  p.setAttribute('stroke', stroke);
  if (stroke !== 'none') {
    p.setAttribute('stroke-width', String(strokeWidth));
    p.setAttribute('stroke-linejoin', 'round');
  }
  svg.appendChild(p);

  let bbox = bboxCache.get(countryCode);
  if (!bbox) {
    svg.setAttribute('viewBox', COUNTRY_VIEWBOX);
    container.appendChild(svg);
    try {
      const measured = p.getBBox();
      bbox = {
        x: measured.x,
        y: measured.y,
        width: measured.width,
        height: measured.height
      };
      bboxCache.set(countryCode, bbox);
    } catch {
      bbox = { x: 0, y: 0, width: 2000, height: 1001 };
    }
  } else {
    container.appendChild(svg);
  }

  const pad = Math.max(bbox.width, bbox.height) * padding;
  svg.setAttribute(
    'viewBox',
    `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`
  );

  return svg;
}

/**
 * Returns true if a silhouette exists for the given country code.
 */
export function hasCountryMap(countryCode) {
  return !!(countryCode && COUNTRY_PATHS[countryCode.toUpperCase()]);
}

/**
 * Returns the list of country codes we ship a silhouette for.
 */
export function listSupportedCountries() {
  return Object.keys(COUNTRY_PATHS).sort();
}
