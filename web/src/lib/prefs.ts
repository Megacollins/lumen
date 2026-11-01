// Per-device conveniences. Stored in this browser only.
const REVEAL = "lumen.pref.reveal";

export function revealByDefault(): boolean {
  try {
    return localStorage.getItem(REVEAL) === "yes";
  } catch {
    return false;
  }
}

export function setRevealByDefault(on: boolean) {
  try {
    if (on) localStorage.setItem(REVEAL, "yes");
    else localStorage.removeItem(REVEAL);
  } catch {}
}

export const ELIGIBLE_KEY = "lumen.eligibility.v1";

export function isEligibilityConfirmed(): boolean {
  try {
    return localStorage.getItem(ELIGIBLE_KEY) === "yes";
  } catch {
    return false;
  }
}

export function setEligibilityConfirmed(on: boolean) {
  try {
    if (on) localStorage.setItem(ELIGIBLE_KEY, "yes");
    else localStorage.removeItem(ELIGIBLE_KEY);
  } catch {}
}
