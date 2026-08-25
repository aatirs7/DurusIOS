import * as Haptics from "expo-haptics";

/*
  The only module allowed to import expo-haptics; there is an eslint rule.

  Spec section 7.5 enumerates the complete list, and it is two entries long:

    Light impact       tapping an answer option or a letter tile
    Success            end of a session, once, never per card

  Warning and Error are deliberately absent. A wrong answer must not buzz.
  Section 1.1 point 6 - never praise, never a streak - applies to touch as much
  as to text, and a buzz on a wrong answer is the app editorialising on the
  user's performance in the most physical way available to it.

  Every call swallows rejection: haptics reject on the simulator and on devices
  without a Taptic Engine, and a drill must not care.
*/

let enabled = true;

/* Set from settings.hapticsEnabled once the store has hydrated. Kept as a
   module flag rather than read through a hook, so a component deep in a drill
   does not need the settings store just to tap a tile. */
export function setHapticsEnabled(next: boolean) {
  enabled = next;
}

export const haptics = {
  /** Tapping an answer option or a letter tile. Not navigation. */
  select() {
    if (!enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },

  /** Fires once, when a session ends. Never per card. */
  sessionComplete() {
    if (!enabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
};
