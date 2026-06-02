// One-off generator for examples/events.sample.json — GENERIC data, not a real scenario.
// Run: node examples/_gen_sample.mjs > examples/events.sample.json
// (Kept in-repo so reviewers can see exactly how the sample was constructed.)

const events = [];
let n = 0;
const id = (p) => `${p}-${String(++n).padStart(4, '0')}`;

// Base time: a fixed UTC instant so output is deterministic.
const base = Date.parse('2026-05-01T00:00:00.000Z');
const iso = (ms) => new Date(ms).toISOString();

// ── 1. BEACON: one clear C2 beacon ──────────────────────────
// WORKSTATION-01 (192.0.2.50) -> 203.0.113.10:443, every ~60s, low jitter,
// small consistent payloads, spanning several consecutive hours.
const BEACON_SRC = '192.0.2.50';
const BEACON_DST = '203.0.113.10';
const COUNT = 780; // ~13 hours at 60s spacing → spans the 12h "ideal" consecutive run
for (let i = 0; i < COUNT; i++) {
  const jitter = ((i * 37) % 7) - 3; // deterministic -3..+3s jitter
  const ts = base + i * 60_000 + jitter * 1000;
  events.push({
    id: id('conn-beacon'),
    timestamp: iso(ts),
    source: 'zeek',
    event_type: 'conn',
    src_ip: BEACON_SRC,
    src_port: 49000 + (i % 50),
    dest_ip: BEACON_DST,
    dest_port: 443,
    proto: 'tcp',
    service: 'ssl',
    conn_state: 'SF',
    duration: 0.20 + ((i * 13) % 5) * 0.01, // ~0.20-0.24s, tight
    orig_bytes: 512 + ((i * 17) % 9) - 4,   // ~508-516 bytes, tight
    resp_bytes: 1024 + ((i * 23) % 9) - 4,  // ~1020-1028 bytes, tight
    orig_pkts: 6,
    resp_pkts: 5,
    zeek_uid: `CUID${i}`,
  });
}

// ── benign noise: irregular web browsing, varied dests/intervals ──
const NOISE_INTERVALS = [13, 220, 47, 900, 5, 130, 1800, 22, 410, 75, 1200, 9, 360, 60, 2400];
let noiseTs = base + 1000;
for (let i = 0; i < 15; i++) {
  noiseTs += NOISE_INTERVALS[i] * 1000;
  events.push({
    id: id('conn-noise'),
    timestamp: iso(noiseTs),
    source: 'zeek',
    event_type: 'conn',
    src_ip: '192.0.2.50',
    src_port: 50000 + i,
    dest_ip: `198.51.100.${10 + i}`, // varied destinations
    dest_port: 443,
    proto: 'tcp',
    service: 'ssl',
    conn_state: 'SF',
    duration: 1 + (i % 9) * 2.3,             // highly variable
    orig_bytes: 800 + (i * 933) % 9000,      // highly variable
    resp_bytes: 4000 + (i * 4111) % 80000,   // highly variable
    orig_pkts: 10 + i,
    resp_pkts: 30 + i * 3,
    zeek_uid: `CNOISE${i}`,
  });
}

// ── 2. TLS: one malicious self-signed + missing-SNI to a raw IP ──
// Plus a benign well-formed TLS session as noise.
const tlsBase = base + 5000;
// Malicious: self-signed, subject==issuer, local-looking CN, NO SNI, direct to IP.
for (let i = 0; i < 4; i++) {
  events.push({
    id: id('ssl-bad'),
    timestamp: iso(tlsBase + i * 60_000),
    source: 'zeek',
    event_type: 'ssl',
    src_ip: BEACON_SRC,
    dest_ip: BEACON_DST, // public TEST-NET-3 address (not RFC1918)
    dest_port: 443,
    server_name: null,                       // missing SNI → sni dimension fires
    tls_version: 'TLSv1.2',
    cipher: 'TLS_RSA_WITH_AES_256_CBC_SHA',
    ja3_hash: 'a0e9f5d64349fb13191bc781f81f42e1',   // in sample known-bad feed
    ja4_hash: 't12d1516h2_8daaf6152771_b186095e22b6',
    ja3s_hash: '623de93db17d313345d7ea481e7443cf',   // in sample known-bad feed
    ja4x_hash: null,
    sni_matches_cert: null,
    cert_subject: 'CN=localhost,O=Internal',
    cert_issuer: 'CN=localhost,O=Internal',  // subject==issuer
    cert_serial: '01',                       // 1-byte serial → short-serial weight
    cert_not_before: '2026-04-30T00:00:00.000Z',
    cert_not_after: '2026-05-03T00:00:00.000Z',
    cert_self_signed: true,                  // self-signed weight
    cert_expired: false,
    cert_validity_days: 3,                   // < 7 days → short-validity weight
    cert_key_type: 'rsa',
    cert_key_length: 2048,
    cert_san_dns: [],
    cert_chain_length: 1,
    connection_to_ip: true,                  // direct-to-IP
  });
}
// Benign: valid public CA cert, proper SNI, common JA3.
for (let i = 0; i < 3; i++) {
  events.push({
    id: id('ssl-ok'),
    timestamp: iso(tlsBase + 100_000 + i * 60_000),
    source: 'zeek',
    event_type: 'ssl',
    src_ip: BEACON_SRC,
    dest_ip: '198.51.100.200',
    dest_port: 443,
    server_name: 'updates.example.com',
    tls_version: 'TLSv1.3',
    cipher: 'TLS_AES_128_GCM_SHA256',
    ja3_hash: 'deadbeefcafe0000deadbeefcafe0000',
    ja4_hash: 't13d1517h2_8daaf6152771_b1d8ce4f4f4f',
    ja3s_hash: 'feedface0000feedface0000feedface',
    ja4x_hash: null,
    sni_matches_cert: true,
    cert_subject: 'CN=updates.example.com',
    cert_issuer: 'CN=Example Public CA,O=Example Trust',
    cert_serial: '0a1b2c3d4e5f60718293',     // long serial
    cert_not_before: '2026-01-01T00:00:00.000Z',
    cert_not_after: '2026-12-31T00:00:00.000Z',
    cert_self_signed: false,
    cert_expired: false,
    cert_validity_days: 364,
    cert_key_type: 'ecdsa',
    cert_key_length: 256,
    cert_san_dns: ['updates.example.com'],
    cert_chain_length: 3,
    connection_to_ip: false,
  });
}

