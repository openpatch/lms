/**
 * Parts for the "build a computer" station, and the benchmark they are scored
 * by.
 *
 * The benchmark is meant to behave like a gaming benchmark of the 3DMark kind
 * without pretending to be one: the graphics card does most of the work, a
 * weak processor holds a strong card back (the two are combined as a weighted
 * harmonic mean, so the slower one dominates), too little memory costs a lot
 * while more than enough costs money and adds almost nothing, and storage
 * barely matters once it is not a hard disk.
 *
 * What the player sees is the datasheet — cores, GHz, generation, units,
 * video memory, GB. The catalogue is built so that the datasheet is a good
 * guide and a bad oracle, which is exactly the point the Kaufberatung of
 * Lektion 4.4 makes: an old processor with eight cores, a cheap card with
 * eight GB on it, 64 GB of slow memory and a 4 TB SSD are all numbers that
 * look big on the box and do nothing for the score.
 */

export type PartKind = "cpu" | "gpu" | "ram" | "storage";

export const PART_KINDS: PartKind[] = ["cpu", "gpu", "ram", "storage"];

export interface PartSpecs {
  cores?: number;
  ghz?: number;
  /** Generation of the design: newer gets more done per clock. */
  gen?: number;
  /** Graphics: compute units, and video memory in GB. */
  units?: number;
  vram?: number;
  /** Memory: size in GB, type, and clock in MHz. */
  gb?: number;
  ddr?: number;
  mhz?: number;
  /** Storage: what it is and how much it holds, in GB. */
  medium?: "hdd" | "sata" | "nvme";
  capacity?: number;
}

export interface PartOffer {
  id: string;
  kind: PartKind;
  name: string;
  price: number;
  specs: PartSpecs;
  /**
   * What the part does for the benchmark. A raw performance for processor
   * and graphics card, a factor for memory and storage. 0 for players until
   * they have answered.
   */
  perf: number;
}

const CPU_IPC: Record<number, number> = { 1: 0.7, 2: 0.85, 3: 1 };
const GPU_IPC: Record<number, number> = { 1: 0.6, 2: 0.8, 3: 1, 4: 1.3 };

function cpuPerf(s: PartSpecs): number {
  // Games use a handful of cores well and the rest hardly at all.
  return ((CPU_IPC[s.gen ?? 1] ?? 0.7) * (s.ghz ?? 1) * Math.sqrt(Math.min(s.cores ?? 1, 8))) / 3;
}

function gpuPerf(s: PartSpecs): number {
  // Too little video memory hurts; more than enough does not help.
  const memory = (s.vram ?? 0) < 6 ? 0.75 : 1;
  return ((s.units ?? 0) / 1000) * (GPU_IPC[s.gen ?? 1] ?? 0.6) * memory;
}

function ramFactor(s: PartSpecs): number {
  const gb = s.gb ?? 8;
  const size = gb < 8 ? 0.55 : gb < 16 ? 0.8 : gb < 32 ? 1 : 1.02;
  const speed = (s.ddr ?? 4) >= 5 ? 1.05 : 1;
  return size * speed;
}

function storageFactor(s: PartSpecs): number {
  return s.medium === "hdd" ? 0.9 : s.medium === "sata" ? 0.98 : 1;
}

function perfOf(kind: PartKind, specs: PartSpecs): number {
  switch (kind) {
    case "cpu":
      return cpuPerf(specs);
    case "gpu":
      return gpuPerf(specs);
    case "ram":
      return ramFactor(specs);
    case "storage":
      return storageFactor(specs);
  }
}

interface CatalogueEntry {
  id: string;
  kind: PartKind;
  name: string;
  price: number;
  specs: PartSpecs;
}

/** Made-up names on purpose: a real model number would be out of date by the
 *  next school year, and the station is about reading specs, not brands. */
