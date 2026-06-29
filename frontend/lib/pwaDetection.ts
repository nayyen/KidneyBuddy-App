"use client";

/**
 * Returns true when running on an iOS device (iPhone, iPad, iPod Touch).
 * SSR-safe — returns false when navigator is not available (server render).
 *
 * Used to gate the Add-to-Home-Screen interstitial before push permission
 * requests (NOTIF-03 requirement from RESEARCH.md Pattern 5).
 */
export const isIos = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
};

/**
 * Returns true when the PWA has been launched from the iOS Home Screen
 * (i.e., the app is running in standalone display mode).
 * SSR-safe — returns false when window is not available (server render).
 *
 * `navigator.standalone` is an Apple-specific extension to the Navigator
 * interface — only set on iOS Safari, and only when launched from the icon
 * added via "Add to Home Screen".
 */
export const isInStandaloneMode = (): boolean => {
  if (typeof window === "undefined") return false;
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
};
