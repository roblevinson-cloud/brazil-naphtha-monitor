"use client";

import { useEffect, useMemo, useState } from "react";
import { initialData, type Arrival, type MonitorData, type MonthlyDelivery } from "./monitor-data";
import { CONTRACT_CHANGES, CRACKERS, MODEL_SOURCES } from "./supply-model";

const REMOTE_DATA_URL =
  "https://raw.githubusercontent.com/roblevinson-cloud/brazil-naphtha-monitor/main/public/data/dashboard.json";

const SOURCES = [
  {
    grade: "A",
    name: "ANP customs clearances",
    cadence: "Monthly · latest closed month",
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
  {
    grade: "A",
    name: "Braskem 2025 Form 20-F",
    cadence: "Annual filing",
    role: "Brazil ethylene capacity and production, feedstock mix, supplier concentration and complex-level operating disclosures.",
    url: MODEL_SOURCES.braskem20f,
    state: "Supply model",
  },
  {
    grade: "A",
    name: "Petrobras–Braskem contract filings",
    cadence: "Contracts effective 2026",
    role: "Plant, route and volume terms for naphtha, ethane and propane supply.",
    url: MODEL_SOURCES.contract6k,
    state: "Supply model",
  },
  {
    grade: "A",
    name: "Petrobras 2025 Management Report",
    cadence: "Annual filing",
    role: "Reported Petrobras naphtha production and sales used to bound likely physical deliveries.",
    url: MODEL_SOURCES.petrobrasReport,
    state: "Cross-check",
  },
];

const fmtKt = (value: number, digits = 1) => value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const fmtInt = (value: number | null) => value ? Math.round(value).toLocaleString("en-US") : "—";
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

function isPlausibleSnapshot(value: unknown): value is MonitorData {
  const candidate = value as MonitorData;
  return Boolean(
    candidate &&
    Array.isArray(candidate.arrivals) &&
    Array.isArray(candidate.completed_vessels) &&
    Array.isArray(candidate.monthly) &&
    candidate.monthly.length > 0 &&
    candidate.monthly.every((month) => Number.isFinite(month.total_kt) && month.total_kt >= 0 && month.total_kt < 1_000),
  );
}

async function loadMonitorSnapshot() {
  const urls = ["data/dashboard.json", REMOTE_DATA_URL];
  for (const url of urls) {
    try {
      const response = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) continue;
      const snapshot = await response.json() as unknown;
      if (isPlausibleSnapshot(snapshot)) return snapshot;
    } catch {
      // Try the next source. The compiled snapshot remains the final fallback.
    }
  }
  throw new Error("No plausible monitor snapshot is available");
}

function completedWeeks(items: Arrival[]) {
  const groups = new Map<string, { start: Date; kt: number; vessels: string[] }>();
  for (const item of items) {
    if (!item.etd) continue;
    const [year, month, day] = item.etd.slice(0, 10).split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    const start = new Date(date);
    start.setUTCDate(date.getUTCDate() - mondayOffset);
    const key = start.toISOString().slice(0, 10);
    const group = groups.get(key) || { start, kt: 0, vessels: [] };
    group.kt += item.cargo_tonnes / 1000;
    group.vessels.push(item.vessel);
    groups.set(key, group);
  }

  const dayMonth = new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", timeZone: "UTC" });
  return [...groups.values()].sort((a, b) => a.start.getTime() - b.start.getTime()).map((group) => {
    const end = new Date(group.start);
    end.setUTCDate(group.start.getUTCDate() + 6);
    const startParts = dayMonth.formatToParts(group.start);
    const endParts = dayMonth.formatToParts(end);
    const startDay = startParts.find((part) => part.type === "day")?.value;
    const startMonth = startParts.find((part) => part.type === "month")?.value;
    const endDay = endParts.find((part) => part.type === "day")?.value;
    const endMonth = endParts.find((part) => part.type === "month")?.value;
    return {
      label: startMonth === endMonth ? `${startDay}–${endDay} ${endMonth}` : `${startDay} ${startMonth}–${endDay} ${endMonth}`,
      kt: group.kt,
      vessels: group.vessels.join(" · "),
    };
  });
}

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
      <div className="bars" style={{ gridTemplateColumns: `repeat(${months.length}, minmax(54px, 1fr))` }} aria-label="Monthly naphtha deliveries chart">
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

