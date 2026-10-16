# Prototype Instructions

## Confirmed project direction

- Chinese personal poetry competition preparation site, named 温故.
- Use the combined visual target in `docs/design/approved-reference.png`: ivory/pine green, sidebar, daily plan and poem masking preview; mobile bottom navigation.
- Integrate daily spaced review, progressive character masking, timed individual recall, typed answer grading, and mistake practice. User approved this combined direction on 2026-10-16.
- Exactly 200 works from the supplied CUC PDF, including modern poetry. Preserve source text and page provenance.
- Competition: buzzer format, first half of November; no exact day announced.
- User requested accurate pinyin and on2026-10-16 confirmed modern Mandarin plus common textbook readings, with no additional contest-specific pronunciations. Add a default-off ruby toggle on the existing Reader; hide syllables for masked characters. Preserve original corpus and cloud progress schema. Build-only dictionaries plus scoped corrections generate static annotations for all200 works; document disputed readings and provenance. See `docs/pinyin-review.md`.
- User requested GitHub hosting; deploy the static client through GitHub Pages. Current project is the authorized checkout.
- On2026-10-16 user requested overall UI/UX improvements and explicitly invoked ui-ux-pro-max. Preserve the approved palette and learning focus; prioritize mobile first-screen actions, retained directory search/return position, sticky reader controls and local font preference, and clear quiz timing/results. See `docs/superpowers/specs/2026-10-16-ui-ux-design.md`. Do not replace the current visual direction or change the progress/sync schema for presentation preferences.
- Browser fallback: user explicitly allowed independent Playwright verification after in-app browser connection failed.
- User requested cross-device progress and chose email login on2026-10-16. Extend the existing site with Supabase email/password authentication, explicit guest-progress import, account-isolated offline caches and conflict-safe synchronization. Do not claim cloud sync is live until the backend is connected and verified.
- Supabase backend `wengu-poetry` / `zlmpibqtsrdmhmlhxbsx` is provisioned in the user's default Free organization, Singapore region. Migration and live RLS/CAS checks passed. Public URL/key are GitHub repository Variables; never commit `.env.local` or management keys. User confirmed both Auth Site URL and Redirect URLs as the GitHub Pages root. Email confirmation remains enabled; default SMTP currently requires a project-team email. Release `f278537` is deployed. User completed email verification and login; live database confirms verified email, successful login and an initialized account progress snapshot. On2026-10-16 user explicitly confirmed matching progress on two real devices, completing acceptance; this evidence is user-reported, separate from successful mocked browser tests. See `docs/email-sync-qa.md`.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
