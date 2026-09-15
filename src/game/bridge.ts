import type { Area, AreaId } from './world';
import { neutralJoystick, type JoystickState } from './controls/joystick';

export type Panel = AreaId | 'menu' | 'controls' | 'music' | 'map' | 'photo' | 'dialogue' | null;
type Events = {
  ready: undefined;
  nearby: Area | null;
  position: { x: number; y: number };
  interact: AreaId;
  dialogue: { name: string; message: string };
  panel: Panel;
  photo: string;
  joystickchange: JoystickState;
  inputreset: undefined;
};
class Bridge {
  private target = new EventTarget();
  input = { up: false, down: false, left: false, right: false };
  joystick: JoystickState = neutralJoystick();
  paused = true;
  setJoystick(state: JoystickState) {
    this.joystick = { ...state };
    this.emit('joystickchange', this.joystick);
  }
  resetInput() {
    this.input = { up: false, down: false, left: false, right: false };
    this.joystick = neutralJoystick();
    this.emit('inputreset', undefined);
  }
  emit<K extends keyof Events>(type: K, detail: Events[K]) {
    this.target.dispatchEvent(new CustomEvent(type, { detail }));
  }
  on<K extends keyof Events>(type: K, callback: (value: Events[K]) => void) {
    const listener = (event: Event) => callback((event as CustomEvent<Events[K]>).detail);
    this.target.addEventListener(type, listener);
    return () => this.target.removeEventListener(type, listener);
  }
  interact: () => void = () => {};
  takePhoto: () => void = () => {};
}
export const bridge = new Bridge();
