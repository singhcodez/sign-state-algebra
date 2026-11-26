import type { NotationMode } from './App';
import { SignState } from './SignState';

type PlaneMode = 'circular' | 'hyperbolic' | '4d';
type BinaryOp = 'add' | 'sub' | 'mul' | 'div';

interface Point2D {
  x: number;
  y: number;
}

export class Visualizer {
  private host: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private resizeObserver?: ResizeObserver;

  private notation: NotationMode = 'paper';
  private mode: PlaneMode = 'circular';
  private ptA: Point2D = { x: 3, y: 1 };
  private ptB: Point2D = { x: 1, y: 2 };
  private showB = false;
  private activeOp: BinaryOp = 'mul';
  private param = 0;
  private showLightCones = true;
  private state4D = { r: 2, m: 1.5, p: 1, mp: 0.5 };

  private dragging: 'A' | 'B' | null = null;
  private autoPlayId: number | null = null;

  constructor(host: HTMLElement) {
    this.host = host;
  }

  mount(): void {
    this.host.innerHTML = `
      <div class="vis-layout">
        <div class="card vis-stage">
          <div class="pill-group" style="margin-bottom: 0.75rem;">
            <button type="button" class="pill active" data-pmode="circular">Circular (⊖)</button>
            <button type="button" class="pill" data-pmode="hyperbolic">Hyperbolic (⊕)</button>
            <button type="button" class="pill" data-pmode="4d">4D Tessarine Space</button>
          </div>
          <canvas id="simCanvas" height="420"></canvas>
        </div>

        <aside class="vis-sidebar">
          <div class="card">
            <h3>Live State Readout</h3>
            <div class="readout" id="visPrimaryReadout"></div>
            <div class="readout secondary" id="visSplitReadout"></div>
          </div>

          <div class="card" id="controls2D">
            <h3>2D Plane Controls (Drag Points on Grid)</h3>
            <div class="control-row">
              <label>A:</label>
              <input type="number" id="inAx" step="0.5" value="3" />
              <input type="number" id="inAy" step="0.5" value="1" />
              <button type="button" id="btnStepUnit">Multiply by ⊖</button>
            </div>
            <div class="control-row">
              <label class="check-label">
                <input type="checkbox" id="chkPointB" /> Point B:
              </label>
              <input type="number" id="inBx" step="0.5" value="1" />
              <input type="number" id="inBy" step="0.5" value="2" />
            </div>
            <div class="control-row" id="binaryOpRow" hidden>
              <button type="button" class="btn-secondary" data-bop="add">A + B</button>
              <button type="button" class="btn-secondary" data-bop="sub">A - B</button>
              <button type="button" class="btn-secondary" data-bop="mul">A × B</button>
              <button type="button" class="btn-secondary" data-bop="div">A ÷ B</button>
            </div>
            <div class="slider-block">
              <div class="slider-header">
                <span id="sliderLabel">Continuous Angle θ = 0°</span>
                <button type="button" class="btn-secondary" id="btnAutoCycle">Auto-Cycle</button>
              </div>
              <input type="range" id="paramSlider" min="-180" max="180" step="1" value="0" />
            </div>
            <div class="control-row" id="lightConeWrap" hidden>
              <label class="check-label">
                <input type="checkbox" id="chkLightCones" checked />
                Show y = ±x Null Light-Cones &amp; (e₁, e₂) Projections
              </label>
            </div>
            <div class="control-row">
              <button type="button" class="btn-secondary" id="btnZeroDivPreset">
                Zero-Divisor Preset: (1 + ⊕)(1 - ⊕)
              </button>
            </div>
          </div>

          <div class="card" id="controls4D" hidden>
            <h3>4D Axes: r + m⊖ + p⊕ + mp⊗</h3>
            <div class="slider-block">
              <label>Real (1): <strong id="lbl4r">2</strong></label>
              <input type="range" id="s4r" min="-4" max="4" step="0.5" value="2" />
            </div>
            <div class="slider-block">
              <label>Circular (⊖ / m): <strong id="lbl4m">1.5</strong></label>
              <input type="range" id="s4m" min="-4" max="4" step="0.5" value="1.5" />
            </div>
            <div class="slider-block">
              <label>Hyperbolic (⊕ / p): <strong id="lbl4p">1</strong></label>
              <input type="range" id="s4p" min="-4" max="4" step="0.5" value="1" />
            </div>
            <div class="slider-block">
              <label>Mixed (⊗ / mp): <strong id="lbl4mp">0.5</strong></label>
              <input type="range" id="s4mp" min="-4" max="4" step="0.5" value="0.5" />
            </div>
            <div class="control-row">
              <button type="button" id="btn4MulM">× ⊖</button>
              <button type="button" id="btn4MulP">× ⊕</button>
              <button type="button" id="btn4MulMP">× ⊗</button>
            </div>
          </div>
        </aside>
      </div>
    `;

    this.canvas = this.host.querySelector<HTMLCanvasElement>('#simCanvas')!;
    this.ctx = this.canvas.getContext('2d')!;

    this.resizeObserver = new ResizeObserver(() => this.refreshLayout());
    this.resizeObserver.observe(this.canvas);

    this.bindEvents();
    this.refreshLayout();
  }

