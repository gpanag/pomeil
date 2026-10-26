export interface Dialogue {
  character: string;
  text: string;
  id?: string;
}

export interface HotspotRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EscapeRoomConfig {
  roomId: string;
  typewriterSpeed: number;
  defaultZoomLevel: number;
  characterZoomLevel: number;
  preloadDoorSound: boolean;
  /** Source image width in pixels. Determines container aspect ratio. Default: 1680 */
  imageWidth?: number;
  /** Source image height in pixels. Determines container aspect ratio. Default: 1024 */
  imageHeight?: number;
}

export interface CharacterImageMap {
  [characterKey: string]: { hover: string; hoverDoorOpen: string };
}

/** Centralised interaction-timing constants (ms). */
export const ESCAPE_ROOM_TIMING = {
  /** Delay between step sound and zoom animation start (sound plays first) */
  stepSoundDelay: 150,
  /** Duration of zoom-in animation before the scene switches */
  zoomInDuration: 2000,
  /** Delay after zoom-out before view state resets */
  zoomOutDelay: 300,
  /** How long hint-pulse indicators stay visible after dialogue dismissed.
   *  6s (was 3s): the pulse used to be gone before the player finished
   *  reading the hint dialogue it accompanies. */
  hintVisibleDuration: 6000,
  /** How long the inline hint-text bubble (the idle prominence nudge) stays on
   *  screen each time it pops, before it fades out. */
  hintBubbleDuration: 6000,
  /** While the player keeps making no progress, re-pop the inline hint bubble
   *  this often (first appears at idleHintDelay, then repeats at this interval). */
  hintBubbleRepeatInterval: 30000,
  /** Idle time (no click/tap/key-press within the room — moving the mouse
   *  alone does NOT count) before the hint button escalates from its ambient
   *  pulse to a stronger attention animation, nudging a stuck player. */
  idleHintDelay: 40000,   // was 15s — "hint button too quick" (partner feedback 2026-08-31)
  /** Longer idle time (no click/tap/key-press within the room) before a one-time
   *  popup appears explicitly telling a stuck player about the hint button. Fires
   *  after the button-pulse escalation above, only while the game is waiting on
   *  the player, and re-arms once the player interacts again. */
  idleHintPopupDelay: 75000,   // was 30s — keeps the same ~35s gap after the button escalation
  /** How often the idle watcher polls for inactivity (ms). */
  idleHintPollInterval: 500,
  /** Default shake duration for wrong puzzle answers */
  shakeTimeout: 820,
  /** Shake duration for sequence-ordering wrong answers */
  sequenceShakeTimeout: 1500,
  /** Delay before showing completion dialogue after a state change */
  completionTransitionDelay: 500,
  /** Delay for door sound playback after state transition */
  doorSoundDelay: 100,
};
