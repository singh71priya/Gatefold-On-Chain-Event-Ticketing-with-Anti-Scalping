# Screenshots to capture for submission

Save these into `docs/screenshots/` and reference them in your README or
submission form.

1. **Mobile responsive UI** — open the deployed Vercel/Netlify URL in Chrome
   DevTools device mode (iPhone 14 or similar, 390px width) and screenshot
   the Box office view and the Check-in scanner view.

2. **CI/CD pipeline running** — push a commit, open the **Actions** tab on
   GitHub, screenshot a green run showing both the `contracts` and `frontend`
   jobs passing.

3. **Test output, 3+ passing tests** — run `cargo test --workspace` in your
   terminal and screenshot the summary line (should show 13 passed). Also
   run `npm run test` in `frontend/` and screenshot Vitest's summary
   (6 passed).

4. **A real transaction** — after running `scripts/sample_interaction.sh`,
   open the tx hash on
   [Stellar Expert testnet explorer](https://stellar.expert/explorer/testnet)
   and screenshot the confirmed transaction page.

5. **A rejected scalping attempt** — screenshot the error banner in the app
   (or the CLI output) showing a resale rejected for exceeding the price cap
   — this is your strongest differentiator, worth capturing explicitly.