  setNotation(notation: NotationMode): void {
    this.notation = notation;
    this.updateReadouts();
    this.draw();
  }

  refreshLayout(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  private formatState(s: SignState): string {
    return this.notation === 'paper' ? s.toPaperString(2) : s.toCodeString(2);
  }

  private getGridMetrics() {
    const w = this.canvas.clientWidth || 600;
    const h = this.canvas.clientHeight || 420;
    const scale = Math.min(w, h) / 11;
    return { w, h, cx: w / 2, cy: h / 2, scale };
  }

  private toScreen(x: number, y: number): { sx: number; sy: number } {
    const { cx, cy, scale } = this.getGridMetrics();
    return { sx: cx + x * scale, sy: cy - y * scale };
  }

  private fromScreen(sx: number, sy: number): Point2D {
    const { cx, cy, scale } = this.getGridMetrics();
    return {
      x: Math.round(((sx - cx) / scale) * 2) / 2,
      y: Math.round(((cy - sy) / scale) * 2) / 2
    };
  }

  private getContinuousTransform(): Point2D {
    if (this.mode === 'circular') {
      const rad = (this.param * Math.PI) / 180;
      const c = Math.cos(rad);
      const s = Math.sin(rad);
      return {
        x: this.ptA.x * c - this.ptA.y * s,
        y: this.ptA.x * s + this.ptA.y * c
      };
    }
    const ch = Math.cosh(this.param);
    const sh = Math.sinh(this.param);
    return {
      x: this.ptA.x * ch + this.ptA.y * sh,
      y: this.ptA.x * sh + this.ptA.y * ch
    };
  }

  private computeBinaryOp(): { pt: Point2D; status?: string } {
    const a =
      this.mode === 'circular'
        ? new SignState(this.ptA.x, this.ptA.y, 0, 0)
        : new SignState(this.ptA.x, 0, this.ptA.y, 0);
    const b =
      this.mode === 'circular'
        ? new SignState(this.ptB.x, this.ptB.y, 0, 0)
        : new SignState(this.ptB.x, 0, this.ptB.y, 0);

    if (this.activeOp === 'add') {
      const res = a.add(b);
      return { pt: { x: res.r, y: this.mode === 'circular' ? res.m : res.p } };
    }
    if (this.activeOp === 'sub') {
      const res = a.sub(b);
      return { pt: { x: res.r, y: this.mode === 'circular' ? res.m : res.p } };
    }
    if (this.activeOp === 'mul') {
      const res = a.mul(b);
      return { pt: { x: res.r, y: this.mode === 'circular' ? res.m : res.p } };
    }
    const div = a.divideSafe(b);
    return {
      pt: { x: div.quotient.r, y: this.mode === 'circular' ? div.quotient.m : div.quotient.p },
      status: div.status
    };
  }

  private drawVectorPoint(x: number, y: number, color: string, label: string): void {
    const { sx, sy } = this.toScreen(x, y);
    const { cx, cy } = this.getGridMetrics();

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.lineTo(sx, sy);
    this.ctx.stroke();

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, 7, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.font = 'bold 12px system-ui, sans-serif';
    this.ctx.fillText(`${label} (${x.toFixed(2)}, ${y.toFixed(2)})`, sx + 10, sy - 8);
  }

  private draw(): void {
    const { w, h, cx, cy, scale } = this.getGridMetrics();
    this.ctx.clearRect(0, 0, w, h);

    // Coordinate grid
    this.ctx.strokeStyle = '#1e293b';
    this.ctx.lineWidth = 1;
    for (let i = -8; i <= 8; i++) {
      const gx = this.toScreen(i, 0);
      this.ctx.beginPath();
      this.ctx.moveTo(gx.sx, 0);
      this.ctx.lineTo(gx.sx, h);
      this.ctx.stroke();

      const gy = this.toScreen(0, i);
      this.ctx.beginPath();
      this.ctx.moveTo(0, gy.sy);
      this.ctx.lineTo(w, gy.sy);
      this.ctx.stroke();
    }

    // Principal axes
    this.ctx.strokeStyle = '#475569';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, cy);
    this.ctx.lineTo(w, cy);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(cx, 0);
    this.ctx.lineTo(cx, h);
    this.ctx.stroke();

    if (this.mode === '4d') {
      const { r, m, p, mp } = this.state4D;
      const projX = r + 0.55 * p - 0.35 * mp;
      const projY = m + 0.45 * p + 0.65 * mp;
      this.drawVectorPoint(projX, projY, '#38bdf8', '4D Z');
      this.updateReadouts();
      return;
    }

    const axisTag =
      this.mode === 'circular'
        ? this.notation === 'paper'
          ? '⊖'
          : '1m'
        : this.notation === 'paper'
          ? '⊕'
          : '1p';

    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = '12px system-ui, sans-serif';
    this.ctx.fillText('+1', w - 26, cy - 8);
    this.ctx.fillText(`+${axisTag}`, cx + 8, 18);

    if (this.mode === 'circular') {
      const radius = Math.hypot(this.ptA.x, this.ptA.y);
      this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius * scale, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    } else if (this.showLightCones) {
      this.ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
      this.ctx.setLineDash([6, 4]);
      const d1 = this.toScreen(-7, -7);
      const d2 = this.toScreen(7, 7);
      this.ctx.beginPath();
      this.ctx.moveTo(d1.sx, d1.sy);
      this.ctx.lineTo(d2.sx, d2.sy);
      this.ctx.stroke();

      const d3 = this.toScreen(-7, 7);
      const d4 = this.toScreen(7, -7);
      this.ctx.beginPath();
      this.ctx.moveTo(d3.sx, d3.sy);
      this.ctx.lineTo(d4.sx, d4.sy);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      const e1Coord = (this.ptA.x + this.ptA.y) / 2;
      const e2Coord = (this.ptA.x - this.ptA.y) / 2;
      this.drawVectorPoint(e1Coord, e1Coord, '#34d399', 'e₁');
      this.drawVectorPoint(e2Coord, -e2Coord, '#a78bfa', 'e₂');
    }

    this.drawVectorPoint(this.ptA.x, this.ptA.y, '#38bdf8', 'A');

    if (Math.abs(this.param) > 1e-6) {
      const tr = this.getContinuousTransform();
      this.drawVectorPoint(tr.x, tr.y, '#34d399', this.mode === 'circular' ? 'Rot(θ)' : 'Boost(φ)');
    }

    if (this.showB) {
      this.drawVectorPoint(this.ptB.x, this.ptB.y, '#fbbf24', 'B');
      const { pt, status } = this.computeBinaryOp();
      const opLabel = status ? `${this.activeOp.toUpperCase()} [${status}]` : this.activeOp.toUpperCase();
      this.drawVectorPoint(pt.x, pt.y, '#f472b6', opLabel);
    }

    this.updateReadouts();
  }

