import type { NotationMode } from './App';
import { SignState } from './SignState';

export class Workbench {
  private host: HTMLElement;
  private notation: NotationMode = 'paper';

  constructor(host: HTMLElement) {
    this.host = host;
  }

  mount(): void {
    this.host.innerHTML = `
      <div class="card">
        <h2>1. Stereo Audio Cross-Feed &amp; Null-Cone Division</h2>
        <p style="color: var(--muted); font-size: 0.9rem; margin-top: 0.25rem;">
          Packs Left (<code>r + m⊖</code>) and Right (<code>p + mp⊗</code>) channels into one Sign-State number and resolves <code>a = ±c</code> light-cone divisors via channel-restricted pseudoinverses.
        </p>
        <div class="wb-grid">
          <div>
            <label for="wbSig">Stereo Signal S</label>
            <input id="wbSig" value="3 + 2m + 1p + 4mp" />
          </div>
          <div>
            <label for="wbFlt">Filter Operator F</label>
            <input id="wbFlt" value="2m + 1mp" />
          </div>
        </div>
        <div class="control-row">
          <button type="button" id="btnRunDsp">Compute S × F and S ÷ F</button>
          <button type="button" class="btn-secondary" id="btnTestNullCone">Test Light-Cone Divisor (1 + ⊕)</button>
        </div>
        <div class="readout" id="wbOutput" style="margin-top: 0.85rem;"></div>
      </div>

      <div class="card">
        <h2>2. 3-Way Throughput Benchmark (1,000,000 Iterations)</h2>
        <p style="color: var(--muted); font-size: 0.9rem; margin-top: 0.25rem;">
          Compares (A) 4×4 Real Matrix multiplication vs. (B) Direct Polynomial SignState vs. (C) Decoupled <code>(e₁, e₂)</code> Split Engine.
        </p>
        <div class="control-row">
          <button type="button" id="btnRunBench">Run 3-Way Benchmark</button>
        </div>
        <div id="benchResult" style="margin-top: 0.85rem;"></div>
      </div>
    `;

    this.bindEvents();
    this.evaluateDsp();
  }

  setNotation(notation: NotationMode): void {
    this.notation = notation;
    this.evaluateDsp();
  }

  private format(s: SignState): string {
    return this.notation === 'paper' ? s.toPaperString(4) : s.toCodeString(4);
  }

  private evaluateDsp(): void {
    const out = this.host.querySelector<HTMLElement>('#wbOutput')!;
    try {
      const sVal = this.host.querySelector<HTMLInputElement>('#wbSig')!.value;
      const fVal = this.host.querySelector<HTMLInputElement>('#wbFlt')!.value;

      const S = SignState.parse(sVal);
      const F = SignState.parse(fVal);
      const prod = S.mul(F);
      const div = S.divideSafe(F);
      const ch = prod.toStereoChannels();

      const unitM = this.notation === 'paper' ? '⊖' : 'm';

      out.innerHTML = `
        <div><strong>Signal S:</strong> ${this.format(S)}</div>
        <div><strong>Filter F:</strong> ${this.format(F)}</div>
        <hr class="sep" />
        <div style="color: var(--success);">
          <strong>Product S × F:</strong> ${this.format(prod)}
          <span style="color: var(--muted);">
            (Left: ${ch.left.real} + ${ch.left.phase}${unitM}, Right: ${ch.right.real} + ${ch.right.phase}${unitM})
          </span>
        </div>
        <div style="color: var(--warning); margin-top: 0.3rem;">
          <strong>Quotient S ÷ F:</strong> ${this.format(div.quotient)} [${div.status}]
        </div>
      `;
    } catch (err) {
      out.textContent = err instanceof Error ? err.message : String(err);
    }
  }

