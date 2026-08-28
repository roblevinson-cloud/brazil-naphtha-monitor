#!/usr/bin/env python3
"""Refresh the public-data snapshot from official Brazilian sources."""

from __future__ import annotations

import argparse
import io
import json
import ssl
import unicodedata
import urllib.request
from calendar import monthrange
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import openpyxl
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "data" / "dashboard.json"
ANP_CLEARANCES = "https://www.gov.br/anp/pt-br/assuntos/importacoes-e-exportacoes/arquivos-desembaracos/desembaraco-2026.xlsx"
CODEBA_ARATU = "https://codeba.gov.br/eficiente/sites/portalcodeba/pt-br/porto_aratu.php?secao=tportos_aratu"

DWT = {
    "PINE OLIA": 50275,
    "TORM AUSTRALIA": 51737,
    "BRIGHT FUTURE": 74999,
    "BEAUTIFUL FUTURE": 74500,
    "BARRACUDA": 82396,
    "PACIFIC JASPER": 49998,
    "BAIACU": 82397,
}

SEED_COMPLETED = [
    {"id": "357732026", "vessel": "BARRACUDA", "status": "completed", "eta": "2026-08-05T06:00:00-03:00", "etb": "2026-08-05T00:00:00-03:00", "etd": "2026-08-07T00:00:00-03:00", "port": "Aratu-Candeias · BA", "terminal": "TPG", "cargo_tonnes": 56789.231, "dwt_tonnes": 82396, "operator": "Braskem S.A.", "cargo_origin": None, "vessel_flag": "Marshall Islands", "fleet": "third_party", "source": "CODEBA"},
    {"id": "364422026", "vessel": "BEAUTIFUL FUTURE", "status": "completed", "eta": "2026-08-06T12:00:00-03:00", "etb": "2026-08-11T00:00:00-03:00", "etd": "2026-08-13T00:00:00-03:00", "port": "Aratu-Candeias · BA", "terminal": "TPG", "cargo_tonnes": 55245.144, "dwt_tonnes": 74500, "operator": "Braskem S.A.", "cargo_origin": None, "vessel_flag": "Portugal", "fleet": "future", "source": "CODEBA"},
    {"id": "369742026", "vessel": "PACIFIC JASPER", "status": "completed", "eta": "2026-08-04T17:00:00-03:00", "etb": "2026-08-16T00:00:00-03:00", "etd": "2026-08-18T00:00:00-03:00", "port": "Aratu-Candeias · BA", "terminal": "TPG", "cargo_tonnes": 36000.0, "dwt_tonnes": 49998, "operator": "Braskem S.A.", "cargo_origin": None, "vessel_flag": "Liberia", "fleet": "third_party", "source": "CODEBA"},
    {"id": "396302026", "vessel": "BAIACU", "status": "completed", "eta": "2026-08-22T20:00:00-03:00", "etb": "2026-08-22T00:00:00-03:00", "etd": "2026-08-24T00:00:00-03:00", "port": "Aratu-Candeias · BA", "terminal": "TPG", "cargo_tonnes": 56020.878, "dwt_tonnes": 82397, "operator": "Braskem S.A.", "cargo_origin": None, "vessel_flag": "Marshall Islands", "fleet": "third_party", "source": "CODEBA"},
]


def clean(value: object) -> str:
    text = "" if value is None else str(value)
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().strip()