// ── 3. POWERSHELL: one encoded/hidden invocation from a non-shell parent ──
// EncodedCommand value is a real base64 string (>= 5 chars).
const encoded = Buffer.from('Write-Output "hello from workshop"', 'utf16le').toString('base64');
const psBase = base + 7000;
events.push({
  id: id('proc-bad'),
  timestamp: iso(psBase),
  source: 'sysmon',
  event_type: 'process_create',
  event_id: 1,
  host: 'WORKSTATION-01',
  process_name: 'powershell.exe',
  process_path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
  process_id: 4242,
  process_guid: '{11111111-1111-1111-1111-111111111111}',
  parent_process_name: 'winword.exe',       // office parent → parent taxonomy 0.95
  parent_process_path: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE',
  parent_process_id: 3000,
  parent_process_guid: '{22222222-2222-2222-2222-222222222222}',
  user: 'CORP\\jdoe',
  integrity_level: 'Medium',
  original_file_name: 'PowerShell.EXE',
  description: 'Windows PowerShell',
  product: 'Microsoft Windows Operating System',
  company: 'Microsoft Corporation',
  command_line: `powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -EncodedCommand ${encoded}`,
});
// benign powershell: canonical host, interactive parent, plain command
events.push({
  id: id('proc-ok'),
  timestamp: iso(psBase + 30_000),
  source: 'sysmon',
  event_type: 'process_create',
  event_id: 1,
  host: 'WORKSTATION-01',
  process_name: 'powershell.exe',
  process_path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
  process_id: 5050,
  process_guid: '{33333333-3333-3333-3333-333333333333}',
  parent_process_name: 'explorer.exe',      // interactive parent → 0.0
  parent_process_path: 'C:\\Windows\\explorer.exe',
  parent_process_id: 1200,
  parent_process_guid: '{44444444-4444-4444-4444-444444444444}',
  user: 'CORP\\jdoe',
  integrity_level: 'Medium',
  original_file_name: 'PowerShell.EXE',
  description: 'Windows PowerShell',
  product: 'Microsoft Windows Operating System',
  company: 'Microsoft Corporation',
  command_line: 'powershell.exe -Command Get-Date',
});
// benign non-powershell process (should be ignored by the scorer's filter)
events.push({
  id: id('proc-other'),
  timestamp: iso(psBase + 60_000),
  source: 'sysmon',
  event_type: 'process_create',
  event_id: 1,
  host: 'WORKSTATION-01',
  process_name: 'notepad.exe',
  process_path: 'C:\\Windows\\System32\\notepad.exe',
  process_id: 6060,
  process_guid: '{55555555-5555-5555-5555-555555555555}',
  parent_process_name: 'explorer.exe',
  parent_process_path: 'C:\\Windows\\explorer.exe',
  parent_process_id: 1200,
  parent_process_guid: '{44444444-4444-4444-4444-444444444444}',
  user: 'CORP\\jdoe',
  integrity_level: 'Medium',
  original_file_name: 'notepad.exe',
  description: 'Notepad',
  product: 'Microsoft Windows Operating System',
  company: 'Microsoft Corporation',
  command_line: 'notepad.exe C:\\Users\\jdoe\\notes.txt',
});

process.stdout.write(JSON.stringify(events, null, 2) + '\n');