  private updateReadouts(): void {
    const primary = this.host.querySelector<HTMLElement>('#visPrimaryReadout')!;
    const secondary = this.host.querySelector<HTMLElement>('#visSplitReadout')!;

    if (this.mode === '4d') {
      const z = new SignState(this.state4D.r, this.state4D.m, this.state4D.p, this.state4D.mp);
      const ch = z.toSplit();
      primary.textContent = `Z = ${this.formatState(z)}`;
      secondary.textContent = `e₁: (${ch.u1.toFixed(2)}, ${ch.v1.toFixed(2)}) | e₂: (${ch.u2.toFixed(2)}, ${ch.v2.toFixed(2)})`;
      return;
    }

    const sA =
      this.mode === 'circular'
        ? new SignState(this.ptA.x, this.ptA.y, 0, 0)
        : new SignState(this.ptA.x, 0, this.ptA.y, 0);

    primary.textContent = `A = ${this.formatState(sA)}`;
    if (this.mode === 'circular') {
      secondary.textContent = `Circular Norm |A|² = ${(this.ptA.x ** 2 + this.ptA.y ** 2).toFixed(2)}`;
    } else {
      secondary.textContent = `Split Channels: ${(this.ptA.x + this.ptA.y).toFixed(2)} e₁ + ${(this.ptA.x - this.ptA.y).toFixed(2)} e₂`;
    }
  }

