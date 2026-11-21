import { File, Paths } from "expo-file-system";
import { deleteDatabaseSync } from "expo-sqlite";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, Share, Switch, TextInput } from "react-native";

import { BackBar } from "@/components/BackBar";
import { Field, Segmented, Stepper } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { Group, LinkRow } from "@/components/Group";
import { Text } from "@/components/Text";
import { DB_NAME, db, sqlite } from "@/data/client";
import { FONTS } from "@/theme/typography";
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
import { clearDeviceStores } from "@/state/clear";
import { usePrefs } from "@/state/prefs";
import { useSession } from "@/state/session";
import { useThemeChoice, type ThemeChoice } from "@/state/theme";
import { deleteAccount } from "@/sync/deleteAccount";
import { pendingCount, syncNow } from "@/sync/engine";
import { space } from "@/theme/layout";
import { useTheme } from "@/theme/useTheme";
import { canPlayWordAudio } from "@/lib/wordAudio";
import {
  downloadSummary,
  recitationCredit,
  removeAllRecitations,
  syncOfflineRecitation,
  useRecitationDownloads,
} from "@/quran/offlineAudio";
import { quranApiConfigured } from "@/quran/remote";

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
  const resetTips = usePrefs((st) => st.resetTips);
  const themeChoice = useThemeChoice((st) => st.choice);
  const adhkarReminder = usePrefs((st) => st.adhkarReminder);
  const setAdhkarReminder = usePrefs((st) => st.setAdhkarReminder);
  const setThemeChoice = useThemeChoice((st) => st.setChoice);
  const name = usePrefs((st) => st.name);
  const setName = usePrefs((st) => st.setName);
  const [nameDraft, setNameDraft] = useState(name);

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
      clearDeviceStores();
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

  const sw = { true: theme.colors.lapis, false: theme.colors.rule };

  const reminderSwitch = (apply: (on: boolean) => void) => async (next: boolean) => {
    /* Permission is asked here and nowhere else. iOS gives exactly one chance,
       so it is spent on an explicit toggle. */
    if (next) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          "Notifications are off",
          "Durus cannot schedule reminders until notifications are allowed for it in iOS Settings.",
        );
        return;
      }
    }
    apply(next);
  };

  return (
    <Screen>
      <BackBar />
      <ScrollView
        contentContainerStyle={{ paddingBottom: space(6), gap: space(3) }}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="pageTitle" style={{ textAlign: "center", fontSize: 30, lineHeight: 36 }}>
          Settings
        </Text>

        <Group title="You">
          <Field label="Your name" hint="For the greeting on Search">
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              onEndEditing={() => setName(nameDraft)}
              placeholder="Name"
              placeholderTextColor={theme.colors.inkFaint}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              maxLength={40}
              accessibilityLabel="Your name"
              style={{ minWidth: 120, textAlign: "right", fontFamily: FONTS.uiRegular, fontSize: 17, color: theme.colors.ink }}
            />
          </Field>
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
        </Group>

        {/* Where you are in the course. Only Book 1 has content, so the book is shown, not offered. */}
        <Group title="Arabic course">
          <Field label="Book" hint="Books 2 and 3 are on the way">
            <Text color="inkSoft">{`Book ${config.currentBook}`}</Text>
          </Field>
          <Field label="Current lesson">
            <Stepper
              value={config.currentLesson}
              min={1}
              max={TOTAL_LESSONS}
              onChange={(currentLesson) => patch({ currentLesson })}
            />
          </Field>
        </Group>

        <Group title="Daily study">
          <Field label="New words a day">
            <Stepper value={config.newPerDay} min={0} max={60} step={2} onChange={(newPerDay) => patch({ newPerDay })} />
          </Field>
          <Field label="Most reviews a day">
            <Stepper value={config.maxReviews} min={10} max={400} step={10} onChange={(maxReviews) => patch({ maxReviews })} />
          </Field>
        </Group>

        {/* Ask me filters what the queue draws and changes nothing scheduled. Typing only skips the choice rung (phrases stay on choice). */}
        <Group title="How you are asked">
          <Field label="Ask me in">
            <Segmented<"both" | "recognition" | "production">
              value={config.drillDirection}
              options={[
                { value: "both", label: "Both" },
                { value: "recognition", label: "Arabic" },
                { value: "production", label: "English" },
              ]}
              onChange={(drillDirection) => patch({ drillDirection })}
            />
          </Field>
          <Field label="Typing only" hint="Type or build every word, no multiple choice">
            <Switch value={config.typingOnly} onValueChange={(typingOnly) => patch({ typingOnly })} trackColor={sw} />
          </Field>
          <Field label="Show harakat" hint="The short vowels on every card">
            <Switch value={config.showHarakat} onValueChange={(showHarakat) => patch({ showHarakat })} trackColor={sw} />
          </Field>
        </Group>

        <Group title="Speed drill">
          <Field label="Time per word">
            <Stepper
              value={config.speedWindowMs}
              min={700}
              max={5000}
              step={100}
              format={(n) => `${(n / 1000).toFixed(1)}s`}
              onChange={(speedWindowMs) => patch({ speedWindowMs })}
            />
          </Field>
          <LinkRow
            label="Find my speed"
            hint="A short run with no clock, to set the time from how fast you read"
            onPress={() => router.push("/speed?mode=diagnostic")}
          />
        </Group>

        <Group title="Reminders">
          <Field label="Morning adhkar" hint="Every day at 6:00 AM">
            <Switch
              value={adhkarReminder}
              disabled={!remindersAvailable()}
              onValueChange={reminderSwitch((on) => {
                setAdhkarReminder(on);
                if (profileId !== null) void syncReminders(db, profileId);
              })}
              trackColor={sw}
            />
          </Field>
          <Field label="Study reminder" hint="A time to sit down, once or twice a day">
            <Switch
              value={config.remindersOn}
              disabled={!remindersAvailable()}
              onValueChange={reminderSwitch((remindersOn) => patch({ remindersOn }))}
              trackColor={sw}
            />
          </Field>
          {config.remindersOn ? (
            <>
              <Field label="At">
                <Stepper value={config.reminderHour} min={5} max={22} format={hourLabel} onChange={(reminderHour) => patch({ reminderHour })} />
              </Field>
              <Field label="A second time">
                <Switch value={config.secondReminderOn} onValueChange={(secondReminderOn) => patch({ secondReminderOn })} trackColor={sw} />
              </Field>
              {config.secondReminderOn ? (
                <Field label="Second at">
                  <Stepper value={config.reminderHour2} min={5} max={22} format={hourLabel} onChange={(reminderHour2) => patch({ reminderHour2 })} />
                </Field>
              ) : null}
              <Field label="Class day nudge" hint="Wednesday, to add the words from class">
                <Switch value={config.classDayReminder} onValueChange={(classDayReminder) => patch({ classDayReminder })} trackColor={sw} />
              </Field>
            </>
          ) : null}
          <LinkRow
            label="Send a test reminder"
            chevron={false}
            onPress={async () => {
              const ok = await sendTestReminder();
              Alert.alert(
                ok ? "On its way" : "Could not schedule",
                ok ? "It will arrive in about five seconds." : "Notifications are not allowed for Durus. Turn them on in iOS Settings.",
              );
            }}
          />
        </Group>

        <OfflineRecitation />

        <Group title="This phone">
          <Field label="Haptics" hint="A tap when you choose an answer">
            <Switch
              value={config.hapticsEnabled}
              onValueChange={(hapticsEnabled) => {
                setHapticsEnabled(hapticsEnabled);
                patch({ hapticsEnabled });
              }}
              trackColor={sw}
            />
          </Field>
          <Field label="Reduce motion" hint="The card turn becomes a fade">
            <Switch value={config.reduceMotion} onValueChange={(reduceMotion) => patch({ reduceMotion })} trackColor={sw} />
          </Field>
          {/* Every first-visit tip again, each on its page's next visit. */}
          <LinkRow
            label="Show tips again"
            chevron={false}
            onPress={() => {
              resetTips();
              Alert.alert("Tips are back", "Each page shows its tip the next time you open it.");
            }}
          />
          {/* The new-learner flow, seen from this account, with nothing saved. */}
          <LinkRow label="Preview onboarding" onPress={() => router.push("/onboarding?preview=1")} />
        </Group>

        <Group title="Account" footer={isSignedIn ? syncLine(profileId, syncTick) : "Without an account your progress lives only on this phone."}>
          {isSignedIn ? (
            <>
              <Field label="Signed in">
                <Text variant="label" color="inkSoft" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {user?.primaryEmailAddress?.emailAddress ?? ""}
                </Text>
              </Field>
              <LinkRow
                label={syncing ? "Syncing…" : "Sync now"}
                chevron={false}
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
                AWAIT the sign out before navigating: navigating while it was in
                flight landed on a welcome screen that still saw a session and
                bounced straight back into the app.
              */}
              <LinkRow
                label="Sign out"
                tone="clay"
                chevron={false}
                onPress={() =>
                  Alert.alert("Sign out?", "Your progress stays on this phone and syncs again when you sign back in.", [
                    { text: "Stay", style: "cancel" },
                    {
                      text: "Sign out",
                      style: "destructive",
                      onPress: () => {
                        void (async () => {
                          await signOut();
                          router.replace("/welcome");
                        })();
                      },
                    },
                  ])
                }
              />
            </>
          ) : (
            <LinkRow label="Sign in" onPress={() => router.push("/sign-in")} />
          )}
        </Group>

        <Group title="Your data" footer="The export is everything this profile has answered, as a JSON file.">
          <LinkRow
            label={busy ? "Preparing…" : "Export all data"}
            chevron={false}
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              try {
                const data = exportAll(db, profileId);
                /* A real .json file in cache (a copy on its way somewhere else), shared by file:// url. */
                const name = `durus-${new Date().toISOString().slice(0, 10)}.json`;
                const file = new File(Paths.cache, name);
                if (file.exists) file.delete();
                file.create();
                file.write(JSON.stringify(data, null, 2));
                await Share.share({ url: file.uri, title: name });
              } finally {
                setBusy(false);
              }
            }}
          />
          <LinkRow label="Add cards from a pasted block" onPress={() => router.push("/paste")} />
        </Group>

        <Group>
          <LinkRow label="About Durus" tone="ink" onPress={() => router.push("/about")} />
          {/* Setup again, keeping the account: forgets only that setup was done. */}
          <LinkRow
            label="Run setup again"
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
          />
        </Group>

        {/*
          Deleting the account (App Store 5.1.1(v)). Two confirmations, the second
          naming what goes, because it cannot be undone.
        */}
        {isSignedIn ? (
          <Group>
            <LinkRow
              label={deleting ? "Deleting…" : "Delete account"}
              tone="clay"
              chevron={false}
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
                        Alert.alert("Delete everything?", "There is no way to get this back. Export your data first if you want a copy.", [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete for good", style: "destructive", onPress: () => void removeAccount() },
                        ]),
                    },
                  ],
                )
              }
            />
          </Group>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/*
  Offline recitation: the learner's choice to keep the whole Quran's
  recitation on the phone (Quran Foundation allows this when the learner
  chooses it; see src/quran/offlineAudio.ts). Shown only on builds that can
  play audio.
*/
function OfflineRecitation() {
  useRecitationDownloads();
  const theme = useTheme();
  const reciterId = usePrefs((st) => st.reciterId) ?? 7;
  const translationId = usePrefs((st) => st.translationId);
  const on = usePrefs((st) => st.offlineAudio) === true;
  const setOn = usePrefs((st) => st.setOfflineAudio);
  if (!canPlayWordAudio() || !quranApiConfigured()) return null;
  const sum = downloadSummary(reciterId);
  const mb = Math.round(sum.bytes / 1_000_000);
  return (
    <Group title="Offline recitation" footer={recitationCredit(reciterId)}>
      <Field label="Keep it on this phone" hint="Downloads in the background, plays without a connection">
        <Switch
          value={on}
          onValueChange={(next) => {
            if (next) {
              setOn(true);
              syncOfflineRecitation(translationId, reciterId);
            } else {
              Alert.alert("Turn off offline recitation?", "The downloaded recitation is removed. Listening will need a connection.", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Turn off",
                  style: "destructive",
                  onPress: () => {
                    setOn(false);
                    removeAllRecitations();
                  },
                },
              ]);
            }
          }}
          trackColor={{ true: theme.colors.lapis, false: theme.colors.rule }}
        />
      </Field>
      {on ? (
        <Text variant="label" color="inkSoft" style={{ paddingVertical: space(1.5) }}>
          {sum.active
            ? `Downloading surah ${sum.active.surah}, ayah ${sum.active.done} of ${sum.active.total}. ${sum.surahs} of 114 started, ${mb} MB so far.`
            : `${sum.surahs} of 114 surahs on this phone, ${mb} MB.`}
        </Text>
      ) : null}
    </Group>
  );
}
