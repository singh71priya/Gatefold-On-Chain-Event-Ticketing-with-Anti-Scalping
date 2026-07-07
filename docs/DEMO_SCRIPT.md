# Demo video script (1–2 minutes)

Use this as a shot list when recording. Screen-record your browser + phone
(or a second device/emulator) for the check-in moment.

1. **(0:00–0:15) Hook** — Show the live app. "This is on-chain event
   ticketing with a hard resale price cap. A scalper physically cannot list
   above the cap — the contract rejects it."

2. **(0:15–0:35) Publish an event** — Switch to the Organizer view, connect
   wallet, publish an event with a 110% resale cap and 5% royalty. Show the
   transaction confirming and the live activity feed picking up
   `EventCreated`.

3. **(0:35–0:55) Mint and try to scalp** — Switch to Box office, mint a
   ticket at face value, show the QR code appear. Attempt to resell it above
   the cap — show the transaction get rejected with the price-cap error.
   Then resell it at a valid price and show it succeed, with the royalty
   line explained on screen.

4. **(0:55–1:15) Check-in** — Switch to the Check-in view (ideally on a
   phone), scan the QR code from the previous step, show `EntryVerified`
   land in the live feed instantly. Try scanning the same ticket again to
   show the one-way flip rejecting reuse.

5. **(1:15–1:30) Wrap-up** — Resize the browser to phone width to show
   mobile responsiveness, show `cargo test --workspace` passing, and show
   the GitHub Actions CI run green. "Full source, tests, and deployment
   scripts are in the repo."

Keep narration plain and specific — name what's on screen, not what it's
"powered by."
