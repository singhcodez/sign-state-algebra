import { Visualizer } from './Visualizer';
import { Workbench } from './Workbench';

export type NotationMode = 'paper' | 'code';
export type ActiveView = 'visualizer' | 'workbench';

export class App {
  private root: HTMLElement;
  private notation: NotationMode = 'paper';
  private activeView: ActiveView = 'visualizer';
  private visualizer!: Visualizer;
  private workbench!: Workbench;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  mount(): void {
    this.root.innerHTML = `
      <header class="app-header card">
        <div class="brand">
          <h1>Sign-State Algebra</h1>
          <span class="subtitle" id="notationSubtitle">Geometric Glyphs (⊖, ⊕, ⊗) → (e₁, e₂) Split Runtime</span>
        </div>
        <div class="header-controls">
          <div class="pill-group" role="group" aria-label="View Switcher">
            <button type="button" class="pill active" data-view="visualizer">2D / 4D Visualizer</button>
            <button type="button" class="pill" data-view="workbench">DSP &amp; Benchmark</button>
          </div>
          <button type="button" class="btn-secondary" id="btnToggleNotation">
            Mode: Paper (⊖, ⊕, ⊗)
          </button>
        </div>
      </header>

      <main id="viewVisualizer"></main>
      <main id="viewWorkbench" hidden></main>
    `;

    const visHost = this.root.querySelector<HTMLElement>('#viewVisualizer')!;
    const wbHost = this.root.querySelector<HTMLElement>('#viewWorkbench')!;

    this.visualizer = new Visualizer(visHost);
    this.workbench = new Workbench(wbHost);

    this.visualizer.mount();
    this.workbench.mount();

    this.bindEvents();
  }

  private bindEvents(): void {
    const viewButtons = this.root.querySelectorAll<HTMLButtonElement>('[data-view]');
    const visHost = this.root.querySelector<HTMLElement>('#viewVisualizer')!;
    const wbHost = this.root.querySelector<HTMLElement>('#viewWorkbench')!;

    viewButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.view as ActiveView;
        if (target === this.activeView) return;

        this.activeView = target;
        viewButtons.forEach((b) => b.classList.toggle('active', b.dataset.view === target));

        visHost.hidden = target !== 'visualizer';
        wbHost.hidden = target !== 'workbench';

        if (target === 'visualizer') {
          this.visualizer.refreshLayout();
        }
      });
    });

    const toggleBtn = this.root.querySelector<HTMLButtonElement>('#btnToggleNotation')!;
    const subtitle = this.root.querySelector<HTMLElement>('#notationSubtitle')!;

    toggleBtn.addEventListener('click', () => {
      this.notation = this.notation === 'paper' ? 'code' : 'paper';
      toggleBtn.textContent =
        this.notation === 'paper' ? 'Mode: Paper (⊖, ⊕, ⊗)' : 'Mode: Code (1m, 1p, 1mp)';
      subtitle.textContent =
        this.notation === 'paper'
          ? 'Geometric Glyphs (⊖, ⊕, ⊗) → (e₁, e₂) Split Runtime'
          : 'ASCII Suffixes (1m, 1p, 1mp) → (e₁, e₂) Split Runtime';

      this.visualizer.setNotation(this.notation);
      this.workbench.setNotation(this.notation);
    });
  }
}
