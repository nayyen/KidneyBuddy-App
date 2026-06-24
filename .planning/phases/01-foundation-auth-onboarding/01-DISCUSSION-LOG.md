# Phase 1: Foundation, Auth & Onboarding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-25
**Phase:** 1-foundation-auth-onboarding
**Areas discussed:** Scope gap (password reset), Format penjelasan "Apa ini?", Struktur alur onboarding, UX & nada saat akun terkunci

---

## Scope gap: password reset

| Option | Description | Selected |
|--------|-------------|----------|
| Tambahkan sekarang | Add AUTH-06: reset password via email link — high-risk gap if missing | ✓ |
| Defer ke v2 | Users who forget password contact admin manually for now | |

**User's choice:** Tambahkan sekarang
**Notes:** REQUIREMENTS.md had no forgot-password flow; without it users would be permanently locked out. Added as AUTH-06, mapped to Phase 1, committed before discussion continued.

---

## Format penjelasan "Apa ini?"

| Option | Description | Selected |
|--------|-------------|----------|
| Expand inline | Card grows downward to show explanation in place | ✓ |
| Modal/popover overlay | Dialog box appears on top of the page | |

**User's choice:** Expand inline

| Option | Description | Selected |
|--------|-------------|----------|
| 1-2 kalimat singkat | Short 1-2 sentence explanation per therapy method | ✓ |
| Poin-poin terstruktur | Structured bullets (what/who/how it differs) | |

**User's choice:** 1-2 kalimat singkat

| Option | Description | Selected |
|--------|-------------|----------|
| Ya, sertakan ilustrasi | Include per-therapy illustration from design system | ✓ |
| Teks saja | Text only, no illustration | |

**User's choice:** Ya, sertakan ilustrasi

| Option | Description | Selected |
|--------|-------------|----------|
| Menenangkan | Reassuring tone, consistent with calm-AI-alert voice | ✓ |
| Faktual netral | Neutral factual description only | |

**User's choice:** Menenangkan

**Notes:** All four answers were the recommended option. Design system illustrations and the app's broader calm-tone principle (Design Consideration 4) were both extended into this area even though that consideration was originally scoped to AI alerts/summaries.

---

## Struktur alur onboarding

| Option | Description | Selected |
|--------|-------------|----------|
| Step wizard + progress | Full-page steps with 1/3, 2/3, 3/3 indicator | ✓ |
| Satu halaman scroll bertahap | Single page, sections reveal progressively | |

**User's choice:** Step wizard + progress

| Option | Description | Selected |
|--------|-------------|----------|
| Ya, bisa kembali | Back button available at every step | ✓ |
| Tidak, hanya maju | Forward-only, no back navigation | |

**User's choice:** Ya, bisa kembali

| Option | Description | Selected |
|--------|-------------|----------|
| Animasi singkat lalu auto-redirect | 1-2s success animation, auto-redirect to dashboard | ✓ |
| Tampilkan dengan tombol Lanjut manual | Manual "Lanjut" button required | |

**User's choice:** Animasi singkat lalu auto-redirect

| Option | Description | Selected |
|--------|-------------|----------|
| Cukup salah satu | Only one reminder type required to proceed | ✓ |
| Wajib isi semua jenis relevan | All relevant reminder types required | |

**User's choice:** Cukup salah satu

**Notes:** All four answers were the recommended option, all justified by the <5-minute onboarding target (Design Consideration 3) and 50+ user accessibility.

---

## UX & nada saat akun terkunci

| Option | Description | Selected |
|--------|-------------|----------|
| Countdown timer | Live countdown shown ("Coba lagi dalam 14:32") | ✓ |
| Pesan generik | Generic "try again later" message, no exact time | |

**User's choice:** Countdown timer

| Option | Description | Selected |
|--------|-------------|----------|
| Menenangkan | Reassuring tone, consistent with app's calm voice | ✓ |
| Tegas/security-standar | Standard stern security warning tone | |

**User's choice:** Menenangkan

| Option | Description | Selected |
|--------|-------------|----------|
| Tidak perlu untuk MVP | No extra email/push notification on lockout | ✓ |
| Ya, kirim email keamanan | Send a security alert email | |

**User's choice:** Tidak perlu untuk MVP

**Notes:** All three answers were the recommended option.

---

## Claude's Discretion

- **Caregiver role declaration at registration** — raised as a gray area but not selected for discussion. Default: registration does not ask "patient or caregiver"; `Role` field defaults to `Pasien`. Documented as discretion in CONTEXT.md with a flag to revisit if user testing surfaces a real need.
- **Session/token expiry duration** — not discussed; standard secure default per research/STACK.md.
- **Password reset token expiry and email copy** — implementation detail, standard practice (time-limited single-use token).

## Deferred Ideas

None — discussion stayed within Phase 1 scope.
