import { events } from './events';

export type InputMode =
  | 'idle'
  | 'build:arrow'
  | 'build:cannon'
  | 'build:frost'
  | 'upgrade'
  | 'sell';

let mode: InputMode = 'idle';

export function setMode(m: InputMode) {
  mode = m;
  events.emit('modeChanged', mode);
}

export function getMode() {
  return mode;
}

export function cancelMode() {
  setMode('idle');
}
