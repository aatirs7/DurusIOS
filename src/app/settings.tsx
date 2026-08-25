import { File, Paths } from "expo-file-system";
import { deleteDatabaseSync } from "expo-sqlite";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Share, Switch } from "react-native";

import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { Field, Segmented, Stepper } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { Section } from "@/components/Section";
import { Text } from "@/components/Text";
import { DB_NAME, db, sqlite } from "@/data/client";
import { exportAll } from "@/data/export";
import { syncReminders } from "@/data/reminders";
import { getSettingsFor, updateSettings } from "@/data/settings";
import { TOTAL_LESSONS } from "@/engine/constants";
import { setHapticsEnabled } from "@/lib/haptics";
import {
  remindersAvailable,
  requestPermission,
  sendTestReminder,
} from "@/lib/notifications";
import { useSession } from "@/state/session";
import { useThemeChoice, type ThemeChoice } from "@/state/theme";
import { deleteAccount } from "@/sync/deleteAccount";
import { pendingCount, syncNow } from "@/sync/engine";
import { space } from "@/theme/layout";
import { useTheme } from "@/theme/useTheme";

/*
  The sync line. Deliberately plain: no relative-time library, no colour, and
  no count when there is nothing to say.
*/
function syncLine(profileId: number, _tick: number): string {
  const pending = pendingCount(profileId);
  if (pending === 0) return "Everything here has been sent.";
  return pending === 1
    ? "1 answer has not been sent yet."
    : `${pending} answers have not been sent yet.`;
}

