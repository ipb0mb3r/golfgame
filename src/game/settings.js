// Settings (M4), saved on this device in localStorage. Storage can be missing or throw (private mode,
// blocked site data), so every read and write is wrapped: the game works the same without it, the
// settings just aren't remembered. What the values mean and how a bad value is handled: core/menu.js.
import { SETTINGS_KEY, parseSettings, serializeSettings } from '../core/menu.js';

export function loadSettings() {
  try { return parseSettings(localStorage.getItem(SETTINGS_KEY)); } catch { return parseSettings(null); }
}
// Returns true when the settings were saved (false: they apply for this visit only)
export function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, serializeSettings(s)); return true; } catch { return false; }
}
