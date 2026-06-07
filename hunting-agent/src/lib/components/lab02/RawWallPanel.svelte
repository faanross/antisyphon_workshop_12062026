<script lang="ts">
  import type { ConnectionPair } from "$lib/data/lab02/types";

  let { pair }: { pair: ConnectionPair } = $props();

  type Src = "zeek" | "sysmon" | "win" | "edr";
  interface Row { ts: string; src: Src; kind: string; detail: string; beacon?: boolean; }

  // A deliberately mixed maelstrom: different sources, different event types, and
  // different FIELD NAMES per type. Two real beacon rows are pulled from the
  // candidate's own conn.log and dropped in at non-adjacent spots so they DON'T
  // line up as an obvious block.
  let rows = $derived.by<Row[]>(() => {
    const beacon = pair.sample_conn_log;
    const b0 = beacon[0];
    const b1 = beacon[3] ?? beacon[1] ?? beacon[0];
    return [
    { ts: "14:00:02.114Z", src: "zeek",   kind: "dns",     detail: "query=outlook.office365.com qtype=A rcode=NOERROR → 52.96.40.114" },
    { ts: "14:00:03.337Z", src: "sysmon", kind: "EID1",    detail: "Image=chrome.exe ParentImage=explorer.exe User=CORP\\amy.l pid=7780" },
    { ts: "14:00:07.901Z", src: "zeek",   kind: "conn",    detail: "10.0.4.21:54112 → 142.250.80.78:443 proto=tcp service=ssl orig=1204 resp=8810" },
    { ts: "14:00:09.025Z", src: "win",    kind: "4624",    detail: "EventID=4624 Account=CORP\\svc_backup LogonType=3 Source=10.0.4.9" },
    { ts: "14:00:12.660Z", src: "zeek",   kind: "ssl",     detail: "SNI=update.googleapis.com ja3=a0e9f5d6… ja3s=ec74a5… version=TLS1.3" },
    { ts: "14:00:14.508Z", src: "edr",    kind: "beat",    detail: "agent=CrowdFalcon host=FIN-WK21 → 104.18.32.7:443 status=healthy" },
    { ts: b0.ts.slice(11),  src: "zeek",  kind: "conn",    detail: `${b0.src_ip}:${b0.src_port} → ${b0.dest_ip}:${b0.dest_port} proto=tcp service=ssl orig=${b0.orig_bytes} resp=${b0.resp_bytes}`, beacon: true },
    { ts: "14:00:18.244Z", src: "sysmon", kind: "EID3",    detail: "Image=powershell.exe → 10.0.4.50:5985 proto=tcp DestHost=BUILD-02" },
    { ts: "14:00:19.770Z", src: "zeek",   kind: "http",    detail: "host=ocsp.digicert.com method=GET uri=/ status=200 user_agent=Microsoft-CryptoAPI" },
    { ts: "14:00:22.013Z", src: "zeek",   kind: "dns",     detail: "query=teams.microsoft.com qtype=AAAA rcode=NOERROR → 2603:1030::" },
    { ts: "14:00:24.901Z", src: "sysmon", kind: "EID11",   detail: "FileCreate Target=C:\\Users\\amy.l\\Downloads\\Q3-report.xlsx Image=excel.exe" },
    { ts: "14:00:27.556Z", src: "zeek",   kind: "conn",    detail: "10.0.4.33:51002 → 17.253.144.10:443 proto=tcp service=ssl orig=902 resp=5310" },
    { ts: "14:00:29.318Z", src: "win",    kind: "4688",    detail: "EventID=4688 NewProcess=svchost.exe Creator=services.exe Account=SYSTEM" },
    { ts: "14:00:31.642Z", src: "zeek",   kind: "ntp",     detail: "10.0.4.21 → 132.163.97.4:123 version=4 stratum=2" },
    { ts: b1.ts.slice(11),  src: "zeek",  kind: "conn",    detail: `${b1.src_ip}:${b1.src_port} → ${b1.dest_ip}:${b1.dest_port} proto=tcp service=ssl orig=${b1.orig_bytes} resp=${b1.resp_bytes}`, beacon: true },
    { ts: "14:00:34.110Z", src: "sysmon", kind: "EID1",    detail: "Image=Teams.exe ParentImage=Update.exe User=CORP\\amy.l pid=8123" },
    { ts: "14:00:36.889Z", src: "zeek",   kind: "ssl",     detail: "SNI=login.microsoftonline.com ja3=51c64c… version=TLS1.3 established=T" },
    { ts: "14:00:38.402Z", src: "zeek",   kind: "dns",     detail: "query=ctldl.windowsupdate.com qtype=A rcode=NOERROR → 8.241.11.126" },
    ];
  });

  const srcLabel: Record<Src, string> = { zeek: "zeek", sysmon: "sysmon", win: "win", edr: "edr" };
