"use client";

import { useEffect, useMemo, useState } from "react";
import { initialData, type Arrival, type MonitorData, type MonthlyDelivery } from "./monitor-data";

const REMOTE_DATA_URL =
  "https://raw.githubusercontent.com/roblevinson-cloud/brazil-naphtha-monitor/main/public/data/dashboard.json";

const SOURCES = [
  {
    grade: "A",
    name: "ANP customs clearances",
    cadence: "Monthly · through July 2026",
    role: "Controlling Braskem import total, customs point and country of origin.",
    url: "https://www.gov.br/anp/pt-br/assuntos/importacoes-e-exportacoes/relatorio-de-desembaracos-de-importacoes-de-petroleo-gas-derivados-e-biocombustiveis",
    state: "Integrated",
  },
  {
    grade: "A",
    name: "CODEBA Aratu line-up",
    cadence: "Live / near real time",
    role: "Vessel, ETA / ETB / ETD, berth, port operator, cargo and planned tonnes.",
    url: "https://codeba.gov.br/eficiente/sites/portalcodeba/pt-br/porto_aratu.php?secao=tportos_aratu",
    state: "Integrated",
  },
  {
    grade: "B",
    name: "ANP terminal movements 881",
    cadence: "Monthly · terminal-wide",
    role: "Osório marine receipts and pipeline movements; not uniquely attributable to Braskem.",
    url: "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/movimentacao-dos-terminais-aquaviarios",
    state: "Cross-check",
  },
  {
    grade: "B",
    name: "Braskem + Transpetro 881 files",
    cadence: "Monthly / schedule",
    role: "Southern terminal histories and vessel schedules used to reconcile the Triunfo route.",
    url: "https://www.braskem.com/resolucao-anp-881",
    state: "Next adapter",
  },
  {
    grade: "B",
    name: "ANTAQ Estatístico Aquaviário",
    cadence: "Monthly archive",
    role: "Historical Aratu berth and cargo archive beneath the live CODEBA board.",
    url: "https://dados.gov.br/dados/conjuntos-dados/estatistico-aquaviario-ea",
    state: "Backfill",
  },
];

const WEEKLY = [
  { label: "03–09 Aug", kt: 56.789, vessels: "Barracuda" },
  { label: "10–16 Aug", kt: 55.245, vessels: "Beautiful Future" },
  { label: "17–23 Aug", kt: 36.0, vessels: "Pacific Jasper" },
  { label: "24–30 Aug", kt: 56.021, vessels: "Baiacu · through 27 Aug" },
];

const fmtKt = (value: number, digits = 1) => value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const fmtInt = (value: number | null) => value ? Math.round(value).toLocaleString("en-US") : "—";
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

function dateBlock(item: Arrival) {
  const date = new Date(item.status === "discharging" ? item.etb : item.etb || item.eta);
  return {
    day: date.toLocaleDateString("en-US", { day: "2-digit", month: "short", timeZone: "America/Bahia" }).toUpperCase(),
    detail: item.status === "discharging" ? "BERTHED" : `ETB ${date.toLocaleDateString("en-US", { weekday: "short", timeZone: "America/Bahia" }).toUpperCase()}`,
  };
}

function Metric({ label, value, unit, detail, tone = "plain" }: { label: string; value: string; unit?: string; detail: string; tone?: "plain" | "acid" | "dark" }) {
  return (
    <article className={`metric-card ${tone}`}>
      <p>{label}</p>
      <strong>{value} {unit && <small>{unit}</small>}</strong>
      <span>{detail}</span>
    </article>
  );
}

function ArrivalBoard({ items }: { items: Arrival[] }) {
  return (
    <section className="board" aria-label="Upcoming naphtha vessel arrivals">
      <div className="board-head board-row">
        <span>ARRIVAL / BERTH</span><span>VESSEL / FLEET</span><span>CARGO ORIGIN</span><span>DESTINATION</span><span>CARGO</span><span>DWT</span><span>OPERATOR</span><span>STATUS</span>
      </div>
      {items.map((item) => {
        const date = dateBlock(item);
        return (
          <div className="board-row arrival" key={item.id}>
            <span className="date"><b>{date.day}</b><small>{date.detail}</small></span>
            <span className="vessel">{item.vessel}<small className={`fleet ${item.fleet}`}>{item.fleet === "future" ? "FUTURE FLEET" : "THIRD-PARTY"}</small></span>
            <span className="origin">{item.cargo_origin || "PENDING MATCH"}<small>Flag: {item.vessel_flag}</small></span>
            <span>{item.port}<small className="subline">{item.terminal}</small></span>
            <span className="cargo">{fmtKt(item.cargo_tonnes / 1000)} KT</span>
            <span>{fmtInt(item.dwt_tonnes)}</span>
            <span>{item.operator}</span>
            <span><em className={`status ${item.status}`}>{item.status.toUpperCase()}</em></span>
          </div>
        );
      })}
      <footer>
        <span><i className="dot green" /> Official port schedule</span>
        <span><i className="dot amber" /> Cargo origin awaits AIS / customs match</span>
        <span>Cargo tonnes and vessel DWT are separate measures</span>
      </footer>
    </section>
  );
}

