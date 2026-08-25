import { create } from "zustand";
import { persist } from "zustand/middleware";

import { KEYS, SCHEMA_VERSION, jsonStorage, onRehydrate, type Hydratable } from "./storage";

type SessionState = Hydratable & {
  /*
    Which profile's rows every scoped query filters on.

    Spec section 15: keeping profileId columns while there is only ever one
    profile during development invites a query that quietly forgets to filter,
    and the bug is invisible until a second account exists. This store is the
    single source, and src/data/session.ts is the only place that writes it.
  */
  activeProfileId: number | null;
  setActiveProfile: (id: number | null) => void;
  /*
    Null until onboarding has been completed in full, which now includes
    signing in - the flow writes nothing before that, so this doubles as the
    record that there is something worth resuming into.

    There used to be a second flag recording that the account question had been
    answered, because it could be answered by declining. It cannot any more, so
    one flag says everything.
  */
  onboardedAt: number | null;
  completeOnboarding: () => void;
  /*
    Back to a first launch, for account deletion and nothing else.

    Deleting the database file is not enough on its own: onboardedAt lives in
    AsyncStorage, so without this the next launch would decide onboarding had
    already been done and send a profile-less app straight to Today.
  */
  reset: () => void;
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      _hydrated: false,
      markHydrated: () => set({ _hydrated: true }),
      activeProfileId: null,
      setActiveProfile: (id) => set({ activeProfileId: id }),
      onboardedAt: null,
      completeOnboarding: () => set({ onboardedAt: Date.now() }),
      reset: () => set({ onboardedAt: null, activeProfileId: null }),
    }),
    {
      name: KEYS.session,
      version: SCHEMA_VERSION,
      storage: jsonStorage,
      partialize: ({ _hydrated, markHydrated, ...rest }) => rest as SessionState,
      onRehydrateStorage: onRehydrate<SessionState>(),
    },
  ),
);

/*
  The one place a call turns into a profile id. Every data function takes
  profileId as a parameter rather than reaching for this, so the queries stay
  pure and testable; this is what the routes call to get the argument.
*/
export function currentProfileId(): number | null {
  return useSession.getState().activeProfileId;
}
