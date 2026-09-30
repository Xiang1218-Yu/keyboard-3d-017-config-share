import { LayoutConfig, LayoutType, KeyConfig, KeyZone } from '@/types/keyboard';

const createKey = (
  id: string,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
  row: number,
  col: number,
  zone: KeyZone,
  keyCode?: string
): KeyConfig => ({
  id,
  label,
  x,
  y,
  width,
  height,
  row,
  col,
  zone,
  keyCode,
});

const generate60Layout = (): KeyConfig[] => {
  const keys: KeyConfig[] = [];
  const kh = 1;

  const row0 = [
    { label: 'Esc', x: 0, w: 1, zone: 'function' as KeyZone, code: 'Escape' },
    { label: '1', x: 1.25, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Digit1' },
    { label: '2', x: 2.3, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Digit2' },
    { label: '3', x: 3.35, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Digit3' },
    { label: '4', x: 4.4, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Digit4' },
    { label: '5', x: 5.45, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Digit5' },
    { label: '6', x: 6.5, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Digit6' },
    { label: '7', x: 7.55, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Digit7' },
    { label: '8', x: 8.6, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Digit8' },
    { label: '9', x: 9.65, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Digit9' },
    { label: '0', x: 10.7, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Digit0' },
    { label: '-', x: 11.75, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Minus' },
    { label: '=', x: 12.8, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Equal' },
    { label: 'Back', x: 13.85, w: 1.75, zone: 'modifiers' as KeyZone, code: 'Backspace' },
  ];

  row0.forEach((k, i) => {
    keys.push(createKey(`r0-${i}`, k.label, k.x, 0, k.w, kh, 0, i, k.zone, k.code));
  });

  const row1 = [
    { label: 'Tab', x: 0, w: 1.5, zone: 'modifiers' as KeyZone, code: 'Tab' },
    { label: 'Q', x: 1.6, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyQ' },
    { label: 'W', x: 2.65, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyW' },
    { label: 'E', x: 3.7, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyE' },
    { label: 'R', x: 4.75, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyR' },
    { label: 'T', x: 5.8, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyT' },
    { label: 'Y', x: 6.85, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyY' },
    { label: 'U', x: 7.9, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyU' },
    { label: 'I', x: 8.95, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyI' },
    { label: 'O', x: 10.0, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyO' },
    { label: 'P', x: 11.05, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyP' },
    { label: '[', x: 12.1, w: 1, zone: 'alphanumeric' as KeyZone, code: 'BracketLeft' },
    { label: ']', x: 13.15, w: 1, zone: 'alphanumeric' as KeyZone, code: 'BracketRight' },
    { label: '\\', x: 14.2, w: 1.4, zone: 'alphanumeric' as KeyZone, code: 'Backslash' },
  ];

  row1.forEach((k, i) => {
    keys.push(createKey(`r1-${i}`, k.label, k.x, 1.1, k.w, kh, 1, i, k.zone, k.code));
  });

  const row2 = [
    { label: 'Caps', x: 0, w: 1.75, zone: 'modifiers' as KeyZone, code: 'CapsLock' },
    { label: 'A', x: 1.85, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyA' },
    { label: 'S', x: 2.9, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyS' },
    { label: 'D', x: 3.95, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyD' },
    { label: 'F', x: 5.0, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyF' },
    { label: 'G', x: 6.05, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyG' },
    { label: 'H', x: 7.1, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyH' },
    { label: 'J', x: 8.15, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyJ' },
    { label: 'K', x: 9.2, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyK' },
    { label: 'L', x: 10.25, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyL' },
    { label: ';', x: 11.3, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Semicolon' },
    { label: "'", x: 12.35, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Quote' },
    { label: 'Enter', x: 13.4, w: 2.2, zone: 'modifiers' as KeyZone, code: 'Enter' },
  ];

  row2.forEach((k, i) => {
    keys.push(createKey(`r2-${i}`, k.label, k.x, 2.2, k.w, kh, 2, i, k.zone, k.code));
  });

  const row3 = [
    { label: 'Shift', x: 0, w: 2.25, zone: 'modifiers' as KeyZone, code: 'ShiftLeft' },
    { label: 'Z', x: 2.35, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyZ' },
    { label: 'X', x: 3.4, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyX' },
    { label: 'C', x: 4.45, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyC' },
    { label: 'V', x: 5.5, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyV' },
    { label: 'B', x: 6.55, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyB' },
    { label: 'N', x: 7.6, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyN' },
    { label: 'M', x: 8.65, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyM' },
    { label: ',', x: 9.7, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Comma' },
    { label: '.', x: 10.75, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Period' },
    { label: '/', x: 11.8, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Slash' },
    { label: 'Shift', x: 12.85, w: 2.75, zone: 'modifiers' as KeyZone, code: 'ShiftRight' },
  ];

  row3.forEach((k, i) => {
    keys.push(createKey(`r3-${i}`, k.label, k.x, 3.3, k.w, kh, 3, i, k.zone, k.code));
  });

  const row4 = [
    { label: 'Ctrl', x: 0, w: 1.25, zone: 'modifiers' as KeyZone, code: 'ControlLeft' },
    { label: 'Win', x: 1.35, w: 1.25, zone: 'modifiers' as KeyZone, code: 'MetaLeft' },
    { label: 'Alt', x: 2.7, w: 1.25, zone: 'modifiers' as KeyZone, code: 'AltLeft' },
    { label: 'Space', x: 4.05, w: 6.25, zone: 'spacebar' as KeyZone, code: 'Space' },
    { label: 'Alt', x: 10.4, w: 1.25, zone: 'modifiers' as KeyZone, code: 'AltRight' },
    { label: 'Fn', x: 11.75, w: 1.25, zone: 'modifiers' as KeyZone },
    { label: 'Menu', x: 13.1, w: 1.25, zone: 'modifiers' as KeyZone, code: 'ContextMenu' },
    { label: 'Ctrl', x: 14.45, w: 1.25, zone: 'modifiers' as KeyZone, code: 'ControlRight' },
  ];

  row4.forEach((k, i) => {
    keys.push(createKey(`r4-${i}`, k.label, k.x, 4.4, k.w, kh, 4, i, k.zone, k.code));
  });

  return keys;
};

const generate65Layout = (): KeyConfig[] => {
  const keys = generate60Layout();
  
  const row1 = [
    { label: 'Del', x: 15.7, w: 1, zone: 'navigation' as KeyZone, code: 'Delete' },
  ];
  row1.forEach((k, i) => {
    keys.push(createKey(`r1-65-${i}`, k.label, k.x, 1.1, k.w, 1, 1, 15 + i, k.zone, k.code));
  });

  const row2 = [
    { label: 'PgUp', x: 15.7, w: 1, zone: 'navigation' as KeyZone, code: 'PageUp' },
  ];
  row2.forEach((k, i) => {
    keys.push(createKey(`r2-65-${i}`, k.label, k.x, 2.2, k.w, 1, 2, 15 + i, k.zone, k.code));
  });

  const row3 = [
    { label: 'PgDn', x: 15.7, w: 1, zone: 'navigation' as KeyZone, code: 'PageDown' },
  ];
  row3.forEach((k, i) => {
    keys.push(createKey(`r3-65-${i}`, k.label, k.x, 3.3, k.w, 1, 3, 15 + i, k.zone, k.code));
  });

  const row4Nav = [
    { label: '←', x: 15.7, w: 1, zone: 'navigation' as KeyZone, code: 'ArrowLeft' },
  ];
  row4Nav.forEach((k, i) => {
    keys.push(createKey(`r4-65-${i}`, k.label, k.x, 4.4, k.w, 1, 4, 15 + i, k.zone, k.code));
  });

  const row5 = [
    { label: '↑', x: 13.6, w: 1, zone: 'navigation' as KeyZone, code: 'ArrowUp' },
    { label: '↓', x: 14.65, w: 1, zone: 'navigation' as KeyZone, code: 'ArrowDown' },
    { label: '→', x: 15.7, w: 1, zone: 'navigation' as KeyZone, code: 'ArrowRight' },
  ];
  row5.forEach((k, i) => {
    keys.push(createKey(`r5-65-${i}`, k.label, k.x, 5.5, k.w, 1, 5, 13 + i, k.zone, k.code));
  });

  const row4Keys = keys.filter(k => k.row === 4);
  const lastRow4Key = row4Keys[row4Keys.length - 1];
  if (lastRow4Key && lastRow4Key.label === 'Ctrl') {
    lastRow4Key.width = 1.0;
    lastRow4Key.x = 14.7;
  }

  return keys;
};

const generate75Layout = (): KeyConfig[] => {
  const keys: KeyConfig[] = [];

  const funcRow = [
    { label: 'Esc', x: 0, w: 1, zone: 'function' as KeyZone, code: 'Escape' },
    { label: 'F1', x: 1.25, w: 1, zone: 'function' as KeyZone, code: 'F1' },
    { label: 'F2', x: 2.3, w: 1, zone: 'function' as KeyZone, code: 'F2' },
    { label: 'F3', x: 3.35, w: 1, zone: 'function' as KeyZone, code: 'F3' },
    { label: 'F4', x: 4.4, w: 1, zone: 'function' as KeyZone, code: 'F4' },
    { label: 'F5', x: 5.45, w: 1, zone: 'function' as KeyZone, code: 'F5' },
    { label: 'F6', x: 6.5, w: 1, zone: 'function' as KeyZone, code: 'F6' },
    { label: 'F7', x: 7.55, w: 1, zone: 'function' as KeyZone, code: 'F7' },
    { label: 'F8', x: 8.6, w: 1, zone: 'function' as KeyZone, code: 'F8' },
    { label: 'F9', x: 9.65, w: 1, zone: 'function' as KeyZone, code: 'F9' },
    { label: 'F10', x: 10.7, w: 1, zone: 'function' as KeyZone, code: 'F10' },
    { label: 'F11', x: 11.75, w: 1, zone: 'function' as KeyZone, code: 'F11' },
    { label: 'F12', x: 12.8, w: 1, zone: 'function' as KeyZone, code: 'F12' },
    { label: 'Del', x: 13.85, w: 1, zone: 'navigation' as KeyZone, code: 'Delete' },
    { label: 'Home', x: 14.9, w: 1, zone: 'navigation' as KeyZone, code: 'Home' },
    { label: 'End', x: 15.95, w: 1, zone: 'navigation' as KeyZone, code: 'End' },
  ];
  funcRow.forEach((k, i) => {
    keys.push(createKey(`r0-${i}`, k.label, k.x, 0, k.w, 1, 0, i, k.zone, k.code));
  });

  const base65 = generate65Layout();
  base65.forEach(k => {
    k.y += 1.1;
    k.row += 1;
    k.id = `75-${k.id}`;
    keys.push(k);
  });

  return keys;
};

const generateTKLLayout = (): KeyConfig[] => {
  const keys: KeyConfig[] = [];

  const funcRow = [
    { label: 'Esc', x: 0, w: 1, zone: 'function' as KeyZone, code: 'Escape' },
    { label: 'F1', x: 1.5, w: 1, zone: 'function' as KeyZone, code: 'F1' },
    { label: 'F2', x: 2.55, w: 1, zone: 'function' as KeyZone, code: 'F2' },
    { label: 'F3', x: 3.6, w: 1, zone: 'function' as KeyZone, code: 'F3' },
    { label: 'F4', x: 4.65, w: 1, zone: 'function' as KeyZone, code: 'F4' },
    { label: 'F5', x: 6.2, w: 1, zone: 'function' as KeyZone, code: 'F5' },
    { label: 'F6', x: 7.25, w: 1, zone: 'function' as KeyZone, code: 'F6' },
    { label: 'F7', x: 8.3, w: 1, zone: 'function' as KeyZone, code: 'F7' },
    { label: 'F8', x: 9.35, w: 1, zone: 'function' as KeyZone, code: 'F8' },
    { label: 'F9', x: 10.9, w: 1, zone: 'function' as KeyZone, code: 'F9' },
    { label: 'F10', x: 11.95, w: 1, zone: 'function' as KeyZone, code: 'F10' },
    { label: 'F11', x: 13.0, w: 1, zone: 'function' as KeyZone, code: 'F11' },
    { label: 'F12', x: 14.05, w: 1, zone: 'function' as KeyZone, code: 'F12' },
    { label: 'PrtSc', x: 15.6, w: 1, zone: 'navigation' as KeyZone, code: 'PrintScreen' },
    { label: 'ScrLk', x: 16.65, w: 1, zone: 'navigation' as KeyZone, code: 'ScrollLock' },
    { label: 'Pause', x: 17.7, w: 1, zone: 'navigation' as KeyZone, code: 'Pause' },
  ];
  funcRow.forEach((k, i) => {
    keys.push(createKey(`r0-${i}`, k.label, k.x, 0, k.w, 1, 0, i, k.zone, k.code));
  });

  const row1 = [
    { label: '`', x: 0, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Backquote' },
    { label: '1', x: 1.05, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Digit1' },
    { label: '2', x: 2.1, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Digit2' },
    { label: '3', x: 3.15, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Digit3' },
    { label: '4', x: 4.2, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Digit4' },
    { label: '5', x: 5.25, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Digit5' },
    { label: '6', x: 6.3, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Digit6' },
    { label: '7', x: 7.35, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Digit7' },
    { label: '8', x: 8.4, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Digit8' },
    { label: '9', x: 9.45, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Digit9' },
    { label: '0', x: 10.5, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Digit0' },
    { label: '-', x: 11.55, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Minus' },
    { label: '=', x: 12.6, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Equal' },
    { label: 'Back', x: 13.65, w: 2, zone: 'modifiers' as KeyZone, code: 'Backspace' },
    { label: 'Ins', x: 16.2, w: 1, zone: 'navigation' as KeyZone, code: 'Insert' },
    { label: 'Home', x: 17.25, w: 1, zone: 'navigation' as KeyZone, code: 'Home' },
    { label: 'PgUp', x: 18.3, w: 1, zone: 'navigation' as KeyZone, code: 'PageUp' },
  ];
  row1.forEach((k, i) => {
    keys.push(createKey(`r1-${i}`, k.label, k.x, 1.1, k.w, 1, 1, i, k.zone, k.code));
  });

  const row2 = [
    { label: 'Tab', x: 0, w: 1.5, zone: 'modifiers' as KeyZone, code: 'Tab' },
    { label: 'Q', x: 1.6, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyQ' },
    { label: 'W', x: 2.65, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyW' },
    { label: 'E', x: 3.7, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyE' },
    { label: 'R', x: 4.75, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyR' },
    { label: 'T', x: 5.8, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyT' },
    { label: 'Y', x: 6.85, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyY' },
    { label: 'U', x: 7.9, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyU' },
    { label: 'I', x: 8.95, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyI' },
    { label: 'O', x: 10.0, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyO' },
    { label: 'P', x: 11.05, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyP' },
    { label: '[', x: 12.1, w: 1, zone: 'alphanumeric' as KeyZone, code: 'BracketLeft' },
    { label: ']', x: 13.15, w: 1, zone: 'alphanumeric' as KeyZone, code: 'BracketRight' },
    { label: '\\', x: 14.2, w: 1.45, zone: 'alphanumeric' as KeyZone, code: 'Backslash' },
    { label: 'Del', x: 16.2, w: 1, zone: 'navigation' as KeyZone, code: 'Delete' },
    { label: 'End', x: 17.25, w: 1, zone: 'navigation' as KeyZone, code: 'End' },
    { label: 'PgDn', x: 18.3, w: 1, zone: 'navigation' as KeyZone, code: 'PageDown' },
  ];
  row2.forEach((k, i) => {
    keys.push(createKey(`r2-${i}`, k.label, k.x, 2.2, k.w, 1, 2, i, k.zone, k.code));
  });

  const row3 = [
    { label: 'Caps', x: 0, w: 1.75, zone: 'modifiers' as KeyZone, code: 'CapsLock' },
    { label: 'A', x: 1.85, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyA' },
    { label: 'S', x: 2.9, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyS' },
    { label: 'D', x: 3.95, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyD' },
    { label: 'F', x: 5.0, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyF' },
    { label: 'G', x: 6.05, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyG' },
    { label: 'H', x: 7.1, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyH' },
    { label: 'J', x: 8.15, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyJ' },
    { label: 'K', x: 9.2, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyK' },
    { label: 'L', x: 10.25, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyL' },
    { label: ';', x: 11.3, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Semicolon' },
    { label: "'", x: 12.35, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Quote' },
    { label: 'Enter', x: 13.4, w: 2.25, zone: 'modifiers' as KeyZone, code: 'Enter' },
  ];
  row3.forEach((k, i) => {
    keys.push(createKey(`r3-${i}`, k.label, k.x, 3.3, k.w, 1, 3, i, k.zone, k.code));
  });

  const row4 = [
    { label: 'Shift', x: 0, w: 2.25, zone: 'modifiers' as KeyZone, code: 'ShiftLeft' },
    { label: 'Z', x: 2.35, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyZ' },
    { label: 'X', x: 3.4, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyX' },
    { label: 'C', x: 4.45, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyC' },
    { label: 'V', x: 5.5, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyV' },
    { label: 'B', x: 6.55, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyB' },
    { label: 'N', x: 7.6, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyN' },
    { label: 'M', x: 8.65, w: 1, zone: 'alphanumeric' as KeyZone, code: 'KeyM' },
    { label: ',', x: 9.7, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Comma' },
    { label: '.', x: 10.75, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Period' },
    { label: '/', x: 11.8, w: 1, zone: 'alphanumeric' as KeyZone, code: 'Slash' },
    { label: 'Shift', x: 12.85, w: 2.8, zone: 'modifiers' as KeyZone, code: 'ShiftRight' },
    { label: '↑', x: 17.25, w: 1, zone: 'navigation' as KeyZone, code: 'ArrowUp' },
  ];
  row4.forEach((k, i) => {
    keys.push(createKey(`r4-${i}`, k.label, k.x, 4.4, k.w, 1, 4, i, k.zone, k.code));
  });

  const row5 = [
    { label: 'Ctrl', x: 0, w: 1.25, zone: 'modifiers' as KeyZone, code: 'ControlLeft' },
    { label: 'Win', x: 1.35, w: 1.25, zone: 'modifiers' as KeyZone, code: 'MetaLeft' },
    { label: 'Alt', x: 2.7, w: 1.25, zone: 'modifiers' as KeyZone, code: 'AltLeft' },
    { label: 'Space', x: 4.05, w: 6.25, zone: 'spacebar' as KeyZone, code: 'Space' },
    { label: 'Alt', x: 10.4, w: 1.25, zone: 'modifiers' as KeyZone, code: 'AltRight' },
    { label: 'Win', x: 11.75, w: 1.25, zone: 'modifiers' as KeyZone, code: 'MetaRight' },
    { label: 'Menu', x: 13.1, w: 1.25, zone: 'modifiers' as KeyZone, code: 'ContextMenu' },
    { label: 'Ctrl', x: 14.45, w: 1.25, zone: 'modifiers' as KeyZone, code: 'ControlRight' },
    { label: '←', x: 16.2, w: 1, zone: 'navigation' as KeyZone, code: 'ArrowLeft' },
    { label: '↓', x: 17.25, w: 1, zone: 'navigation' as KeyZone, code: 'ArrowDown' },
    { label: '→', x: 18.3, w: 1, zone: 'navigation' as KeyZone, code: 'ArrowRight' },
  ];
  row5.forEach((k, i) => {
    keys.push(createKey(`r5-${i}`, k.label, k.x, 5.5, k.w, 1, 5, i, k.zone, k.code));
  });

  return keys;
};

const generateFullLayout = (): KeyConfig[] => {
  const keys = generateTKLLayout();

  const numpadRow1 = [
    { label: 'Num', x: 19.8, w: 1, zone: 'numpad' as KeyZone, code: 'NumLock' },
    { label: '/', x: 20.85, w: 1, zone: 'numpad' as KeyZone, code: 'NumpadDivide' },
    { label: '*', x: 21.9, w: 1, zone: 'numpad' as KeyZone, code: 'NumpadMultiply' },
    { label: '-', x: 22.95, w: 1, zone: 'numpad' as KeyZone, code: 'NumpadSubtract' },
  ];
  numpadRow1.forEach((k, i) => {
    keys.push(createKey(`np1-${i}`, k.label, k.x, 1.1, k.w, 1, 1, 20 + i, k.zone, k.code));
  });

  const numpadRow2 = [
    { label: '7', x: 19.8, w: 1, zone: 'numpad' as KeyZone, code: 'Numpad7' },
    { label: '8', x: 20.85, w: 1, zone: 'numpad' as KeyZone, code: 'Numpad8' },
    { label: '9', x: 21.9, w: 1, zone: 'numpad' as KeyZone, code: 'Numpad9' },
    { label: '+', x: 22.95, w: 1, zone: 'numpad' as KeyZone, code: 'NumpadAdd' },
  ];
  numpadRow2.forEach((k, i) => {
    keys.push(createKey(`np2-${i}`, k.label, k.x, 2.2, k.w, 1, 2, 20 + i, k.zone, k.code));
  });

  const numpadRow3 = [
    { label: '4', x: 19.8, w: 1, zone: 'numpad' as KeyZone, code: 'Numpad4' },
    { label: '5', x: 20.85, w: 1, zone: 'numpad' as KeyZone, code: 'Numpad5' },
    { label: '6', x: 21.9, w: 1, zone: 'numpad' as KeyZone, code: 'Numpad6' },
  ];
  numpadRow3.forEach((k, i) => {
    keys.push(createKey(`np3-${i}`, k.label, k.x, 3.3, k.w, 1, 3, 20 + i, k.zone, k.code));
  });

  const numpadRow4 = [
    { label: '1', x: 19.8, w: 1, zone: 'numpad' as KeyZone, code: 'Numpad1' },
    { label: '2', x: 20.85, w: 1, zone: 'numpad' as KeyZone, code: 'Numpad2' },
    { label: '3', x: 21.9, w: 1, zone: 'numpad' as KeyZone, code: 'Numpad3' },
    { label: 'Enter', x: 22.95, w: 1, zone: 'numpad' as KeyZone, code: 'NumpadEnter' },
  ];
  numpadRow4.forEach((k, i) => {
    keys.push(createKey(`np4-${i}`, k.label, k.x, 4.4, k.w, 1, 4, 20 + i, k.zone, k.code));
  });

  const numpadRow5 = [
    { label: '0', x: 19.8, w: 2.05, zone: 'numpad' as KeyZone, code: 'Numpad0' },
    { label: '.', x: 21.9, w: 1, zone: 'numpad' as KeyZone, code: 'NumpadDecimal' },
  ];
  numpadRow5.forEach((k, i) => {
    keys.push(createKey(`np5-${i}`, k.label, k.x, 5.5, k.w, 1, 5, 20 + i, k.zone, k.code));
  });

  const npEnter = keys.find(k => k.id === 'np4-3');
  if (npEnter) {
    npEnter.height = 2.1;
  }

  return keys;
};

export const LAYOUT_CONFIGS: Record<LayoutType, LayoutConfig> = {
  '60%': {
    type: '60%',
    name: '60% 紧凑型',
    description: '最小化设计，仅保留核心按键，适合追求简洁的用户',
    keys: generate60Layout(),
    width: 15.6,
    height: 5.6,
  },
  '65%': {
    type: '65%',
    name: '65% 紧凑+',
    description: '在60%基础上增加方向键和导航键，平衡便携与功能',
    keys: generate65Layout(),
    width: 16.75,
    height: 6.7,
  },
  '75%': {
    type: '75%',
    name: '75% 功能型',
    description: '包含完整功能键行，紧凑布局适合小桌面',
    keys: generate75Layout(),
    width: 16.95,
    height: 7.8,
  },
  'TKL': {
    type: 'TKL',
    name: 'TKL 87键',
    description: '无数字键盘的经典布局，保留完整功能区和导航区',
    keys: generateTKLLayout(),
    width: 19.3,
    height: 6.7,
  },
  'Full': {
    type: 'Full',
    name: '全尺寸 104键',
    description: '完整键盘布局，包含数字小键盘，适合数据输入',
    keys: generateFullLayout(),
    width: 24.0,
    height: 6.7,
  },
};

export const LAYOUT_LIST: LayoutType[] = ['60%', '65%', '75%', 'TKL', 'Full'];