function MonthlyChart({ months }: { months: MonthlyDelivery[] }) {
  const max = Math.max(...months.map((month) => month.total_kt), 1);
  return (
    <div className="chart-card">
      <div className="chart-title">
        <div><p className="eyebrow">CUSTOMS-CLEARED IMPORTS</p><h3>Monthly Braskem naphtha</h3></div>
        <div className="legend"><span><i className="legend-ba" /> Bahia</span><span><i className="legend-rs" /> Rio Grande do Sul</span></div>
      </div>
      <div className="bars" aria-label="Monthly naphtha deliveries chart">
        {months.map((month) => (
          <div className="bar-col" key={month.month}>
            <strong>{fmtKt(month.total_kt, 0)}</strong>
            <div className="bar-track">
              <div className="bar-rs" style={{ height: `${(month.rio_grande_do_sul_kt / max) * 100}%` }} />
              <div className="bar-ba" style={{ height: `${(month.bahia_kt / max) * 100}%` }} />
            </div>
            <span>{month.label}</span>
          </div>
        ))}
      </div>
      <p className="chart-note">Tonnes come directly from customs kilograms—no density conversion. Month is the clearance month, which may differ from berth date.</p>
    </div>
  );
}

function HistoryTable({ months, provisional }: { months: MonthlyDelivery[]; provisional: number }) {
  return (
    <div className="history-table-wrap">
      <table className="history-table">
        <thead><tr><th>2026</th><th>Bahia</th><th>Rio Grande do Sul</th><th>Total</th><th>Reported origins</th><th>Basis</th></tr></thead>
        <tbody>
          {months.map((month) => (
            <tr key={month.month}>
              <th>{month.label}</th>
              <td>{fmtKt(month.bahia_kt)} kt</td>
              <td>{fmtKt(month.rio_grande_do_sul_kt)} kt</td>
              <td><strong>{fmtKt(month.total_kt)} kt</strong></td>
              <td>{month.origins.map((origin) => `${origin.name} ${fmtKt(origin.kt, 0)}`).join(" · ")}</td>
              <td><span className="basis official">ANP CUSTOMS</span></td>
            </tr>
          ))}
          <tr className="provisional-row">
            <th>Aug</th><td>{fmtKt(provisional)} kt</td><td>Pending</td><td><strong>{fmtKt(provisional)}+ kt</strong></td><td>Not matched at vessel level</td><td><span className="basis provisional">PORT CALLS</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function WeeklyChart() {
  const max = Math.max(...WEEKLY.map((week) => week.kt));
  return (
    <div className="weekly-card">
      <div className="chart-title"><div><p className="eyebrow">COMPLETED BERTH CALLS</p><h3>Weekly Aratu receipts</h3></div><span className="basis provisional">AUGUST COVERAGE</span></div>
      <div className="weekly-rows">
        {WEEKLY.map((week) => (
          <div className="weekly-row" key={week.label}>
            <span>{week.label}<small>{week.vessels}</small></span>
            <div><i style={{ width: `${(week.kt / max) * 100}%` }} /></div>
            <strong>{fmtKt(week.kt)} kt</strong>
          </div>
        ))}
      </div>
      <p className="chart-note">Weekly coverage starts in August because the customs control file provides month—not clearance day. Calls are assigned to the week in which discharge completed.</p>
    </div>
  );
}

export function NaphthaMonitor() {
  const [data, setData] = useState<MonitorData>(initialData);
  const [tab, setTab] = useState<"arrivals" | "history" | "ledger">("arrivals");
  const [period, setPeriod] = useState<"monthly" | "weekly">("monthly");
  const [port, setPort] = useState<"all" | "aratu" | "osorio">("all");
  const [feedState, setFeedState] = useState<"snapshot" | "refreshing" | "live">("snapshot");

  const refresh = async () => {
    setFeedState("refreshing");
    try {
      const response = await fetch(`${REMOTE_DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("feed unavailable");
      setData(await response.json() as MonitorData);
      setFeedState("live");
    } catch {
      setData(initialData);
      setFeedState("snapshot");
    }
  };

  useEffect(() => {
    const loadBundledSnapshot = async () => {
      try {
        const response = await fetch("/data/dashboard.json", { cache: "no-store" });
        if (response.ok) setData(await response.json() as MonitorData);
      } catch {
        // The compiled snapshot remains available when a network is offline.
      }
    };
    void loadBundledSnapshot();
  }, []);

  const filteredArrivals = useMemo(() => {
    if (port === "all") return data.arrivals;
    const needle = port === "aratu" ? "Aratu" : "Osório";
    return data.arrivals.filter((item) => item.port.includes(needle));
  }, [data.arrivals, port]);

  const completedKt = sum(data.completed_vessels.map((item) => item.cargo_tonnes)) / 1000;
  const underwayKt = sum(data.arrivals.filter((item) => item.status === "discharging").map((item) => item.cargo_tonnes)) / 1000;
  const scheduledKt = sum(data.arrivals.filter((item) => item.status !== "discharging").map((item) => item.cargo_tonnes)) / 1000;
  const ytd = sum(data.monthly.map((month) => month.total_kt));
  const latest90 = sum(data.monthly.slice(-3).map((month) => month.total_kt));
  const prior90 = sum(data.monthly.slice(-6, -3).map((month) => month.total_kt));
  const change90 = ((latest90 / prior90) - 1) * 100;
  const futureKt = sum([...data.completed_vessels, ...data.arrivals].filter((item) => item.fleet === "future").map((item) => item.cargo_tonnes)) / 1000;
  const thirdPartyKt = completedKt + underwayKt + scheduledKt - futureKt;
  const updated = new Date(data.generated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Bahia", timeZoneName: "short" });

  return (
    <main>
      <header className="topbar">
        <button className="brand-mark" aria-label="Go to arrival board" onClick={() => setTab("arrivals")}>NM</button>
        <div><p className="eyebrow">BRAZIL · PETROCHEMICAL FEEDSTOCK</p><h1>Naphtha Monitor</h1></div>
        <button className={`live-pill ${feedState}`} onClick={refresh} disabled={feedState === "refreshing"}>
          <span /> {feedState === "refreshing" ? "Refreshing…" : feedState === "live" ? `Live feed · ${updated}` : `Verified snapshot · ${updated}`}
        </button>
      </header>

      <nav className="tabs" aria-label="Monitor views">
        <button className={tab === "arrivals" ? "active" : ""} onClick={() => setTab("arrivals")}>Arrival board <b>{data.arrivals.length}</b></button>
        <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>Delivery history</button>
        <button className={tab === "ledger" ? "active" : ""} onClick={() => setTab("ledger")}>Data ledger</button>
      </nav>

      {tab === "arrivals" && <>
        <section className="hero-grid">
          <div><p className="eyebrow accent">NEXT IDENTIFIED CALLS</p><h2>The Brazil naphtha arrival board.</h2><p className="lede">Known cargoes into Braskem&apos;s primary marine gateways, separated from the monthly customs record so planned and completed tonnes are never mixed.</p></div>
          <aside className="pulse-card"><p>TRAILING 90-DAY SIGNAL</p><strong>Clearly down</strong><span>{fmtKt(latest90)} kt · {fmtKt(change90)}% vs prior 3-month window</span></aside>
        </section>

        <div className="filter-row" aria-label="Filter arrival board by port">
          <span>PORT</span>
          {(["all", "aratu", "osorio"] as const).map((value) => <button key={value} className={port === value ? "active" : ""} onClick={() => setPort(value)}>{value === "all" ? "All gateways" : value === "aratu" ? "Aratu / Camaçari" : "Osório / Triunfo"}</button>)}
        </div>
        {filteredArrivals.length ? <ArrivalBoard items={filteredArrivals} /> : <div className="empty-state"><strong>No identifiable Osório calls in the live feed.</strong><span>Rio Grande do Sul is included in the monthly customs history. A vessel-level Transpetro/AIS adapter is still needed for the offshore buoy.</span></div>}

        <section className="metric-grid arrivals-metrics">
          <Metric label="COMPLETED IN AUGUST" value={fmtKt(completedKt)} unit="KT" detail={`${data.completed_vessels.length} identified Aratu receipts`} />
          <Metric label="DISCHARGING NOW" value={fmtKt(underwayKt)} unit="KT" detail="Not counted as completed" tone="acid" />
          <Metric label="FORWARD SCHEDULED" value={fmtKt(scheduledKt)} unit="KT" detail="Anchored + expected calls" />
          <Metric label="IDENTIFIED THROUGH 5 SEP" value={fmtKt(completedKt + underwayKt + scheduledKt)} unit="KT" detail="Gross physical receipts" tone="dark" />
        </section>

        <section className="split-grid">
          <article><p className="eyebrow">FLEET COMPOSITION</p><h3>Future vs. third-party</h3><div className="split-bar"><i style={{ width: `${(futureKt / (futureKt + thirdPartyKt)) * 100}%` }} /></div><div className="split-labels"><span><b>{fmtKt(futureKt)} kt</b> Future fleet</span><span><b>{fmtKt(thirdPartyKt)} kt</b> Third-party</span></div></article>
          <article><p className="eyebrow">THESIS CHECK</p><h3>Too early to call incremental.</h3><p>August is running above July customs clearances, and third-party tonnage persisted after Beautiful Future. The conclusion stays provisional until August customs data and Osório calls are reconciled.</p></article>
        </section>
      </>}

      {tab === "history" && <>
        <section className="section-head"><div><p className="eyebrow accent">2026 RECONCILIATION</p><h2>One controlling monthly record.</h2><p className="lede">NCM 27101241 · Braskem S.A. · kilograms cleared through Salvador and Porto Alegre customs.</p></div><div className="period-switch"><button className={period === "monthly" ? "active" : ""} onClick={() => setPeriod("monthly")}>Monthly</button><button className={period === "weekly" ? "active" : ""} onClick={() => setPeriod("weekly")}>Weekly</button></div></section>
        <section className="metric-grid history-metrics">
          <Metric label="2026 YTD · JAN–JUL" value={fmtKt(ytd)} unit="KT" detail="Exact customs kilograms" tone="dark" />
          <Metric label="TRAILING 30-DAY PROXY" value={fmtKt(data.monthly.at(-1)?.total_kt || 0)} unit="KT" detail="July completed month" />
          <Metric label="TRAILING 90-DAY PROXY" value={fmtKt(latest90)} unit="KT" detail="May–July completed months" />
          <Metric label="90D VS PRIOR 90D" value={`${fmtKt(change90)}%`} detail="Clearly trending down" tone="acid" />
        </section>
        {period === "monthly" ? <><MonthlyChart months={data.monthly} /><HistoryTable months={data.monthly} provisional={completedKt} /></> : <WeeklyChart />}
      </>}

      {tab === "ledger" && <>
        <section className="section-head ledger-head"><div><p className="eyebrow accent">AUDITABLE BY DESIGN</p><h2>Source and reconciliation ledger.</h2><p className="lede">Every number is tagged by source and state. Estimates can inform the live board; only official clearances close a month.</p></div></section>
        <section className="source-grid">
          {SOURCES.map((source) => <a href={source.url} target="_blank" rel="noreferrer" className="source-card" key={source.name}><span className={`grade grade-${source.grade.toLowerCase()}`}>{source.grade}</span><div><p>{source.state} · {source.cadence}</p><h3>{source.name}</h3><span>{source.role}</span></div><b aria-hidden="true">↗</b></a>)}
        </section>
        <section className="rules-card">
          <div><p className="eyebrow">RECONCILIATION RULES</p><h3>How a tonne moves through the monitor</h3></div>
          <ol><li><b>Schedule</b><span>CODEBA identifies a vessel, berth, operator and planned cargo tonnes.</span></li><li><b>Completion</b><span>A vessel moves into history only after its port call completes; DWT is never used as cargo volume.</span></li><li><b>Customs close</b><span>ANP clearances replace vessel estimates at month-end and establish importer and country of origin.</span></li><li><b>No double count</b><span>Osório marine receipt is counted once; subsequent pipeline delivery into Triunfo is a cross-check.</span></li></ol>
        </section>
        <section className="gap-card"><span>KNOWN GAP</span><strong>Osório / Tramandaí vessel attribution</strong><p>The customs file captures Braskem&apos;s Rio Grande do Sul imports, but the offshore buoy schedule does not expose cargo and consignee as cleanly as CODEBA. Add a licensed AIS feed—Spire, MarineTraffic, Kpler or Vortexa—to resolve voyage origin and live vessel identity reliably.</p></section>
      </>}
    </main>
  );
}
