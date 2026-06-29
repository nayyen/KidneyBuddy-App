---
phase: 02
slug: fluid-medication-tracking-with-reminders
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-26
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `--test` (no extra install needed) |
| **Config file** | none — test runner invoked via `node --import tsx --test src/test/*.test.ts` |
| **Quick run command** | `npm test` (backend only) |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test` + manual browser check at 375px/768px/1024px
- **Before `/gsd-verify-work`:** Full suite must be green + 6 success criteria met + real iPhone push test
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-fluid-01 | fluid-log | 2 | FLUID-01 | — | fluidLog.service creates entry with correct fields | unit | `npm test -- --test-name-pattern "fluidLog"` | ❌ Wave 0 | ⬜ pending |
| 02-fluid-02 | fluid-log | 2 | FLUID-02 | — | getDailyBalance returns correct masuk/keluar/delta | unit | `npm test -- --test-name-pattern "balance"` | ❌ Wave 0 | ⬜ pending |
| 02-fluid-03 | fluid-log | 2 | FLUID-03 | — | createEntry returns hasAbnormalCondition=true for 'keruh' | unit | `npm test -- --test-name-pattern "capd_condition"` | ❌ Wave 0 | ⬜ pending |
| 02-notif-02 | push | 1 | NOTIF-02 | T-02-sub | push_subscriptions.upsert creates separate row per endpoint | unit | `npm test -- --test-name-pattern "push_sub"` | ❌ Wave 0 | ⬜ pending |
| 02-fanout | remind | 3 | REMIND-02, REMIND-08 | — | sendToAllDevices fans out to N subscriptions | unit (mock web-push) | `npm test -- --test-name-pattern "fan.?out"` | ❌ Wave 0 | ⬜ pending |
| 02-encrypt | fluid-log | 2 | NFR-02 | T-02-enc | encrypt then decrypt returns original string | unit | `npm test -- --test-name-pattern "encrypt"` | ❌ Wave 0 | ⬜ pending |
| 02-responsive | shell | 1 | RESPONSIVE-04 | — | Layout correct at 375/768/1024/1280px | manual | Browser testing matrix | Manual only | ⬜ pending |
| 02-ios-push | push | 1 | NOTIF-03 | — | iOS shows Add-to-Home-Screen interstitial | manual | Real iPhone test | Manual only | ⬜ pending |
| 02-offline | fluid-log | 2 | FLUID-05 | — | Offline entry stored in IndexedDB | manual/e2e | Browser DevTools offline simulation | Manual only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/test/fluid.service.test.ts` — covers FLUID-01, FLUID-02, FLUID-03
- [ ] `backend/src/test/notification.fanout.test.ts` — covers REMIND-02, REMIND-08 (mock web-push)
- [ ] `backend/src/test/encryption.test.ts` — covers encrypt/decrypt round-trip
- [ ] `backend/src/test/pushSubscription.test.ts` — covers NOTIF-02 upsert-by-endpoint

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Layout correct at 375/768/1024/1280px | RESPONSIVE-04 | No automated test can verify multi-browser layout at exact breakpoints | Open Chrome DevTools, test at 375px (mobile), 768px (tablet), 1024px (desktop), 1280px (desktop wide). Test on Chrome mobile, Safari iOS, Chrome desktop, Firefox desktop |
| iOS shows Add-to-Home-Screen interstitial | NOTIF-03 | iOS behavior requires real device; simulators don't reflect push permission logic | On real iPhone: open app in Safari → verify interstitial prompts Add to Home Screen → add → open from home screen → verify notification permission request works |
| Offline entry stored in IndexedDB | FLUID-05 | IndexedDB behavior requires real browser environment | Open browser DevTools → Network tab → set Offline → log a fluid entry → verify entry appears in IndexedDB → go back online → verify entry syncs to backend |
| Real push notification delivered at scheduled time | REMIND-02 | Requires real push subscription + backend cron firing | Create a reminder set 2 minutes from now → wait → verify push notification appears on device |
| Caregiver receives push on separate device | REMIND-08 | Requires two physical devices logged in with same credentials | Log in on Device A and Device B → create a reminder on Device A → wait for firing time → verify both devices receive the push |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
