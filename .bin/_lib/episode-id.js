// Shared series-registry + episode-id validation.
// Loaded by .bin/lint-series, .bin/new-episode, .bin/status.
// Stays zero-dep on purpose so cross-project consumers (script-harness,
// astral-video) can `require` this file directly.

const fs = require('node:fs');
const path = require('node:path');

const PIPELINE_ROOT = path.resolve(__dirname, '..', '..');
const SERIES_JSON = path.join(PIPELINE_ROOT, 'schemas', 'series.json');

const VERSION_SUFFIX_RE = /-v\d+$/;
const SINGLE_RE = /^([a-z][a-z0-9]*?)(\d+)$/;
const SERIES_ALGO_RE = /^([a-z][a-z0-9]*?)(\d+)$/;

function loadSeries(seriesJsonPath = SERIES_JSON) {
  const raw = fs.readFileSync(seriesJsonPath, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data.series)) {
    throw new Error(`series.json malformed: "series" missing`);
  }
  return data;
}

function pickSeriesByLongestPrefix(id, seriesList) {
  // Sort by name length DESC so e.g. "meta" wins over "m" if both existed.
  const sorted = [...seriesList].sort((a, b) => b.name.length - a.name.length);
  return sorted.find((s) => id.startsWith(s.name)) || null;
}

function validateEpisodeId(id, registry) {
  if (typeof id !== 'string' || id.length === 0) {
    return { ok: false, reason: 'id must be non-empty string' };
  }
  if (VERSION_SUFFIX_RE.test(id)) {
    return { ok: false, reason: 'version suffix forbidden (e.g. -v2)' };
  }

  const data = registry || loadSeries();
  const outliers = data.legacy_outliers || [];
  if (outliers.some((o) => o.id === id)) {
    return { ok: true, series: null, kind: 'legacy_outlier' };
  }

  const series = pickSeriesByLongestPrefix(id, data.series);
  if (!series) {
    return { ok: false, reason: `no series matches id "${id}"` };
  }
  if (!series.enabled) {
    return { ok: false, reason: `series "${series.name}" disabled` };
  }

  const tail = id.slice(series.name.length);

  if (series.naming === 'single') {
    if (!/^\d+$/.test(tail)) {
      return {
        ok: false,
        reason: `series "${series.name}" requires <series><NN> (got "${id}")`,
      };
    }
    return { ok: true, series, kind: 'single', tail };
  }

  if (series.naming === 'series-algo') {
    // tail must be <algo><NN>: lowercase letters then digits at the end
    const m = tail.match(/^([a-z][a-z0-9]*?)(\d+)$/);
    if (!m) {
      return {
        ok: false,
        reason: `series "${series.name}" requires <series><algo><NN> (got "${id}")`,
      };
    }
    return {
      ok: true,
      series,
      kind: 'series-algo',
      algo: m[1],
      number: m[2],
    };
  }

  return { ok: false, reason: `unsupported naming "${series.naming}"` };
}

module.exports = {
  PIPELINE_ROOT,
  SERIES_JSON,
  loadSeries,
  validateEpisodeId,
  pickSeriesByLongestPrefix,
};