  private runBenchmark(): void {
    const N = 1_000_000;
    const M = [
      [0, -2, 0, -1],
      [2, 0, 1, 0],
      [0, -1, 0, -2],
      [1, 0, 2, 0]
    ];

    // (A) 4x4 Real Matrix
    let v = [3, 2, 1, 4];
    const t0 = performance.now();
    for (let i = 0; i < N; i++) {
      const r0 = (M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2] + M[0][3] * v[3]) * 0.5;
      const r1 = (M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2] + M[1][3] * v[3]) * 0.5;
      const r2 = (M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2] + M[2][3] * v[3]) * 0.5;
      const r3 = (M[3][0] * v[0] + M[3][1] * v[1] + M[3][2] * v[2] + M[3][3] * v[3]) * 0.5;
      v = [r0, r1, r2, r3];
    }
    const dtMat = performance.now() - t0;

    // (B) Direct SignState Polynomial
    let a1 = 3, b1 = 2, c1 = 1, d1 = 4;
    const a2 = 0, b2 = 2, c2 = 0, d2 = 1;
    const t1 = performance.now();
    for (let i = 0; i < N; i++) {
      const na = (a1 * a2 - b1 * b2 + c1 * c2 - d1 * d2) * 0.5;
      const nb = (a1 * b2 + b1 * a2 + c1 * d2 + d1 * c2) * 0.5;
      const nc = (a1 * c2 - b1 * d2 + c1 * a2 - d1 * b2) * 0.5;
      const nd = (a1 * d2 + b1 * c2 + c1 * b2 + d1 * a2) * 0.5;
      a1 = na; b1 = nb; c1 = nc; d1 = nd;
    }
    const dtPoly = performance.now() - t1;

    // (C) Decoupled (e1, e2) Split Engine
    let u1 = 4, v1 = 6, u2 = 2, v2 = -2;
    const fu1 = 0, fv1 = 3, fu2 = 0, fv2 = 1;
    const t2 = performance.now();
    for (let i = 0; i < N; i++) {
      const nu1 = (u1 * fu1 - v1 * fv1) * 0.5;
      const nv1 = (u1 * fv1 + v1 * fu1) * 0.5;
      const nu2 = (u2 * fu2 - v2 * fv2) * 0.5;
      const nv2 = (u2 * fv2 + v2 * fu2) * 0.5;
      u1 = nu1; v1 = nv1; u2 = nu2; v2 = nv2;
    }
    const dtSplit = performance.now() - t2;

    if (v[0] === 999999 || a1 === 999999 || u1 === 999999) return;

    this.host.querySelector<HTMLElement>('#benchResult')!.innerHTML = `
      <table class="bench-table">
        <thead>
          <tr>
            <th>Execution Engine</th>
            <th>Scalar Ops / Step</th>
            <th>Elapsed (ms)</th>
            <th>Relative Speed</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>(A) 4×4 Real Matrix</td>
            <td>16 mult, 12 add</td>
            <td>${dtMat.toFixed(2)} ms</td>
            <td>1.00×</td>
          </tr>
          <tr>
            <td>(B) Direct SignState Poly</td>
            <td>16 mult, 12 add</td>
            <td>${dtPoly.toFixed(2)} ms</td>
            <td>${(dtMat / dtPoly).toFixed(2)}×</td>
          </tr>
          <tr class="highlight-row">
            <td>(C) (e₁, e₂) Split Engine</td>
            <td>8 mult, 6 add</td>
            <td>${dtSplit.toFixed(2)} ms</td>
            <td>${(dtMat / dtSplit).toFixed(2)}×</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  private bindEvents(): void {
    this.host.querySelector<HTMLButtonElement>('#btnRunDsp')!.addEventListener('click', () => {
      this.evaluateDsp();
    });

    this.host.querySelector<HTMLButtonElement>('#btnTestNullCone')!.addEventListener('click', () => {
      this.host.querySelector<HTMLInputElement>('#wbSig')!.value = '6 + 4m + 2p + 8mp';
      this.host.querySelector<HTMLInputElement>('#wbFlt')!.value = '1 + 1p';
      this.evaluateDsp();
    });

    this.host.querySelector<HTMLButtonElement>('#btnRunBench')!.addEventListener('click', () => {
      this.runBenchmark();
    });
  }
}