export const CATALOGUE: CatalogueEntry[] = [
  { id: "c1", kind: "cpu", name: "Volt 2200", price: 69, specs: { cores: 2, ghz: 4.6, gen: 1 } },
  { id: "c2", kind: "cpu", name: "Volt 4400", price: 99, specs: { cores: 4, ghz: 3.6, gen: 2 } },
  { id: "c3", kind: "cpu", name: "Volt 6500", price: 179, specs: { cores: 6, ghz: 4.2, gen: 3 } },
  { id: "c4", kind: "cpu", name: "Volt 8100", price: 139, specs: { cores: 8, ghz: 3.0, gen: 1 } },
  { id: "c5", kind: "cpu", name: "Volt 12900", price: 429, specs: { cores: 12, ghz: 4.8, gen: 3 } },
  { id: "c6", kind: "cpu", name: "Volt 6800X", price: 229, specs: { cores: 6, ghz: 5.0, gen: 2 } },
  { id: "c7", kind: "cpu", name: "Volt 8700", price: 299, specs: { cores: 8, ghz: 4.6, gen: 3 } },

  { id: "g1", kind: "gpu", name: "Pixel 1030", price: 79, specs: { units: 384, vram: 2, gen: 1 } },
  { id: "g2", kind: "gpu", name: "Pixel 1650", price: 149, specs: { units: 896, vram: 4, gen: 2 } },
  { id: "g3", kind: "gpu", name: "Pixel 2060", price: 229, specs: { units: 1920, vram: 6, gen: 2 } },
  { id: "g4", kind: "gpu", name: "Pixel 3060", price: 319, specs: { units: 3584, vram: 12, gen: 3 } },
  { id: "g5", kind: "gpu", name: "Pixel 4060", price: 299, specs: { units: 3072, vram: 8, gen: 4 } },
  { id: "g6", kind: "gpu", name: "Pixel 710 Mega", price: 99, specs: { units: 192, vram: 8, gen: 1 } },
  { id: "g7", kind: "gpu", name: "Pixel 4070", price: 589, specs: { units: 5888, vram: 12, gen: 4 } },
  { id: "g8", kind: "gpu", name: "Pixel 3080", price: 699, specs: { units: 8704, vram: 10, gen: 3 } },

  { id: "r1", kind: "ram", name: "8 GB", price: 25, specs: { gb: 8, ddr: 4, mhz: 2666 } },
  { id: "r2", kind: "ram", name: "16 GB", price: 45, specs: { gb: 16, ddr: 4, mhz: 3200 } },
  { id: "r3", kind: "ram", name: "16 GB", price: 65, specs: { gb: 16, ddr: 5, mhz: 6000 } },
  { id: "r4", kind: "ram", name: "32 GB", price: 115, specs: { gb: 32, ddr: 5, mhz: 6000 } },
  { id: "r5", kind: "ram", name: "64 GB", price: 149, specs: { gb: 64, ddr: 4, mhz: 2666 } },
  { id: "r6", kind: "ram", name: "4 GB", price: 15, specs: { gb: 4, ddr: 4, mhz: 2400 } },

  { id: "s1", kind: "storage", name: "2 TB HDD", price: 55, specs: { medium: "hdd", capacity: 2000 } },
  { id: "s2", kind: "storage", name: "1 TB SSD", price: 55, specs: { medium: "sata", capacity: 1000 } },
  { id: "s3", kind: "storage", name: "1 TB SSD", price: 65, specs: { medium: "nvme", capacity: 1000 } },
  { id: "s4", kind: "storage", name: "4 TB SSD", price: 229, specs: { medium: "nvme", capacity: 4000 } },
  { id: "s5", kind: "storage", name: "8 TB HDD", price: 149, specs: { medium: "hdd", capacity: 8000 } },
];

/** A catalogue entry at the price it is offered for this time. */
export function offer(entry: CatalogueEntry, price: number): PartOffer {
  return { ...entry, specs: { ...entry.specs }, price, perf: perfOf(entry.kind, entry.specs) };
}

/** Graphics weighs three times what the processor weighs, as in a gaming benchmark. */
const GPU_WEIGHT = 0.75;

/** The benchmark score of one part of each kind. */
export function benchmark(parts: PartOffer[]): number {
  const byKind = (kind: PartKind) => parts.find((part) => part.kind === kind);
  const cpu = byKind("cpu");
  const gpu = byKind("gpu");
  const ram = byKind("ram");
  const storage = byKind("storage");
  if (!cpu || !gpu || !ram || !storage || cpu.perf <= 0 || gpu.perf <= 0) return 0;
  const core = 1 / (GPU_WEIGHT / gpu.perf + (1 - GPU_WEIGHT) / cpu.perf);
  return Math.round(1000 * core * ram.perf * storage.perf);
}

export function totalPrice(parts: PartOffer[]): number {
  return parts.reduce((sum, part) => sum + part.price, 0);
}

/** The parts a set of picks names, one per kind and in kind order, or null
 *  when the picks do not make a whole computer out of what was offered. */
export function resolvePicks(offers: PartOffer[], picks: unknown): PartOffer[] | null {
  if (!Array.isArray(picks) || picks.length !== PART_KINDS.length) return null;
  const parts: PartOffer[] = [];
  for (let i = 0; i < PART_KINDS.length; i++) {
    const part = offers.find((o) => o.id === picks[i] && o.kind === PART_KINDS[i]);
    if (!part) return null;
    parts.push(part);
  }
  return parts;
}

/** Every computer the offers can make, one part per kind. */
export function allBuilds(offers: PartOffer[]): PartOffer[][] {
  let builds: PartOffer[][] = [[]];
  for (const kind of PART_KINDS) {
    const options = offers.filter((o) => o.kind === kind);
    builds = builds.flatMap((build) => options.map((option) => [...build, option]));
  }
  return builds;
}
