import { useEffect, useState } from "react";
import { Modal, View } from "react-native";

import { Button } from "@/components/Button";
import { Glass } from "@/components/Glass";
import { Text } from "@/components/Text";
import { canPlayWordAudio } from "@/lib/wordAudio";
import { recitationCredit, syncOfflineRecitation } from "@/quran/offlineAudio";
import { quranApiConfigured } from "@/quran/remote";
import { usePrefs } from "@/state/prefs";
import { useSession } from "@/state/session";
import { space } from "@/theme/layout";
import { makeStyles } from "@/theme/useTheme";

/*
  Asked once: keep the recitation on this phone? Quran Foundation allows
  stored recitation only when the learner chooses it, so this is the one
  question; after "Download" everything downloads and stays current on its
  own, like the translations. "Not now" is remembered too; Settings has the
  switch either way. Shown a few seconds after the first screen, once
  onboarding is done, on builds that can play audio.
*/
const useStyles = makeStyles((t) => ({
  scrim: { flex: 1, justifyContent: "center", padding: space(3), backgroundColor: t.dark ? "rgba(8,10,16,0.55)" : "rgba(20,30,60,0.28)" },
  card: { borderRadius: 28, padding: space(3), gap: space(1.5) },
}));

export function OfflinePrompt() {
  const s = useStyles();
  const asked = usePrefs((st) => st.offlineAudio);
  const hydrated = usePrefs((st) => st._hydrated);
  const onboarded = useSession((st) => st.onboardedAt) !== null;
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!hydrated || asked !== null || !onboarded || !canPlayWordAudio() || !quranApiConfigured()) return;
    const id = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(id);
  }, [hydrated, asked, onboarded]);

  const answer = (on: boolean) => {
    const { setOfflineAudio, translationId, reciterId } = usePrefs.getState();
    setOfflineAudio(on);
    setShow(false);
    if (on) syncOfflineRecitation(translationId, reciterId ?? 7);
  };

  return (
    <Modal visible={show} transparent animationType="fade" onRequestClose={() => answer(false)}>
      <View style={s.scrim}>
        <Glass style={s.card}>
          <Text variant="pageTitle" style={{ textAlign: "center" }}>
            Listen offline?
          </Text>
          <Text color="inkSoft" style={{ textAlign: "center" }}>
            Keep the whole recitation on this phone, so every ayah and word plays without a connection. It downloads in the background and keeps itself up to date. It is large, several hundred MB, so Wi-Fi is best.
          </Text>
          <Text variant="label" color="inkFaint" style={{ textAlign: "center" }}>
            {recitationCredit(usePrefs.getState().reciterId ?? 7)}
          </Text>
          <View style={{ gap: space(1), paddingTop: space(1) }}>
            <Button label="Download" onPress={() => answer(true)} />
            <Button label="Not now" variant="quiet" onPress={() => answer(false)} />
          </View>
        </Glass>
      </View>
    </Modal>
  );
}