</script>

<div class="panel">
  <h3>Raw Telemetry</h3>
  <p class="intro">
    Every minute, thousands of events pour in from every sensor at once — Zeek conn / dns / ssl /
    http, Sysmon process and network events, Windows logs, EDR beats — each with its own fields and
    shape. The beacon is in here somewhere, looking exactly like everything else.
  </p>

  <div class="wall">
    {#each Array(3) as _, i}<div class="ghostrow" style="opacity:{0.4 - i * 0.1}"></div>{/each}

    <div class="stream">
      {#each rows as r}
        <div class="evt">
          <span class="e-ts">{r.ts}</span>
          <span class="e-tag tag-{r.src}">{srcLabel[r.src]}·{r.kind}</span>
          <span class="e-detail">{r.detail}</span>
        </div>
      {/each}
    </div>

    {#each Array(6) as _, i}<div class="ghostrow" style="opacity:{0.34 - i * 0.055}"></div>{/each}
  </div>
</div>

<style>
  .panel {
    padding: 1.4rem 1.5rem;
    border: 1px solid rgba(189, 147, 249, 0.25);
    border-radius: 8px;
    background: rgba(22, 22, 31, 0.78);
  }
  h3 {
    margin: 0 0 0.5rem;
    color: var(--dracula-green);
    font-family: var(--font-heading);
    font-size: 1.3rem;
  }
  .intro {
    margin: 0 0 1.2rem;
    max-width: 78ch;
    color: var(--brand-muted);
    font-size: 1rem;
    line-height: 1.55;
  }
  .wall {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .ghostrow {
    height: 1.05rem;
    border-radius: 3px;
    background: linear-gradient(90deg, rgba(189, 147, 249, 0.16), rgba(189, 147, 249, 0.04));
    filter: blur(1px);
  }

  /* The stream itself: dense, faded at the edges so it reads as a window into an
     endless flow rather than a tidy table. */
  .stream {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    margin: 0.3rem 0;
    -webkit-mask-image: linear-gradient(180deg, transparent, #000 8%, #000 92%, transparent);
    mask-image: linear-gradient(180deg, transparent, #000 8%, #000 92%, transparent);
  }

  .evt {
    display: grid;
    grid-template-columns: 7.5rem 6.5rem 1fr;
    gap: 0.9rem;
    align-items: baseline;
    padding: 0.32rem 0.7rem;
    border-radius: 4px;
    font-family: "JetBrains Mono", var(--font-heading), monospace;
    font-size: 0.84rem;
    color: rgba(255, 255, 255, 0.46);
  }
  .evt:nth-child(even) { background: rgba(255, 255, 255, 0.018); }

  .e-ts { color: rgba(255, 255, 255, 0.32); white-space: nowrap; }

  .e-tag {
    justify-self: start;
    padding: 0.05rem 0.4rem;
    border-radius: 3px;
    font-size: 0.74rem;
    white-space: nowrap;
    opacity: 0.85;
  }
  .tag-zeek   { color: #8be9fd; background: rgba(139, 233, 253, 0.08); }
  .tag-sysmon { color: #bd93f9; background: rgba(189, 147, 249, 0.10); }
  .tag-win    { color: #f5e663; background: rgba(245, 230, 99, 0.08); }
  .tag-edr    { color: #50fa7b; background: rgba(80, 250, 123, 0.08); }

  .e-detail {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* The beacon rows are styled EXACTLY like their neighbours — no highlight.
     That is the whole point: in the raw wall it is indistinguishable. */

  @media (max-width: 900px) {
    .evt { grid-template-columns: 6rem 5.5rem 1fr; font-size: 0.78rem; gap: 0.6rem; }
  }
</style>
