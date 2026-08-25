import { File, Paths } from "expo-file-system";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Share, Switch, View } from "react-native";

import { Button } from "@/components/Button";
import { Field, Rule, Segmented, Stepper } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { db } from "@/data/client";
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
import { pendingCount, syncNow } from "@/sync/engine";
import { space } from "@/theme/layout";
import { makeStyles, useTheme } from "@/theme/useTheme";

const useStyles = makeStyles(() => ({
  group: { paddingTop: space(3), gap: space(0.5) },
}));

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
  const s = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const profileId = useSession((st) => st.activeProfileId);
  const themeChoice = useThemeChoice((st) => st.choice);
  const setThemeChoice = useThemeChoice((st) => st.setChoice);

  const [config, setConfig] = useState(() =>
    profileId === null ? null : getSettingsFor(db, profileId),
  );
  const [busy, setBusy] = useState(false);
  const { isSignedIn, getToken, signOut } = useAuth();
  const { user } = useUser();
  const [syncing, setSyncing] = useState(false);
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
      <ScrollView contentContainerStyle={{ paddingBottom: space(5) }}>
        <Text variant="eyebrow" color="inkSoft">
          Preferences
        </Text>
        <Text variant="pageTitle">Settings</Text>

        <View style={s.group}>
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
        </View>

        <Rule />

        <View style={s.group}>
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
        </View>

        <Rule />

        <View style={s.group}>
          <Text variant="eyebrow" color="inkSoft">
            Reminders
          </Text>

          <Field
            label="Daily reminders"
            hint="Silent when nothing is due, or when you have just finished"
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
                hint="Wednesday, whether or not anything is due"
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
                  ? "It will arrive in about five seconds. Lock the phone to see it as you normally would."
                  : "Notifications are not allowed for Durus. Turn them on in iOS Settings.",
              );
            }}
          />
        </View>

        <Rule />

        <View style={s.group}>
          <Text variant="eyebrow" color="inkSoft">
            This device
          </Text>

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
        </View>

        <Rule />

        <View style={s.group}>
          <Text variant="eyebrow" color="inkSoft">
            Data
          </Text>
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
        </View>

        <Rule />

        <View style={s.group}>
          <Text variant="eyebrow" color="inkSoft">
            Account
          </Text>

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

              <Pressable
                onPress={() =>
                  Alert.alert(
                    "Sign out?",
                    "Your progress stays on this phone and syncs again when you sign back in.",
                    [
                      { text: "Stay", style: "cancel" },
                      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
                    ],
                  )
                }
                style={{ paddingVertical: space(1.5) }}
              >
                <Text color="clay">Sign out</Text>
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
        </View>

        <Rule />

        <Pressable onPress={() => router.push("/about")} style={{ paddingVertical: space(2) }}>
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
