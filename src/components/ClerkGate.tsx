import { useAuth, useUser } from "@clerk/clerk-expo";
import { AppState } from "react-native";
import { useEffect, useRef } from "react";

import { db } from "@/data/client";
import { clearActiveAccount, resolveProfile } from "@/data/session";
import { useSession } from "@/state/session";
import { bootstrapProfile } from "@/sync/bootstrap";
import { syncNow } from "@/sync/engine";

/*
  Binds the signed-in Clerk user to a local profile, and nothing else.

  Renders nothing and gates nothing. That is the point: spec section 2 calls
  launching with no network round trip "the one architectural decision", and
  Clerk's isLoaded can require one. So the app boots on its local `account`
  table and this reconciles afterwards, which is why a cold launch in airplane
  mode still reaches Today with real counts.

  The first sign-in adopts the unbound local profile rather than creating a
  second one - see resolveProfile. Somebody who answered thirty cards before
  signing in keeps them.
*/
export function ClerkGate() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const setActiveProfile = useSession((s) => s.setActiveProfile);

  /* Guards against re-resolving on every render of a stable session. */
  const boundTo = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      /*
        Signed out clears the active flag and DELETES NOTHING. Re-signing in is
        then instantly offline capable, and deleting a device's only copy of
        reviews that have not reached the server is a silent data loss path
        wearing a UX hat.
      */
      if (boundTo.current !== null) {
        clearActiveAccount(db);
        boundTo.current = null;
      }
      return;
    }

    if (boundTo.current === user.id) return;

    const name =
      user.firstName ??
      user.username ??
      user.primaryEmailAddress?.emailAddress?.split("@")[0] ??
      "You";

    try {
      const profileId = resolveProfile(db, user.id, name);
      setActiveProfile(profileId);
      boundTo.current = user.id;

      /* Provision server side, then drain whatever accumulated while signed
         out. Both are fire and forget: neither blocks a drill. */
      void bootstrapProfile(user.id, getToken).then((ok) => {
        if (ok) void syncNow(getToken);
      });
    } catch (e) {
      /* A failure here means the app keeps running on the local profile, which
         is the correct degradation: the drills work, they just are not yet
         attached to an account. */
      console.warn("[durus] could not bind Clerk user to a profile", e);
    }
  }, [isLoaded, isSignedIn, user, setActiveProfile, getToken]);

  /*
    Sync on foreground, and never from inside a drill.

    Spec section 1.1 point 6 read properly: the app does not editorialise on the
    user's activity, and a sync indicator mid-session is the same category of
    thing as a streak counter - chrome about your state that you are invited to
    feel something about, and can do nothing about. So the triggers live out
    here and the drills never learn the network exists.
  */
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void syncNow(getToken);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void syncNow(getToken);
    });
    return () => sub.remove();
  }, [isLoaded, isSignedIn, getToken]);

  return null;
}
