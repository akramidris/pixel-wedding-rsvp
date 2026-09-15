export const JOYSTICK_DEAD_ZONE = 0.15;

export interface JoystickState {
  directionX: number;
  directionY: number;
  magnitude: number;
  angle: number;
  isActive: boolean;
}

export function neutralJoystick(): JoystickState {
  return { directionX: 0, directionY: 0, magnitude: 0, angle: 0, isActive: false };
}

/**
 * Sample a held pointer relative to the joystick's centre. Direction remains a
 * unit vector outside the centre, while speed ramps from the radial dead zone
 * to the outer radius. Angles are atan2 radians in screen coordinates (+Y down).
 */
export function sampleJoystick(
  dx: number,
  dy: number,
  radius: number,
  deadZone = JOYSTICK_DEAD_ZONE,
): JoystickState {
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || !Number.isFinite(radius) || radius <= 0 || distance === 0)
    return { ...neutralJoystick(), isActive: true };

  const zone = Number.isFinite(deadZone) ? Math.min(1, Math.max(0, deadZone)) : JOYSTICK_DEAD_ZONE;
  const normalizedDistance = Math.min(1, distance / radius);
  return {
    directionX: dx / distance,
    directionY: dy / distance,
    magnitude: normalizedDistance <= zone ? 0 : (normalizedDistance - zone) / (1 - zone),
    angle: Math.atan2(dy, dx),
    isActive: true,
  };
}
