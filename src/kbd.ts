/* Tab triggers get focus on a mouse click too, and Chrome sometimes matches :focus-visible then.
   html[data-kbd] is set only while the keyboard is in use, so the focus ring shows for keyboard users alone. */
const root = document.documentElement;
addEventListener('keydown', (e) => { if (e.key === 'Tab' || e.key.startsWith('Arrow')) root.dataset.kbd = ''; }, true);
addEventListener('pointerdown', () => { delete root.dataset.kbd; }, true);
