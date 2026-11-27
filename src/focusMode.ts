/* Focus rings only for keyboard use (2026-11-27). Browsers turn on :focus-visible for a clicked button as soon as any
 * key is pressed, so holding Shift or ⌘ to multi-select drew a ring round the last button clicked (a row's chevron).
 * We note how the user last interacted: a pointer press sets data-input="pointer", a real key (Tab, arrows, letters —
 * not Shift, ⌘, Ctrl, Alt alone) sets "keyboard". styles.css hides button/link rings while in pointer mode; text
 * fields keep theirs. */
const MODS = new Set(['Shift', 'Meta', 'Control', 'Alt', 'CapsLock', 'Fn', 'OS']);
const root = document.documentElement;
root.dataset.input = 'pointer';
window.addEventListener('pointerdown', () => { root.dataset.input = 'pointer'; }, true);
window.addEventListener('keydown', (e) => { if (!MODS.has(e.key)) root.dataset.input = 'keyboard'; }, true);
export {};
