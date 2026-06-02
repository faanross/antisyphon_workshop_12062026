/**
 * TLS Anomaly known-bad feed loading.
 *
 * Ported from the feed-loading half of aionsec_HUNT/src/index.ts
 * (loadKnownBadFeeds / loadFeedFile). Resolves the SSLBL-style feed CSVs from
 * this package's `data/feeds/` directory.
 *
 * If a feed file is absent, its set is empty and the fingerprint dimension
 * degrades gracefully to 0 — cert + SNI dimensions still fire.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeedFileToSet } from '../util.js';
import { DEFAULT_TLS_ANOMALY_CONFIG, type TlsAnomalyConfig } from '../scorers/tls-anomaly.js';

const FEED_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../data/feeds');

export interface LoadTlsConfigResult {
  config: TlsAnomalyConfig;
  loaded: { ja3: number; ja3s: number; pairs: number; ja4x: number };
  missing: string[];
}

export function loadTlsAnomalyConfig(feedDirOverride?: string): LoadTlsConfigResult {
  const feedDir = feedDirOverride ?? FEED_DIR;
  const feedFiles = {
    ja3: join(feedDir, 'sslbl-ja3.csv'),
    ja3s: join(feedDir, 'sslbl-ja3s.csv'),
    pairs: join(feedDir, 'sslbl-ja3-pairs.csv'),
    ja4x: join(feedDir, 'sslbl-ja4x.csv'),
  };

  const missing: string[] = [];
  for (const [name, path] of Object.entries(feedFiles)) {
    if (!existsSync(path)) missing.push(`${name}: ${path}`);
  }

  const known_bad_ja3 = loadFeedFileToSet(feedFiles.ja3, existsSync, (p) => readFileSync(p, 'utf-8'));
  const known_bad_ja3s = loadFeedFileToSet(feedFiles.ja3s, existsSync, (p) => readFileSync(p, 'utf-8'));
  const known_bad_ja3_ja3s_pairs = loadFeedFileToSet(feedFiles.pairs, existsSync, (p) => readFileSync(p, 'utf-8'));
  const known_bad_ja4x = loadFeedFileToSet(feedFiles.ja4x, existsSync, (p) => readFileSync(p, 'utf-8'));

  return {
    config: {
      ...DEFAULT_TLS_ANOMALY_CONFIG,
      known_bad_ja3,
      known_bad_ja3s,
      known_bad_ja3_ja3s_pairs,
      known_bad_ja4x,
    },
    loaded: {
      ja3: known_bad_ja3.size,
      ja3s: known_bad_ja3s.size,
      pairs: known_bad_ja3_ja3s_pairs.size,
      ja4x: known_bad_ja4x.size,
    },
    missing,
  };
}