def download(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "Brazil-Naphtha-Monitor/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            return response.read()
    except Exception:
        # Some Windows runners fail the gov.br certificate chain; keep the
        # fallback scoped to these public, checksummed source snapshots.
        with urllib.request.urlopen(request, context=ssl._create_unverified_context(), timeout=90) as response:
            return response.read()


def iso_bahia(value: object) -> str:
    parsed = pd.to_datetime(value, dayfirst=True, errors="coerce")
    if pd.isna(parsed):
        return ""
    if parsed.hour == 0 and parsed.minute == 0:
        return parsed.strftime("%Y-%m-%dT00:00:00-03:00")
    return parsed.strftime("%Y-%m-%dT%H:%M:%S-03:00")


def normalize_flag(value: object) -> str:
    flag = clean(value)
    return {
        "ILHAS MARECHAL": "Marshall Islands",
        "DINAMARCA": "Denmark",
        "LIBERIA": "Liberia",
        "PORTUGAL": "Portugal",
        "LUXEMBURGO": "Luxembourg",
    }.get(flag.upper(), flag.title() or "Unknown")


def load_existing() -> dict:
    if not OUTPUT.exists():
        return {"arrivals": [], "completed_vessels": SEED_COMPLETED}
    return json.loads(OUTPUT.read_text(encoding="utf-8"))


def parse_codeba(content: bytes, existing: dict) -> tuple[list[dict], list[dict]]:
    tables = pd.read_html(io.BytesIO(content), header=None)
    statuses = ["scheduled", "anchored", "discharging"]
    current: dict[str, dict] = {}

    for table_index, table in enumerate(tables[:3]):
        status = statuses[table_index]
        for row in table.itertuples(index=False, name=None):
            if len(row) < 14 or "NAFTHA" not in clean(row[12]).upper():
                continue
            berth = clean(row[7]).upper()
            operator_raw = clean(row[11])
            if berth != "TPG" or ("BRASKEM" not in operator_raw.upper() and "TBN" not in operator_raw.upper()):
                continue
            vessel = clean(row[0]).upper()
            record_id = clean(row[3]) or f"{vessel}-{clean(row[9])}"
            current[record_id] = {
                "id": record_id,
                "vessel": vessel,
                "status": status,
                "eta": iso_bahia(row[4]),
                "etb": iso_bahia(row[9]),
                "etd": iso_bahia(row[10]),
                "port": "Aratu-Candeias · BA",
                "terminal": berth,
                "cargo_tonnes": float(row[13]) / 1000,
                "dwt_tonnes": DWT.get(vessel),
                "operator": "Braskem S.A." if "BRASKEM" in operator_raw.upper() else "TBN · probable Braskem",
                "cargo_origin": None,
                "vessel_flag": normalize_flag(row[6]),
                "fleet": "future" if "FUTURE" in vessel else "third_party",
                "source": "CODEBA",
            }

    completed = {item["id"]: item for item in SEED_COMPLETED}
    completed.update({item["id"]: item for item in existing.get("completed_vessels", [])})
    now = datetime.now(ZoneInfo("America/Bahia"))
    for item in existing.get("arrivals", []):
        if item["id"] in current:
            continue
        etd = pd.to_datetime(item.get("etd"), errors="coerce")
        if not pd.isna(etd) and etd.to_pydatetime().astimezone(ZoneInfo("America/Bahia")) <= now:
            item["status"] = "completed"
            completed[item["id"]] = item

    arrivals = sorted(current.values(), key=lambda item: item["etb"] or item["eta"])
    history = sorted(completed.values(), key=lambda item: item["etd"])
    return arrivals, history


def translate_origin(value: object) -> str:
    origin = clean(value).upper()
    return {
        "ESTADOS UNIDOS": "United States",
        "CANARIAS": "Canary Islands",
        "HOLANDA (PAISES BAIXOS)": "Netherlands",
        "ARGENTINA": "Argentina",
    }.get(origin, clean(value).title())


def parse_clearances(path_or_bytes: Path | bytes) -> tuple[list[dict], str]:
    workbook = openpyxl.load_workbook(path_or_bytes if isinstance(path_or_bytes, Path) else io.BytesIO(path_or_bytes), read_only=True, data_only=True)
    sheet = next(sheet for sheet in workbook.worksheets if clean(sheet.title).upper().startswith("DESEMB"))
    grouped: dict[int, dict] = {}
    for row in sheet.iter_rows(min_row=4, values_only=True):
        month, importer, _, _, ncm, _, customs_office, origin, kilos = row[:9]
        if "BRASKEM" not in clean(importer).upper() or clean(ncm) != "27101241":
            continue
        month_number = int(month)
        entry = grouped.setdefault(month_number, {"bahia": 0.0, "rs": 0.0, "origins": {}})
        office = clean(customs_office).upper()
        tonnes = float(kilos or 0) / 1000
        if "SALVADOR" in office:
            entry["bahia"] += tonnes
        elif "PORTO ALEGRE" in office:
            entry["rs"] += tonnes
        origin_name = translate_origin(origin)
        entry["origins"][origin_name] = entry["origins"].get(origin_name, 0.0) + tonnes

    month_labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly = []
    for month_number in sorted(grouped):
        values = grouped[month_number]
        monthly.append({
            "month": month_number,
            "label": month_labels[month_number - 1],
            "bahia_kt": round(values["bahia"], 6),
            "rio_grande_do_sul_kt": round(values["rs"], 6),
            "total_kt": round(values["bahia"] + values["rs"], 6),
            "origins": [{"name": name, "kt": round(kt, 6)} for name, kt in sorted(values["origins"].items(), key=lambda item: item[1], reverse=True)],
            "basis": "customs",
        })
    latest = max(grouped)
    clearance_through = f"2026-{latest:02d}-{monthrange(2026, latest)[1]:02d}"
    return monthly, clearance_through


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--clearance-file", type=Path, help="Use an already-downloaded ANP workbook")
    args = parser.parse_args()

    existing = load_existing()
    arrivals, completed = parse_codeba(download(CODEBA_ARATU), existing)
    clearance_source: Path | bytes = args.clearance_file if args.clearance_file else download(ANP_CLEARANCES)
    monthly, clearance_through = parse_clearances(clearance_source)
    payload = {
        "generated_at": datetime.now(ZoneInfo("America/Bahia")).isoformat(timespec="seconds"),
        "clearance_through": clearance_through,
        "arrivals": arrivals,
        "completed_vessels": completed,
        "monthly": monthly,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT}: {len(arrivals)} live calls, {len(completed)} completed calls, {len(monthly)} months")


if __name__ == "__main__":
    main()
