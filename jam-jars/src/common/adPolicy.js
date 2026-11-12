export const INTERSTITIAL_INTERVAL_MS = 180000;

export function shouldShowInterstitial({ completedLevel, lastShownAt = 0, noAds = false, now = Date.now() }) {
  if (noAds || completedLevel < 4) return false;
  return now - lastShownAt >= INTERSTITIAL_INTERVAL_MS;
}
