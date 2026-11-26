# Sign-State Algebra (`⊖, ⊕, ⊗` / `1m, 1p, 1mp`)

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.24563087.svg)](https://doi.org/10.5281/zenodo.24563087)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

A visual reformulation and dual-basis computational architecture for **commutative tessarines** (bicomplex numbers).

- **Live Interactive App:** https://singhcodez.github.io/sign-state-algebra/
- **Zenodo Archive & DOI:** https://doi.org/10.5281/zenodo.24563087

---

## Overview

Traditional hypercomplex notations rely on opaque letters (`i, j, k`) that conceal sign-squaring mechanics from learners and introduce `4×4` matrix boilerplate in multi-channel signal processing. **Sign-State Algebra** decouples human notation from machine execution:

1. **Human Front-End (`⊖, ⊕, ⊗` on paper / `1m, 1p, 1mp` in code):** Encodes squaring rules directly into collision-free markers (`⊖² = -1`, `⊕² = +1`, `⊗² = -1`, `⊖⊕ = ⊗`).
2. **Machine Back-End (`(e₁, e₂)` Idempotent Split Basis):** Compiles expressions in $O(1)$ additions into decoupled complex channels $e_1 = \frac{1 + \oplus}{2}$ and $e_2 = \frac{1 - \oplus}{2}$, halving scalar multiplications and resolving diagonal light-cone zero divisors via channel-restricted pseudoinverses.

---

## Unit Squaring & Isomorphism Reference

| Paper Glyph | ASCII Code | Squaring Rule | Geometric Action | Cockle Tessarine (1848) |
| :---: | :---: | :---: | :--- | :---: |
| **1** | `1` | $1^2 = +1$ | Scalar identity baseline | $1$ |
| **⊖** | `1m` | $\ominus^2 = -1$ | $90^\circ$ counter-clockwise circular rotation | $i$ |
| **⊕** | `1p` | $\oplus^2 = +1$ | $45^\circ$ diagonal mirror reflection & Lorentz boost | $j$ |
| **⊗** | `1mp` | $\otimes^2 = -1$ | Combined rotation + reflection ($\ominus \times \oplus$) | $k$ |

---

## Repository Structure

```text
sign-state-algebra/
├── index.html                      # Root HTML shell for Vite + TypeScript app
├── package.json                    # Vite & TypeScript build scripts
├── tsconfig.json                   # Strict TypeScript compiler configuration
├── vite.config.ts                  # Vite bundler config for GitHub Pages
├── CITATION.cff                    # Machine-readable academic citation metadata
├── LICENSE                         # MIT License
├── README.md                       # Project documentation & quickstart
├── .github/
│   └── workflows/
│       ├── build-pdf.yml           # Auto-compiles paper/main.tex into main.pdf
│       └── deploy-pages.yml        # Builds & deploys Vite web app to GitHub Pages
├── src/
│   ├── vite-env.d.ts               # Vite client type declarations
│   ├── style.css                   # Responsive mobile/desktop dark theme
│   ├── SignState.ts                # Parser (1m/1p/1mp & ⊖/⊕/⊗) + (e₁, e₂) split engine
│   ├── Visualizer.ts               # 2D Circular/Lorentz, Light-Cone & 4D Canvas Explorer
│   ├── Workbench.ts                # Stereo Cross-Feed, Null-Cone Division & 3-Way Benchmark
│   ├── App.ts                      # View switcher & Paper/Code notation toggle
│   └── main.ts                     # Application entry point
└── paper/
    ├── main.tex                    # LaTeX manuscript (axioms, proofs & benchmarks)
    ├── references.bib              # BibTeX citations (Cardano, Hamilton, Cockle, Segre, Pei)
    └── figures/                    # High-resolution diagrams for LaTeX compilation
```

---

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Type-check and build production bundle
npm run build
```

### Automated Cloud Builds (GitHub Actions)
- **Web App:** Every push to `main` outside `paper/` triggers `.github/workflows/deploy-pages.yml` and updates https://singhcodez.github.io/sign-state-algebra/.
- **LaTeX Paper:** Every push to `paper/` triggers `.github/workflows/build-pdf.yml` and attaches the compiled `main.pdf` under the **Actions** tab.

---

## Citation

If you use this software, visualizer, or manuscript in your research, please cite:

```bibtex
@software{sign_state_algebra_2026,
  title   = {Sign-State Algebra ($\ominus, \oplus, \otimes$): A Visual Reformulation and Dual-Basis Computational Architecture for Commutative Tessarines},
  version = {1.0.0},
  year    = {2026},
  doi     = {10.5281/zenodo.24563087},
  url     = {[https://doi.org/10.5281/zenodo.24563087](https://doi.org/10.5281/zenodo.24563087)}
}
```
