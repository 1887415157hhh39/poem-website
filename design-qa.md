# Design QA

final result: passed

Source: `docs/design/approved-reference.png`, 1487 x 1058px.
Implementation: `docs/design/implementation-desktop.png`, viewport1440 x 1024 CSS px, deviceScaleFactor1.
Normalization: source resized to1440 x 1024; aspect discrepancy less than0.1%.
State: 今日计划、击鼓遮字；actual zero-start counters replace the mock sample counts intentionally.
Full comparison: `output/playwright/comparison-final.png`.
Focused comparison: `output/playwright/focus-final.png`, reading typography and masking controls.
Mobile: `docs/design/implementation-mobile.png`, viewport390 x 844, full-page capture.

## Findings and comparison history
- [P2, resolved] Initial V2 excerpt/heading typography was too small/light. Increased desktop excerpt to40px/500 and heading to64px/700. Final combined full/focus comparisons confirm readable hierarchy.
- [P2, resolved] Initial masking control was too wide and bottom CTA was split. Restored centered440px masking control and single centered clock/抢答 CTA; full reading is accessible through the poem title.
- [P1, resolved] Initial small muted text contrast failed. Darkened muted tokens/footer and settings notices. All six primary screens now pass axe WCAG2A/AA/2.1AA at desktop and mobile sizes.
- A transient font404 during asset generation was fixed by completing the local fonts and reloading. Final production console has zero errors and zero warnings.

## Required fidelity surfaces
- Fonts/typography: self-hosted OFL Noto Serif SC and Noto Sans SC subsets; both browser font faces loaded. Serif headings/poetry, sans controls; no cropped text.
- Spacing/layout:224px sidebar, three-stage path, daily-plan/poem split, centered masking/CTA. Mobile intentionally stacks content and uses bottom navigation. Same proportions and visible primary actions as the chosen visual.
- Colors/tokens: ivory#f8f7f3, pine#234b3c, sage#edf0e7, terracotta#b7623c. Small muted text deliberately darker for legibility.
- Images/assets: reference has no raster illustrations. All icons are genuine Phosphor library assets; brand is editable typography. No handmade SVG/image stand-ins. Deterministic flat fills replace image-generation texture.
- Copy/content: Chinese headings and learning journey preserved. Real counters start at zero, PDF page provenance retained, and competition remains11月上半月 without an invented exact date.

## Verified interactions
- Read/mask/reveal/self-rate; refresh retains learning progress.
- Correct typed answer with punctuation/space normalization; incorrect answer enters mistakes; correct retry removes it. One-question summary showed1/1.
- Mobile search finds8苏轼 works and4词 after filtering.
- Oral recall freezes timing before self-rating. Actual10-second timeout produces retry feedback.
- JSON export download; malformed import preserves current target; valid import restores target.
- Primary six views checked at1440x1024 and390x844: no horizontal overflow, zero axe WCAG2A/AA/2.1AA violations. Additional320px and834px home widths: no overflow.
- Production build verified under `/poem-website/`. All fonts/assets are same-origin; PDF returned200 with `%PDF-` header. Console:0errors,0warnings.
- Data/logic tests:11passed; template packaging checks:4passed.

## Follow-up polish
- P3: generated lettering and subtle paper texture differ slightly from deterministic browser fonts and flat surfaces.
- No P0/P1/P2 findings remain. Automated accessibility checks do not replace assistive-device user testing.