function HistoryTable({ months, provisional, provisionalLabel }: { months: MonthlyDelivery[]; provisional: number; provisionalLabel: string }) {
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
          {provisional > 0 && <tr className="provisional-row">
            <th>{provisionalLabel}</th><td>{fmtKt(provisional)} kt</td><td>Pending</td><td><strong>{fmtKt(provisional)}+ kt</strong></td><td>Not yet matched to the next customs close</td><td><span className="basis provisional">PORT CALLS</span></td>
          </tr>}
        </tbody>
      </table>
    </div>
  );
}

function WeeklyChart({ items }: { items: Arrival[] }) {
  const weeks = completedWeeks(items);
  const max = Math.max(...weeks.map((week) => week.kt), 1);
  return (
    <div className="weekly-card">
      <div className="chart-title"><div><p className="eyebrow">COMPLETED BERTH CALLS</p><h3>Weekly Aratu receipts</h3></div><span className="basis provisional">TRACKED CALLS</span></div>
      <div className="weekly-rows">
        {weeks.map((week) => (
          <div className="weekly-row" key={week.label}>
            <span>{week.label}<small>{week.vessels}</small></span>
            <div><i style={{ width: `${(week.kt / max) * 100}%` }} /></div>
            <strong>{fmtKt(week.kt)} kt</strong>
          </div>
        ))}
      </div>
      <p className="chart-note">Weekly coverage starts with the monitor&apos;s August vessel archive. Customs data controls the monthly total because the ANP file reports the clearance month, not the clearance day.</p>
    </div>
  );
}