  private stopAutoCycle(): void {
    if (this.autoPlayId !== null) {
      cancelAnimationFrame(this.autoPlayId);
      this.autoPlayId = null;
      const btn = this.host.querySelector<HTMLButtonElement>('#btnAutoCycle');
      if (btn) btn.textContent = 'Auto-Cycle';
    }
  }

  private bindEvents(): void {
    const modeButtons = this.host.querySelectorAll<HTMLButtonElement>('[data-pmode]');
    const c2d = this.host.querySelector<HTMLElement>('#controls2D')!;
    const c4d = this.host.querySelector<HTMLElement>('#controls4D')!;
    const slider = this.host.querySelector<HTMLInputElement>('#paramSlider')!;
    const sliderLabel = this.host.querySelector<HTMLElement>('#sliderLabel')!;
    const stepBtn = this.host.querySelector<HTMLButtonElement>('#btnStepUnit')!;
    const lcWrap = this.host.querySelector<HTMLElement>('#lightConeWrap')!;

    modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.stopAutoCycle();
        this.mode = btn.dataset.pmode as PlaneMode;
        modeButtons.forEach((b) => b.classList.toggle('active', b.dataset.pmode === this.mode));
        this.param = 0;
        slider.value = '0';

        c2d.hidden = this.mode === '4d';
        c4d.hidden = this.mode !== '4d';
        lcWrap.hidden = this.mode !== 'hyperbolic';

        if (this.mode === 'circular') {
          stepBtn.textContent = 'Multiply by ⊖';
          slider.min = '-180';
          slider.max = '180';
          slider.step = '1';
          sliderLabel.textContent = 'Continuous Angle θ = 0°';
        } else if (this.mode === 'hyperbolic') {
          stepBtn.textContent = 'Multiply by ⊕';
          slider.min = '-1.4';
          slider.max = '1.4';
          slider.step = '0.05';
          sliderLabel.textContent = 'Lorentz Boost φ = 0.00';
        }
        this.draw();
      });
    });

    stepBtn.addEventListener('click', () => {
      this.ptA =
        this.mode === 'circular'
          ? { x: -this.ptA.y, y: this.ptA.x }
          : { x: this.ptA.y, y: this.ptA.x };
      this.syncPointInputs();
      this.draw();
    });

    ['inAx', 'inAy', 'inBx', 'inBy'].forEach((id) => {
      this.host.querySelector<HTMLInputElement>(`#${id}`)!.addEventListener('input', () => {
        this.ptA.x = parseFloat(this.host.querySelector<HTMLInputElement>('#inAx')!.value) || 0;
        this.ptA.y = parseFloat(this.host.querySelector<HTMLInputElement>('#inAy')!.value) || 0;
        this.ptB.x = parseFloat(this.host.querySelector<HTMLInputElement>('#inBx')!.value) || 0;
        this.ptB.y = parseFloat(this.host.querySelector<HTMLInputElement>('#inBy')!.value) || 0;
        this.draw();
      });
    });

    this.host.querySelector<HTMLInputElement>('#chkPointB')!.addEventListener('change', (e) => {
      this.showB = (e.target as HTMLInputElement).checked;
      this.host.querySelector<HTMLElement>('#binaryOpRow')!.hidden = !this.showB;
      this.draw();
    });

    this.host.querySelectorAll<HTMLButtonElement>('[data-bop]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeOp = btn.dataset.bop as BinaryOp;
        this.draw();
      });
    });

    slider.addEventListener('input', () => {
      this.param = parseFloat(slider.value);
      sliderLabel.textContent =
        this.mode === 'circular'
          ? `Continuous Angle θ = ${this.param}°`
          : `Lorentz Boost φ = ${this.param.toFixed(2)}`;
      this.draw();
    });

    this.host.querySelector<HTMLButtonElement>('#btnAutoCycle')!.addEventListener('click', (e) => {
      const btn = e.target as HTMLButtonElement;
      if (this.autoPlayId !== null) {
        this.stopAutoCycle();
        return;
      }
      btn.textContent = 'Stop';
      let dir = 1;
      const tick = () => {
        if (this.mode === 'circular') {
          this.param = this.param >= 180 ? -180 : this.param + 1.5;
          slider.value = String(Math.round(this.param));
          sliderLabel.textContent = `Continuous Angle θ = ${Math.round(this.param)}°`;
        } else {
          this.param += 0.015 * dir;
          if (this.param > 1.35 || this.param < -1.35) dir *= -1;
          slider.value = this.param.toFixed(2);
          sliderLabel.textContent = `Lorentz Boost φ = ${this.param.toFixed(2)}`;
        }
        this.draw();
        this.autoPlayId = requestAnimationFrame(tick);
      };
      this.autoPlayId = requestAnimationFrame(tick);
    });

    this.host.querySelector<HTMLInputElement>('#chkLightCones')!.addEventListener('change', (e) => {
      this.showLightCones = (e.target as HTMLInputElement).checked;
      this.draw();
    });

    this.host.querySelector<HTMLButtonElement>('#btnZeroDivPreset')!.addEventListener('click', () => {
      this.host.querySelector<HTMLButtonElement>('[data-pmode="hyperbolic"]')!.click();
      this.ptA = { x: 1, y: 1 };
      this.ptB = { x: 1, y: -1 };
      this.showB = true;
      this.activeOp = 'mul';
      this.syncPointInputs();
      this.host.querySelector<HTMLInputElement>('#chkPointB')!.checked = true;
      this.host.querySelector<HTMLElement>('#binaryOpRow')!.hidden = false;
      this.draw();
    });

    // 4D axis sliders & unit buttons
    (['r', 'm', 'p', 'mp'] as const).forEach((axis) => {
      this.host.querySelector<HTMLInputElement>(`#s4${axis}`)!.addEventListener('input', (e) => {
        this.state4D[axis] = parseFloat((e.target as HTMLInputElement).value);
        this.host.querySelector<HTMLElement>(`#lbl4${axis}`)!.textContent = String(this.state4D[axis]);
        this.draw();
      });
    });

    const apply4DUnit = (unit: SignState) => {
      const cur = new SignState(this.state4D.r, this.state4D.m, this.state4D.p, this.state4D.mp);
      const next = cur.mul(unit);
      this.state4D = { r: next.r, m: next.m, p: next.p, mp: next.mp };
      (['r', 'm', 'p', 'mp'] as const).forEach((axis) => {
        this.host.querySelector<HTMLInputElement>(`#s4${axis}`)!.value = String(this.state4D[axis]);
        this.host.querySelector<HTMLElement>(`#lbl4${axis}`)!.textContent = String(this.state4D[axis]);
      });
      this.draw();
    };

    this.host.querySelector<HTMLButtonElement>('#btn4MulM')!.addEventListener('click', () =>
      apply4DUnit(new SignState(0, 1, 0, 0))
    );
    this.host.querySelector<HTMLButtonElement>('#btn4MulP')!.addEventListener('click', () =>
      apply4DUnit(new SignState(0, 0, 1, 0))
    );
    this.host.querySelector<HTMLButtonElement>('#btn4MulMP')!.addEventListener('click', () =>
      apply4DUnit(new SignState(0, 0, 0, 1))
    );

