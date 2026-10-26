# Verification

The public release passes 21 model tests and 10 Chromium browser tests.

## What the checks cover

- Hand-counted FIFO and two-server fixtures, shared versus separate queues, simultaneous events, service at a patience deadline and closing-time drain.
- Conservation across 40 seeds: arrivals equal served, departed, waiting and serving customers; intended plus accepted drinks equals served.
- Deterministic demand across staffing, queue and tolerance changes. Playback does not change results.
- A 60-second remake occupies its barista for another 60 seconds. A two-customer fixture independently checks queue waits, utilization and time to final drink.
- Counter stories appear only after events. Ordinary handovers fill quiet stretches at most once every two café minutes.
- All four experiments reject incompatible settings and give feedback on wrong answers. Staffing identifies the minimum team on two illustrative days.
- The nolal experiment uses the same 53 customers: remaking every mix-up produces 44 intended drinks and 9 walkouts; accepting every mix-up produces 39 intended drinks, 14 accepted mix-ups and no walkouts.
- Actual browser controls: start, pause, resume, staged edits, explicit apply, seed validation, replay, pinning, comparisons and all four experiments.
- Keyboard navigation, reduced motion, narrow 320px and 375px viewports, large queues and extreme waiting times. Numbers stay attached to their duration units.
- Browser console errors and unexpected external requests fail the checks. Screenshots are saved to ignored `artifacts/`.

Run `npm ci`, `npm run browsers:install`, `npm test` and `npm run test:browser`. CI installs the matching Chromium and system dependencies from the locked Playwright version.

The demo is an eight-second silent browser capture with a poster, controls and text description. It shows a live excerpt and then the completed comparison. It does not claim that a full run lasts eight seconds.

These checks are not a comprehensive screen-reader or cross-browser audit. All scenario probabilities are synthetic; the model is an educational toy, not a staffing forecast.