function CrackerTable() {
  return (
    <div className="supply-table-wrap">
      <table className="supply-table cracker-table">
        <thead><tr><th>Complex</th><th>Capacity</th><th>2023E</th><th>2024E</th><th>2025E</th><th>Feedstock</th><th>Physical route</th><th>Counterparties</th></tr></thead>
        <tbody>
          {CRACKERS.map((cracker) => (
            <tr key={cracker.code}>
              <th><strong>{cracker.complex}</strong><small>{cracker.code} · {cracker.configuration}</small></th>
              <td><b>{fmtInt(cracker.capacityKt)}</b><small>kt ethylene / year</small></td>
              <td className="util-cell">{cracker.utilization[2023]}%</td>
              <td className="util-cell">{cracker.utilization[2024]}%</td>
              <td className="util-cell current">{cracker.utilization[2025]}%</td>
              <td>{cracker.feedstock}</td>
              <td>{cracker.route}</td>
              <td>{cracker.counterparties}</td>
            </tr>
          ))}
          <tr className="total-row"><th>Brazil fossil-ethylene total</th><td><b>3,752</b><small>kt / year</small></td><td>70.7%</td><td>71.8%</td><td>68.2%</td><td colSpan={3}>National utilization is reported by Braskem; site allocation is estimated.</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function ContractTable() {
  return (
    <div className="supply-table-wrap">
      <table className="supply-table contract-table">
        <thead><tr><th>Scope</th><th>2021–25 structure</th><th>2026 onward</th><th>Substantive change</th></tr></thead>
        <tbody>{CONTRACT_CHANGES.map((row) => <tr key={row.scope}><th>{row.scope}</th><td>{row.oldTerms}</td><td><strong>{row.newTerms}</strong></td><td>{row.effect}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export function NaphthaMonitor() {
  const [data, setData] = useState<MonitorData>(initialData);
  const [tab, setTab] = useState<"arrivals" | "history" | "supply" | "ledger">("arrivals");
  const [period, setPeriod] = useState<"monthly" | "weekly">("monthly");
  const [port, setPort] = useState<"all" | "aratu" | "osorio">("all");
  const [feedState, setFeedState] = useState<"snapshot" | "refreshing" | "live">("snapshot");

  const refresh = async () => {
    setFeedState("refreshing");
    try {
      setData(await loadMonitorSnapshot());
      setFeedState("live");
    } catch {
      setData(initialData);
      setFeedState("snapshot");
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadLatestSnapshot = async () => {
      try {
        const snapshot = await loadMonitorSnapshot();
        if (!cancelled) {
          setData(snapshot);
          setFeedState("live");
        }
      } catch {
        // The compiled snapshot remains available when both feeds are unavailable.
      }
    };

    void loadLatestSnapshot();
    const timer = window.setInterval(() => void loadLatestSnapshot(), 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
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
  const change90 = prior90 > 0 ? ((latest90 / prior90) - 1) * 100 : 0;
  const futureKt = sum([...data.completed_vessels, ...data.arrivals].filter((item) => item.fleet === "future").map((item) => item.cargo_tonnes)) / 1000;
  const thirdPartyKt = completedKt + underwayKt + scheduledKt - futureKt;
  const fleetTotalKt = Math.max(futureKt + thirdPartyKt, 1);
  const updated = new Date(data.generated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Bahia", timeZoneName: "short" });
  const latestMonth = data.monthly.at(-1);
  const previousMonth = data.monthly.at(-2);
  const priorMonthChange = latestMonth && previousMonth ? ((latestMonth.total_kt / previousMonth.total_kt) - 1) * 100 : 0;
  const trendLabel = change90 > 10 ? "Clearly up" : change90 < -10 ? "Clearly down" : "Broadly flat";
  const trendDetail = change90 > 10 ? "higher" : change90 < -10 ? "lower" : "little changed";
  const clearanceDate = new Date(`${data.clearance_through}T12:00:00Z`);
  const clearanceMonth = clearanceDate.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const nextCloseDate = new Date(Date.UTC(clearanceDate.getUTCFullYear(), clearanceDate.getUTCMonth() + 1, 1));
  const nextCloseMonth = nextCloseDate.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const provisionalKt = sum(data.completed_vessels.filter((item) => item.etd.slice(0, 10) > data.clearance_through).map((item) => item.cargo_tonnes)) / 1000;
  const latestIdentified = [...data.completed_vessels, ...data.arrivals].map((item) => item.etd).filter(Boolean).sort().at(-1);
  const latestIdentifiedLabel = latestIdentified ? new Date(latestIdentified).toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "America/Bahia" }) : "current schedule";
  const latest90Range = data.monthly.slice(-3).map((month) => month.label).filter(Boolean);
  const prior90Range = data.monthly.slice(-6, -3).map((month) => month.label).filter(Boolean);

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
        <button className={tab === "supply" ? "active" : ""} onClick={() => setTab("supply")}>Crackers &amp; supply</button>
        <button className={tab === "ledger" ? "active" : ""} onClick={() => setTab("ledger")}>Data ledger</button>
      </nav>

      {tab === "arrivals" && <>
        <section className="hero-grid">
          <div><p className="eyebrow accent">NEXT IDENTIFIED CALLS</p><h2>The Brazil naphtha arrival board.</h2><p className="lede">Known cargoes into Braskem&apos;s primary marine gateways, separated from the monthly customs record so planned and completed tonnes are never mixed.</p></div>
          <aside className="pulse-card"><p>TRAILING 90-DAY SIGNAL</p><strong>{trendLabel}</strong><span>{fmtKt(latest90)} kt · {change90 >= 0 ? "+" : ""}{fmtKt(change90)}% vs prior 3-month window</span></aside>
        </section>

        <div className="filter-row" aria-label="Filter arrival board by port">
          <span>PORT</span>
          {(["all", "aratu", "osorio"] as const).map((value) => <button key={value} className={port === value ? "active" : ""} onClick={() => setPort(value)}>{value === "all" ? "All gateways" : value === "aratu" ? "Aratu / Camaçari" : "Osório / Triunfo"}</button>)}
        </div>
        {filteredArrivals.length ? <ArrivalBoard items={filteredArrivals} /> : <div className="empty-state"><strong>No identifiable Osório calls in the live feed.</strong><span>Rio Grande do Sul is included in the monthly customs history. A vessel-level Transpetro/AIS adapter is still needed for the offshore buoy.</span></div>}

        <section className="metric-grid arrivals-metrics">
          <Metric label="COMPLETED TRACKED CALLS" value={fmtKt(completedKt)} unit="KT" detail={`${data.completed_vessels.length} identified Aratu receipts since August`} />
          <Metric label="DISCHARGING NOW" value={fmtKt(underwayKt)} unit="KT" detail="Not counted as completed" tone="acid" />
          <Metric label="FORWARD SCHEDULED" value={fmtKt(scheduledKt)} unit="KT" detail="Anchored + expected calls" />
          <Metric label={`IDENTIFIED THROUGH ${latestIdentifiedLabel.toUpperCase()}`} value={fmtKt(completedKt + underwayKt + scheduledKt)} unit="KT" detail="Gross physical receipts" tone="dark" />
        </section>

        <section className="split-grid">
          <article><p className="eyebrow">FLEET COMPOSITION</p><h3>Future vs. third-party</h3><div className="split-bar"><i style={{ width: `${(futureKt / fleetTotalKt) * 100}%` }} /></div><div className="split-labels"><span><b>{fmtKt(futureKt)} kt</b> Future fleet</span><span><b>{fmtKt(thirdPartyKt)} kt</b> Third-party</span></div></article>
          <article><p className="eyebrow">THESIS CHECK</p><h3>The 90-day import pace is {trendDetail}.</h3><p>{latestMonth?.label} customs imports were {priorMonthChange >= 0 ? "+" : ""}{fmtKt(priorMonthChange)}% versus {previousMonth?.label}. Vessel calls after the {clearanceMonth} customs close remain provisional until the next ANP file is released.</p></article>
        </section>
      </>}

      {tab === "history" && <>
        <section className="section-head"><div><p className="eyebrow accent">2026 RECONCILIATION</p><h2>One controlling monthly record.</h2><p className="lede">NCM 27101241 · Braskem S.A. · kilograms cleared through Salvador and Porto Alegre customs.</p></div><div className="period-switch"><button className={period === "monthly" ? "active" : ""} onClick={() => setPeriod("monthly")}>Monthly</button><button className={period === "weekly" ? "active" : ""} onClick={() => setPeriod("weekly")}>Weekly</button></div></section>
        <section className="metric-grid history-metrics">
          <Metric label={`2026 YTD · JAN–${clearanceMonth.toUpperCase()}`} value={fmtKt(ytd)} unit="KT" detail="Exact customs kilograms" tone="dark" />
          <Metric label="TRAILING 30-DAY PROXY" value={fmtKt(latestMonth?.total_kt || 0)} unit="KT" detail={`${clearanceMonth} completed month`} />
          <Metric label="TRAILING 90-DAY PROXY" value={fmtKt(latest90)} unit="KT" detail={`${latest90Range.at(0)}–${latest90Range.at(-1)} completed months`} />
          <Metric label="90D VS PRIOR 90D" value={`${change90 >= 0 ? "+" : ""}${fmtKt(change90)}%`} detail={`${trendLabel} vs ${prior90Range.at(0)}–${prior90Range.at(-1)}`} tone="acid" />
        </section>
        {period === "monthly" ? <><MonthlyChart months={data.monthly} /><HistoryTable months={data.monthly} provisional={provisionalKt} provisionalLabel={nextCloseMonth} /></> : <WeeklyChart items={data.completed_vessels} />}
      </>}

      {tab === "supply" && <>
        <section className="section-head supply-head"><div><p className="eyebrow accent">BRAZIL FEEDSTOCK BALANCE</p><h2>Cracker capacity and contracted supply.</h2><p className="lede">The fleet total is reported. Site utilization is an allocation estimate anchored to disclosed outages, feed constraints and the reported national ethylene total.</p></div><aside className="supply-equation"><span>2025 MIDPOINT</span><strong>5.8 − 2.7 = 3.1</strong><small>Mt naphtha need − Petrobras supply = overseas / other suppliers</small></aside></section>

        <section className="metric-grid supply-metrics">
          <Metric label="FOSSIL ETHYLENE CAPACITY" value="3.752" unit="MT/Y" detail="Six olefins units across four complexes" tone="dark" />
          <Metric label="NAPHTHA-CRACKER UTILIZATION · 2025E" value="≈67%" detail="Bahia + RS + São Paulo" />
          <Metric label="PETROCHEMICAL NAPHTHA NEED" value="5.5–6.2" unit="MT/Y" detail="After condensate and other substitutions" />
          <Metric label="OVERSEAS / OTHER-SUPPLIER GAP" value="2.8–3.5" unit="MT/Y" detail="Central estimate ≈3.1 Mt/y" tone="acid" />
        </section>

        <section className="analysis-block">
          <div className="analysis-title"><div><p className="eyebrow">STEAM CRACKER SUMMARY</p><h3>Capacity, estimated utilization and physical feed route</h3></div><span className="estimate-key">E = estimate · site uncertainty ≈ ±5–8 pp</span></div>
          <CrackerTable />
          <p className="source-note">The separate 275 kt/y ethanol-to-ethylene unit at Triunfo is excluded. Reported national totals and feedstock disclosures: <a href={MODEL_SOURCES.braskem20f} target="_blank" rel="noreferrer">Braskem 2025 Form 20-F ↗</a></p>
        </section>

        <section className="analysis-block">
          <div className="analysis-title"><div><p className="eyebrow">PETROBRAS CONTRACT RESET</p><h3>What changed from the 2021–25 structure</h3></div><span className="estimate-key">New naphtha term: 2026–30</span></div>
          <ContractTable />
          <div className="contract-callout"><strong>Contract ceiling ≠ expected delivery.</strong><span>The 4.116 Mt 2026 headline includes optional and negotiable volumes. Petrobras reported naphtha sales of about 2.9 Mt in 2025, so the monitor should continue to expect substantial imports.</span></div>
          <p className="source-note">Terms: <a href={MODEL_SOURCES.contract6k} target="_blank" rel="noreferrer">Braskem contract filing ↗</a> · <a href={MODEL_SOURCES.petrobrasContracts} target="_blank" rel="noreferrer">Petrobras announcement ↗</a></p>
        </section>

        <section className="route-note"><span>MONITORING CONSEQUENCE</span><strong>Not every Petrobras vessel is an import, and not every Petrobras delivery is visible on a vessel board.</strong><p>Tag foreign-origin imports, Brazilian coastal cargoes and refinery/pipeline deliveries separately. São Paulo and REFAP pipeline volumes will not appear as international calls; Petrobras coastal cargoes into Aratu or Rio Grande must not be added to customs imports.</p></section>
      </>}

      {tab === "ledger" && <>
        <section className="section-head ledger-head"><div><p className="eyebrow accent">AUDITABLE BY DESIGN</p><h2>Source and reconciliation ledger.</h2><p className="lede">Every number is tagged by source and state. Estimates can inform the live board; only official clearances close a month.</p></div></section>
        <section className="source-grid">
          {SOURCES.map((source) => <a href={source.url} target="_blank" rel="noreferrer" className="source-card" key={source.name}><span className={`grade grade-${source.grade.toLowerCase()}`}>{source.grade}</span><div><p>{source.state} · {source.cadence}</p><h3>{source.name}</h3><span>{source.role}</span></div><b aria-hidden="true">↗</b></a>)}
        </section>
        <section className="rules-card">
          <div><p className="eyebrow">RECONCILIATION RULES</p><h3>How a tonne moves through the monitor</h3></div>
          <ol><li><b>Schedule</b><span>CODEBA identifies a vessel, berth, operator and planned cargo tonnes.</span></li><li><b>Completion</b><span>A vessel moves into history only after its port call completes; DWT is never used as cargo volume.</span></li><li><b>Customs close</b><span>ANP clearances replace vessel estimates at month-end and establish importer and country of origin.</span></li><li><b>Domestic versus import</b><span>Brazilian coastal cargoes and refinery/pipeline deliveries are supply, but they are not counted as imports.</span></li></ol>
        </section>
        <section className="gap-card"><span>KNOWN GAP</span><strong>Osório attribution and Petrobras coastal-cargo classification</strong><p>The customs file captures Braskem&apos;s Rio Grande do Sul imports, but the offshore buoy schedule does not expose cargo and consignee as cleanly as CODEBA. A licensed AIS/cargo feed is still needed to resolve voyage origin and to distinguish foreign imports from Petrobras coastal supply reliably.</p></section>
      </>}
    </main>
  );
}