/* 12 hour labels, because a reminder time is read, not calculated. */
function hourLabel(h: number): string {
  const suffix = h < 12 ? "am" : "pm";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}${suffix}`;
}

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);
  const resetSession = useSession((st) => st.reset);
  const restartOnboarding = useSession((st) => st.restartOnboarding);
  const themeChoice = useThemeChoice((st) => st.choice);
  const setThemeChoice = useThemeChoice((st) => st.setChoice);

  const [config, setConfig] = useState(() =>
    profileId === null ? null : getSettingsFor(db, profileId),
  );
  const [busy, setBusy] = useState(false);
  const { isSignedIn, getToken, signOut } = useAuth();
  const { user } = useUser();
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /*
    Server first, device second.

    If the request fails the local data is left exactly where it was and the
    user is told, because wiping the phone before the server agrees would leave
    someone whose signal dropped with nothing here and an account that still
    exists - the worst of both outcomes.

    The database file is deleted rather than its rows: reviews, card states,
    hearts, suspensions and settings are six tables plus a derived one, and
    "delete everything" that misses a table is worse than not offering it.
    Migrations and the seed run again on the next launch against a clean file.
  */
  const removeAccount = useCallback(async () => {
    setDeleting(true);
    try {
      const gone = await deleteAccount(getToken);
      if (!gone) {
        Alert.alert(
          "Could not delete your account",
          "Nothing has been removed. Check your connection and try again.",
        );
        return;
      }

      await signOut();
      try {
        sqlite.closeSync();
        deleteDatabaseSync(DB_NAME);
      } catch {
        /* The account is already gone from the server, which is the part that
           matters. A file that would not close is cleaned up by the migration
           path on the next launch. */
      }
      resetSession();
      router.replace("/onboarding");
    } finally {
      setDeleting(false);
    }
  }, [getToken, signOut, router, resetSession]);
  const [syncTick, setSyncTick] = useState(0);

  if (profileId === null || !config) return null;

  const patch = (next: Parameters<typeof updateSettings>[2]) => {
    const updated = updateSettings(db, profileId, next);
    setConfig(updated);
    /* Any change to a reminder field invalidates the scheduled window. */
    void syncReminders(db, profileId);
  };

  return (
    <Screen>
      <BackBar />
      {/* The indicator is chrome about the length of a settings list, which is
          not a thing anyone needs told. */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: space(5) }}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="pageTitle">Settings</Text>

        <Section title="Appearance">
          <Field label="Theme">
            <Segmented<ThemeChoice>
              value={themeChoice}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ]}
              onChange={setThemeChoice}
            />
          </Field>
        </Section>

        {/* The one group most people came for, so it is the one that is open. */}
        <Section title="Study" defaultOpen>
          {/* The app never unlocks a lesson on its own. Moving this restamps
              currentLessonSince, which starts the 14 day interval cap. */}
          <Field label="Current lesson" hint="What the class has covered">
            <Stepper
              value={config.currentLesson}
              min={1}
              max={TOTAL_LESSONS}
              onChange={(currentLesson) => patch({ currentLesson })}
            />
          </Field>

          <Field label="New cards per day" hint="How fast new words arrive">
            <Stepper
              value={config.newPerDay}
              min={0}
              max={60}
              step={2}
              onChange={(newPerDay) => patch({ newPerDay })}
            />
          </Field>

          <Field label="Max reviews per day" hint="The ceiling on one session">
            <Stepper
              value={config.maxReviews}
              min={10}
              max={400}
              step={10}
              onChange={(maxReviews) => patch({ maxReviews })}
            />
          </Field>

          <Field label="Speed window" hint="Time per word in the speed drill">
            <Stepper
              value={config.speedWindowMs}
              min={700}
              max={5000}
              step={100}
              format={(n) => `${(n / 1000).toFixed(1)}s`}
              onChange={(speedWindowMs) => patch({ speedWindowMs })}
            />
          </Field>

          <Field label="Show harakat" hint="The short vowels, on every card face">
            <Switch
              value={config.showHarakat}
              onValueChange={(showHarakat) => patch({ showHarakat })}
              trackColor={{ true: theme.colors.lapis, false: theme.colors.rule }}
            />
          </Field>
        </Section>

        <Section title="Reminders">

          <Field
            label="Daily reminders"
            hint="A time to sit down, once or twice a day"
          >
            <Switch
              value={config.remindersOn}
              disabled={!remindersAvailable()}
              onValueChange={async (remindersOn) => {
                /* Permission is asked here and nowhere else. iOS gives exactly
                   one chance, so it is spent on an explicit toggle. */
                if (remindersOn) {
                  const granted = await requestPermission();
                  if (!granted) {
                    Alert.alert(
                      "Notifications are off",
                      "Durus cannot schedule reminders until notifications are allowed for it in iOS Settings.",
                    );
                    return;
                  }
                }
                patch({ remindersOn });
              }}
              trackColor={{ true: theme.colors.lapis, false: theme.colors.rule }}
            />
          </Field>

          {config.remindersOn ? (
            <>
              <Field label="First reminder">
                <Stepper
                  value={config.reminderHour}
                  min={5}
                  max={22}
                  format={hourLabel}
                  onChange={(reminderHour) => patch({ reminderHour })}
                />
              </Field>

              <Field label="Second reminder">
                <Switch
                  value={config.secondReminderOn}
                  onValueChange={(secondReminderOn) => patch({ secondReminderOn })}
                  trackColor={{ true: theme.colors.lapis, false: theme.colors.rule }}
                />
              </Field>

              {config.secondReminderOn ? (
                <Field label="Second time">
                  <Stepper
                    value={config.reminderHour2}
                    min={5}
                    max={22}
                    format={hourLabel}
                    onChange={(reminderHour2) => patch({ reminderHour2 })}
                  />
                </Field>
              ) : null}

              <Field
                label="Class day nudge"
                hint="Wednesday, to add the words from class"
              >
                <Switch
                  value={config.classDayReminder}
                  onValueChange={(classDayReminder) => patch({ classDayReminder })}
                  trackColor={{ true: theme.colors.lapis, false: theme.colors.rule }}
                />
              </Field>
            </>
          ) : null}

          <Button
            label="Send a test reminder"
            variant="quiet"
            onPress={async () => {
              const ok = await sendTestReminder();
              Alert.alert(
                ok ? "On its way" : "Could not schedule",
                ok
                  ? "It will arrive in about five seconds."
                  : "Notifications are not allowed for Durus. Turn them on in iOS Settings.",
              );
            }}
          />
        </Section>

        <Section title="This device">

          <Field label="Haptics" hint="A tap when you choose an answer">
            <Switch
              value={config.hapticsEnabled}
              onValueChange={(hapticsEnabled) => {
                setHapticsEnabled(hapticsEnabled);
                patch({ hapticsEnabled });
              }}
              trackColor={{ true: theme.colors.lapis, false: theme.colors.rule }}
            />
          </Field>

          <Field label="Reduce motion" hint="The card turn becomes a fade">
            <Switch
              value={config.reduceMotion}
              onValueChange={(reduceMotion) => patch({ reduceMotion })}
              trackColor={{ true: theme.colors.lapis, false: theme.colors.rule }}
            />
          </Field>
        </Section>

        <Section title="Data">
          <Button
            label={busy ? "Preparing…" : "Export all data as JSON"}
            variant="quiet"
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              try {
                const data = exportAll(db, profileId);
                /*
                  A real .json file rather than a string in a share sheet. An
                  export of a few thousand reviews is far past what a share
                  message body handles gracefully, and a file is what the user
                  actually wants at the other end - it lands in Files, iCloud or
                  a mail attachment intact.
                */
                const name = `durus-${new Date().toISOString().slice(0, 10)}.json`;
                /* SDK 55's File API, not the legacy writeAsStringAsync helpers.
                   Cache rather than documents: an export is a copy on its way
                   somewhere else, and leaving them in documents accumulates
                   files the user never asked to keep. */
                const file = new File(Paths.cache, name);
                if (file.exists) file.delete();
                file.create();
                file.write(JSON.stringify(data, null, 2));
                const uri = file.uri;
                /* iOS's share sheet takes a file:// url directly, so this needs
                   no extra native module - the recipient gets a real .json
                   attachment rather than pasted text. */
                await Share.share({ url: uri, title: name });
              } finally {
                setBusy(false);
              }
            }}
          />
          <Text variant="label" color="inkFaint">
            Everything this profile has answered, as JSON.
          </Text>

          <Pressable onPress={() => router.push("/paste")} style={{ paddingVertical: space(1.5) }}>
            <Text color="lapis">Add cards from a pasted block</Text>
          </Pressable>
        </Section>

        <Section title="Account">

          {isSignedIn ? (
            <>
              <Text color="inkSoft">
                {user?.primaryEmailAddress?.emailAddress ?? "Signed in"}
              </Text>

              {/*
                The ONLY sync surface in the app. One static line, body text,
                no colour, no icon, no badge - it states a fact and offers an
                action, in the one place someone came looking for both.
              */}
              <Text variant="label" color="inkFaint">
                {syncLine(profileId, syncTick)}
              </Text>

              <Button
                label={syncing ? "Syncing…" : "Sync now"}
                variant="quiet"
                disabled={syncing}
                onPress={async () => {
                  setSyncing(true);
                  try {
                    await syncNow(getToken);
                  } finally {
                    setSyncing(false);
                    setSyncTick((n) => n + 1);
                  }
                }}
              />

              {/*
                Deleting the account, from inside the app.

                App Store guideline 5.1.1(v) requires this of anything that lets
                you create an account, and it is the only honest counterpart to
                the export above: one hands the data back, the other removes it.

                Two confirmations, because it cannot be undone and the first tap
                is one row below Sign out. The second one names what goes rather
                than asking again in the same words - "are you sure" twice
                teaches people to tap through both.
              */}
              <Pressable
                disabled={deleting}
                onPress={() =>
                  Alert.alert(
                    "Delete your account?",
                    "Your account and every answer you have given are removed from the server and from this phone. This cannot be undone.",
                    [
                      { text: "Keep my account", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () =>
                          Alert.alert(
                            "Delete everything?",
                            "There is no way to get this back. Export your data first if you want a copy.",
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Delete for good",
                                style: "destructive",
                                onPress: () => void removeAccount(),
                              },
                            ],
                          ),
                      },
                    ],
                  )
                }
                style={{ paddingVertical: space(1.5), alignItems: "center" }}
              >
                <Text color="clay">
                  {deleting ? "Deleting…" : "Delete account"}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text variant="label" color="inkFaint">
                Without an account your progress lives only on this phone.
              </Text>
              <Button label="Sign in" onPress={() => router.push("/sign-in")} />
            </>
          )}
        </Section>

        {/*
          Sign out lives OUT here, not inside the Account section.

          Collapsing the sections tidied the screen and hid the one control
          people come to Settings specifically to find. A drawer is fine for
          things you configure once; it is not fine for the way out.
        */}
        {isSignedIn ? (
          <Pressable
            onPress={() =>
              Alert.alert(
                "Sign out?",
                "Your progress stays on this phone and syncs again when you sign back in.",
                [
                  { text: "Stay", style: "cancel" },
                  {
                    text: "Sign out",
                    style: "destructive",
                    /*
                      Leave for the sign in screen ourselves rather than waiting
                      to be redirected. Signing out is not reactive here - the
                      gate on the index route reads the local account row at
                      launch - so without this the app sits on a Settings screen
                      belonging to an account it no longer has.
                    */
                    onPress: () => {
                      void signOut();
                      router.replace("/welcome");
                    },
                  },
                ],
              )
            }
            style={{ paddingVertical: space(2), alignItems: "center" }}
          >
            <Text color="clay">Sign out</Text>
          </Pressable>
        ) : null}

        {/*
          Setup again, keeping the account.

          Signing out goes to the sign in screen rather than back through the
          questions, which is right for someone returning and leaves no way to
          revisit them. This is that way: it forgets only that setup was done.
        */}
        <Pressable
          onPress={() =>
            Alert.alert(
              "Run setup again?",
              "Durus will ask about your book, your lesson and your reminders again. Nothing you have answered is lost.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Run setup",
                  onPress: () => {
                    restartOnboarding();
                    router.replace("/onboarding");
                  },
                },
              ],
            )
          }
          style={{ paddingVertical: space(2), alignItems: "center" }}
        >
          <Text color="lapis">Run setup again</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/about")}
          style={{ paddingVertical: space(2), alignItems: "center" }}
        >
          <Text>About Durus</Text>
        </Pressable>

        <Button
          label="Back to today"
          variant="quiet"
          style={{ marginTop: space(2) }}
          onPress={() => router.back()}
        />
      </ScrollView>
    </Screen>
  );
}
