/**
 * rng.ts — deterministic seeded PRNG (mulberry32) for the demo data generator.
 *
 * Every stochastic choice in generate-demo-data.ts MUST route through a
 * single instance of this class so that re-running the generator with the
 * same seed produces byte-identical JSON. No Math.random, no
 * crypto.randomUUID, no Date.now anywhere in the generator — this is the
 * ONLY source of randomness / id derivation for seed data.
 */

const DEFAULT_SEED = 0xc0ffee;

export class SeededRng {
  private state: number;

  constructor(seed: number = DEFAULT_SEED) {
    this.state = seed >>> 0;
  }

  /** Next float in [0, 1). */
  rand(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max], inclusive on both ends. */
  randInt(min: number, max: number): number {
    return Math.floor(this.rand() * (max - min + 1)) + min;
  }

  /** Random element of a non-empty array. */
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) {
      throw new Error("[rng] pick() called with an empty array");
    }
    return arr[this.randInt(0, arr.length - 1)];
  }

  /** True with probability p (0..1). */
  chance(p: number): boolean {
    return this.rand() < p;
  }

  private randByte(): number {
    return Math.floor(this.rand() * 256);
  }

  /**
   * Deterministic v4-shaped UUID string, derived entirely from this PRNG's
   * byte stream (NOT crypto-secure — this is synthetic demo data, not a
   * security-relevant identifier). Version/variant bits are set so the
   * string parses as a valid UUID for Postgres `uuid` columns.
   */
  uuid(): string {
    const bytes: number[] = [];
    for (let i = 0; i < 16; i++) bytes.push(this.randByte());
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
    const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
}

export const DEFAULT_SEED_VALUE = DEFAULT_SEED;
