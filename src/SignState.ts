export type DivisionStatus =
  | 'EXACT'
  | 'PSEUDOINVERSE_E1_ONLY'
  | 'PSEUDOINVERSE_E2_ONLY'
  | 'ZERO_DIVISOR_NULL';

export interface DivisionResult {
  quotient: SignState;
  status: DivisionStatus;
  normE1: number;
  normE2: number;
}

export interface SplitChannels {
  u1: number;
  v1: number;
  u2: number;
  v2: number;
}

export class SignState {
  public readonly r: number;  // Scalar real (1)
  public readonly m: number;  // Circular unit (⊖ / 1m), ⊖² = -1
  public readonly p: number;  // Hyperbolic unit (⊕ / 1p), ⊕² = +1
  public readonly mp: number; // Combined unit (⊗ / 1mp), ⊗² = -1

  constructor(r = 0, m = 0, p = 0, mp = 0) {
    this.r = Object.is(r, -0) ? 0 : r;
    this.m = Object.is(m, -0) ? 0 : m;
    this.p = Object.is(p, -0) ? 0 : p;
    this.mp = Object.is(mp, -0) ? 0 : mp;
  }

  static fromSplit(u1: number, v1: number, u2: number, v2: number): SignState {
    return new SignState(
      0.5 * (u1 + u2),
      0.5 * (v1 + v2),
      0.5 * (u1 - u2),
      0.5 * (v1 - v2)
    );
  }

  static fromStereoChannels(
    leftReal: number,
    leftPhase: number,
    rightReal: number,
    rightPhase: number
  ): SignState {
    return new SignState(leftReal, leftPhase, rightReal, rightPhase);
  }

  static parse(expr: string): SignState {
    const cleaned = expr
      .replace(/⊖/g, 'm')
      .replace(/⊕/g, 'p')
      .replace(/⊗/g, 'mp')
      .replace(/\s+/g, '');

    if (!cleaned) return new SignState(0, 0, 0, 0);
    const tokens = cleaned.match(/[+-]?[^+-]+/g);
    if (!tokens) throw new Error(`Invalid expression: "${expr}"`);

    let r = 0;
    let m = 0;
    let p = 0;
    let mp = 0;

    for (const token of tokens) {
      const match = token.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)?)(mp|pm|m|p)?$/);
      if (!match) throw new Error(`Unrecognized term "${token}" in "${expr}"`);
      const [, coeffStr, unit] = match;
      const coeff =
        coeffStr === '' || coeffStr === '+'
          ? 1
          : coeffStr === '-'
            ? -1
            : parseFloat(coeffStr);

      if (!unit) r += coeff;
      else if (unit === 'm') m += coeff;
      else if (unit === 'p') p += coeff;
      else mp += coeff;
    }

    return new SignState(r, m, p, mp);
  }

  toSplit(): SplitChannels {
    return {
      u1: this.r + this.p,
      v1: this.m + this.mp,
      u2: this.r - this.p,
      v2: this.m - this.mp
    };
  }

  toStereoChannels() {
    return {
      left: { real: this.r, phase: this.m },
      right: { real: this.p, phase: this.mp }
    };
  }

  add(other: SignState): SignState {
    return new SignState(
      this.r + other.r,
      this.m + other.m,
      this.p + other.p,
      this.mp + other.mp
    );
  }

  sub(other: SignState): SignState {
    return new SignState(
      this.r - other.r,
      this.m - other.m,
      this.p - other.p,
      this.mp - other.mp
    );
  }

  mulDirect(other: SignState): SignState {
    return new SignState(
      this.r * other.r - this.m * other.m + this.p * other.p - this.mp * other.mp,
      this.r * other.m + this.m * other.r + this.p * other.mp + this.mp * other.p,
      this.r * other.p - this.m * other.mp + this.p * other.r - this.mp * other.m,
      this.r * other.mp + this.m * other.p + this.p * other.m + this.mp * other.r
    );
  }

  mul(other: SignState): SignState {
    const u1 = this.r + this.p;
    const v1 = this.m + this.mp;
    const u2 = this.r - this.p;
    const v2 = this.m - this.mp;

    const x1 = other.r + other.p;
    const y1 = other.m + other.mp;
    const x2 = other.r - other.p;
    const y2 = other.m - other.mp;

    const ru1 = u1 * x1 - v1 * y1;
    const rv1 = u1 * y1 + v1 * x1;
    const ru2 = u2 * x2 - v2 * y2;
    const rv2 = u2 * y2 + v2 * x2;

    return new SignState(
      0.5 * (ru1 + ru2),
      0.5 * (rv1 + rv2),
      0.5 * (ru1 - ru2),
      0.5 * (rv1 - rv2)
    );
  }

  divideSafe(divisor: SignState, eps = 1e-12): DivisionResult {
    const { u1, v1, u2, v2 } = this.toSplit();
    const { u1: x1, v1: y1, u2: x2, v2: y2 } = divisor.toSplit();

    const normE1 = x1 * x1 + y1 * y1;
    const normE2 = x2 * x2 + y2 * y2;
    const active1 = normE1 > eps;
    const active2 = normE2 > eps;

    const ru1 = active1 ? (u1 * x1 + v1 * y1) / normE1 : 0;
    const rv1 = active1 ? (v1 * x1 - u1 * y1) / normE1 : 0;
    const ru2 = active2 ? (u2 * x2 + v2 * y2) / normE2 : 0;
    const rv2 = active2 ? (v2 * x2 - u2 * y2) / normE2 : 0;

    const status: DivisionStatus =
      active1 && active2
        ? 'EXACT'
        : active1
          ? 'PSEUDOINVERSE_E1_ONLY'
          : active2
            ? 'PSEUDOINVERSE_E2_ONLY'
            : 'ZERO_DIVISOR_NULL';

    return {
      quotient: SignState.fromSplit(ru1, rv1, ru2, rv2),
      status,
      normE1,
      normE2
    };
  }

  toPaperString(precision = 4): string {
    return this.format(['', '⊖', '⊕', '⊗'], precision);
  }

  toCodeString(precision = 4): string {
    return this.format(['', 'm', 'p', 'mp'], precision);
  }

  private format(tags: [string, string, string, string], precision: number): string {
    const vals = [this.r, this.m, this.p, this.mp].map((v) =>
      Math.abs(v) < 1e-10 ? 0 : Number(v.toFixed(precision))
    );
    const parts: string[] = [];

    vals.forEach((val, idx) => {
      if (val === 0) return;
      const tag = tags[idx];
      const abs = Math.abs(val);
      const sign = val < 0 ? '-' : '+';
      const mag = tag !== '' && abs === 1 ? '' : `${abs}`;
      parts.push(
        parts.length === 0
          ? val < 0
            ? `-${mag}${tag}`
            : `${mag}${tag}`
          : `${sign} ${mag}${tag}`
      );
    });

    return parts.length > 0 ? parts.join(' ') : '0';
  }
}