// Canvas pointer drag
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.mode === '4d') return;
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      const scrA = this.toScreen(this.ptA.x, this.ptA.y);
      if (Math.hypot(sx - scrA.sx, sy - scrA.sy) < 30) {
        this.dragging = 'A';
        return;
      }
      if (this.showB) {
        const scrB = this.toScreen(this.ptB.x, this.ptB.y);
        if (Math.hypot(sx - scrB.sx, sy - scrB.sy) < 30) {
          this.dragging = 'B';
        }
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const rect = this.canvas.getBoundingClientRect();
      const pt = this.fromScreen(e.clientX - rect.left, e.clientY - rect.top);
      if (this.dragging === 'A') this.ptA = pt;
      else this.ptB = pt;
      this.syncPointInputs();
      this.draw();
    });

    window.addEventListener('pointerup', () => {
      this.dragging = null;
    });
  }

  private syncPointInputs(): void {
    this.host.querySelector<HTMLInputElement>('#inAx')!.value = String(this.ptA.x);
    this.host.querySelector<HTMLInputElement>('#inAy')!.value = String(this.ptA.y);
    this.host.querySelector<HTMLInputElement>('#inBx')!.value = String(this.ptB.x);
    this.host.querySelector<HTMLInputElement>('#inBy')!.value = String(this.ptB.y);
  }
}