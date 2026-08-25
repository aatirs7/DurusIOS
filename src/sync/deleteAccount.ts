const API = process.env.EXPO_PUBLIC_DURUS_API ?? "";

/*
  Asks the server to delete the account, and says whether it did.

  Separate from engine.ts because it is the one call that is not part of the
  sync loop: it is a thing the user asked for and is waiting on, so it neither
  retries nor backs off. If it fails they should be told, not have it quietly
  queued for a moment they are no longer watching.

  Local data is NOT cleared here. That is the caller's job and it happens only
  after this resolves true, because wiping the device first would leave someone
  whose network dropped mid-request with no data and an account that still
  exists - the worst of both.
*/
export async function deleteAccount(getToken: () => Promise<string | null>): Promise<boolean> {
  if (!API) return false;

  const token = await getToken();
  if (!token) return false;

  try {
    const res = await fetch(`${API}/api/v1/account`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });

    /*
      410 counts as success. It means the profile was already tombstoned - a
      first attempt that got through before the response was lost - and telling
      someone their deletion failed when the account is already gone would send
      them looking for a way to do it again.
    */
    return res.ok || res.status === 410;
  } catch {
    return false;
  }
}
