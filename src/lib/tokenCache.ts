import * as SecureStore from "expo-secure-store";

/*
  Clerk's session token cache.

  expo-secure-store is listed under "explicitly not wanted" in spec section 3,
  which was written when there was no account system at all. It comes back for
  this and nothing else: without a token cache Clerk signs the user out on every
  cold launch, which would destroy the offline-launch property section 2 calls
  "the one architectural decision".

  It is the Keychain rather than AsyncStorage because a session token is a
  credential. A read failure degrades to "signed out" rather than throwing -
  being asked to sign in again is recoverable; a crash on launch is not.
*/
export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      /* A corrupt or unreadable Keychain entry must not strand the app. Clear
         it so the next sign-in starts clean rather than hitting this forever. */
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        /* Nothing further to try. */
      }
      return null;
    }
  },

  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      /* Worst case the user signs in again next launch. */
    }
  },
};
