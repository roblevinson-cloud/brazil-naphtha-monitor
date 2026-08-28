export type Arrival = {
  id: string;
  vessel: string;
  status: "scheduled" | "anchored" | "discharging" | "completed";
  eta: string;
  etb: string;
  etd: string;
  port: string;
  terminal: string;
  cargo_tonnes: number;
  dwt_tonnes: number | null;
  operator: string;
  cargo_origin: string | null;
  vessel_flag: string;
  fleet: "future" | "third_party";
  source: string;
};

export type MonthlyDelivery = {
  month: number;
  label: string;
  bahia_kt: number;
  rio_grande_do_sul_kt: number;
  total_kt: number;
  origins: { name: string; kt: number }[];
  basis: "customs" | "vessel_provisional";
};

export type MonitorData = {
  generated_at: string;
  clearance_through: string;
  arrivals: Arrival[];
  completed_vessels: Arrival[];
  monthly: MonthlyDelivery[];
};

export const initialData: MonitorData = {
  generated_at: "2026-08-27T21:30:00-03:00",
  clearance_through: "2026-07-31",
  arrivals: [
    {
      id: "388492026",
      vessel: "PINE OLIA",
      status: "discharging",
      eta: "2026-08-19T17:00:00-03:00",
      etb: "2026-08-27T00:00:00-03:00",
      etd: "2026-08-28T00:00:00-03:00",
      port: "Aratu-Candeias · BA",
      terminal: "TPG",
      cargo_tonnes: 27000,
      dwt_tonnes: 50275,
      operator: "Braskem S.A.",
      cargo_origin: null,
      vessel_flag: "Marshall Islands",
      fleet: "third_party",
      source: "CODEBA",
    },
    {
      id: "392262026",
      vessel: "TORM AUSTRALIA",
      status: "anchored",
      eta: "2026-08-24T10:24:00-03:00",
      etb: "2026-08-31T00:00:00-03:00",
      etd: "2026-09-01T00:00:00-03:00",
      port: "Aratu-Candeias · BA",
      terminal: "TPG",
      cargo_tonnes: 36369.299,
      dwt_tonnes: 51737,
      operator: "Braskem S.A.",
      cargo_origin: null,
      vessel_flag: "Denmark",
      fleet: "third_party",
      source: "CODEBA",
    },
    {
      id: "376862026",
      vessel: "BRIGHT FUTURE",
      status: "scheduled",
      eta: "2026-09-02T15:00:00-03:00",
      etb: "2026-09-04T00:00:00-03:00",
      etd: "2026-09-05T00:00:00-03:00",
      port: "Aratu-Candeias · BA",
      terminal: "TPG",
      cargo_tonnes: 28000,
      dwt_tonnes: 74999,
      operator: "Braskem S.A.",
      cargo_origin: null,
      vessel_flag: "Luxembourg",
      fleet: "future",
      source: "CODEBA",
    },
  ],
  completed_vessels: [
    {
      id: "357732026", vessel: "BARRACUDA", status: "completed", eta: "2026-08-05T06:00:00-03:00", etb: "2026-08-05T00:00:00-03:00", etd: "2026-08-07T00:00:00-03:00", port: "Aratu-Candeias · BA", terminal: "TPG", cargo_tonnes: 56789.231, dwt_tonnes: 82396, operator: "Braskem S.A.", cargo_origin: null, vessel_flag: "Marshall Islands", fleet: "third_party", source: "CODEBA"
    },
    {
      id: "364422026", vessel: "BEAUTIFUL FUTURE", status: "completed", eta: "2026-08-06T12:00:00-03:00", etb: "2026-08-11T00:00:00-03:00", etd: "2026-08-13T00:00:00-03:00", port: "Aratu-Candeias · BA", terminal: "TPG", cargo_tonnes: 55245.144, dwt_tonnes: 74500, operator: "Braskem S.A.", cargo_origin: null, vessel_flag: "Portugal", fleet: "future", source: "CODEBA"
    },
    {
      id: "369742026", vessel: "PACIFIC JASPER", status: "completed", eta: "2026-08-04T17:00:00-03:00", etb: "2026-08-16T00:00:00-03:00", etd: "2026-08-18T00:00:00-03:00", port: "Aratu-Candeias · BA", terminal: "TPG", cargo_tonnes: 36000, dwt_tonnes: 49998, operator: "Braskem S.A.", cargo_origin: null, vessel_flag: "Liberia", fleet: "third_party", source: "CODEBA"
    },
    {
      id: "396302026", vessel: "BAIACU", status: "completed", eta: "2026-08-22T20:00:00-03:00", etb: "2026-08-22T00:00:00-03:00", etd: "2026-08-24T00:00:00-03:00", port: "Aratu-Candeias · BA", terminal: "TPG", cargo_tonnes: 56020.878, dwt_tonnes: 82397, operator: "Braskem S.A.", cargo_origin: null, vessel_flag: "Marshall Islands", fleet: "third_party", source: "CODEBA"
    },
  ],
  monthly: [
    { month: 1, label: "Jan", bahia_kt: 141.394779, rio_grande_do_sul_kt: 139.609066, total_kt: 281.003845, origins: [{ name: "United States", kt: 222.47491 }, { name: "Canary Islands", kt: 58.528935 }], basis: "customs" },
    { month: 2, label: "Feb", bahia_kt: 150.524913, rio_grande_do_sul_kt: 160.046026, total_kt: 310.570939, origins: [{ name: "United States", kt: 274.462003 }, { name: "Canary Islands", kt: 36.108936 }], basis: "customs" },
    { month: 3, label: "Mar", bahia_kt: 237.502883, rio_grande_do_sul_kt: 82.758579, total_kt: 320.261462, origins: [{ name: "United States", kt: 282.699778 }, { name: "Canary Islands", kt: 37.561684 }], basis: "customs" },
    { month: 4, label: "Apr", bahia_kt: 93.686134, rio_grande_do_sul_kt: 112.636681, total_kt: 206.322815, origins: [{ name: "United States", kt: 169.922025 }, { name: "Canary Islands", kt: 36.40079 }], basis: "customs" },
    { month: 5, label: "May", bahia_kt: 95.245213, rio_grande_do_sul_kt: 0, total_kt: 95.245213, origins: [{ name: "United States", kt: 57.965585 }, { name: "Netherlands", kt: 37.279628 }], basis: "customs" },
    { month: 6, label: "Jun", bahia_kt: 205.791905, rio_grande_do_sul_kt: 0, total_kt: 205.791905, origins: [{ name: "United States", kt: 170.718379 }, { name: "Canary Islands", kt: 35.073526 }], basis: "customs" },
    { month: 7, label: "Jul", bahia_kt: 152.168904, rio_grande_do_sul_kt: 24.825037, total_kt: 176.993941, origins: [{ name: "United States", kt: 115.621163 }, { name: "Canary Islands", kt: 36.547741 }, { name: "Argentina", kt: 24.825037 }], basis: "customs" },
  ],
};
