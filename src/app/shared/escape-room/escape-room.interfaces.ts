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
  /** How long hint-pulse indicators stay visible after dialogue dismissed */
  hintVisibleDuration: 3000,
  /** How long the small inline hint-text bubble next to the hint button stays
   *  on screen after the player requests a hint (then it fades out). */
  hintBubbleDuration: 6000,
  /** Idle time (no click/tap/key-press within the room — moving the mouse
   *  alone does NOT count) before the hint button escalates from its ambient
   *  pulse to a stronger attention animation, nudging a stuck player. */
  idleHintDelay: 15000,
  /** Longer idle time (no click/tap/key-press within the room) before a one-time
   *  popup appears explicitly telling a stuck player about the hint button. Fires
   *  after the button-pulse escalation above, only while the game is waiting on
   *  the player, and re-arms once the player interacts again. */
  idleHintPopupDelay: 30000,
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
