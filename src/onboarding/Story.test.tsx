import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { STORY } from "./heroes";
import { PAGE_MS, Story } from "./Story";

/*
  The story cannot be watched on a device from this repo, so this drives it
  under fake timers: every hero renders, pages advance on their own, and under
  Reduce Motion nothing advances at all.
*/
const LAYOUT = { nativeEvent: { layout: { width: 390, height: 520 } } };

jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual("react-native-safe-area-context");
  return { ...actual, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

/* Gestures are the device's job; the clock and the pages are what is tested here. */
jest.mock("react-native-gesture-handler", () => {
  const chain: Record<string, unknown> = {};
  const builder = () => new Proxy(chain, { get: () => () => builder() });
  return {
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: { Tap: builder, LongPress: builder, Pan: builder, Exclusive: () => ({}) },
  };
});

describe("onboarding story", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    (globalThis as { __reducedMotion?: boolean }).__reducedMotion = false;
  });

  it("advances through all five pages on its own and renders every hero", async () => {
    const onDone = jest.fn();
    await render(<Story onDone={onDone} />);
    await fireEvent(screen.getByTestId("story-stage"), "layout", LAYOUT);
    expect(STORY.map((p) => p.title)).toEqual(["Search", "Read the Quran", "See what you carry", "Learn the Arabic", "Build barakah"]);
    for (const page of STORY) {
      expect(screen.getByText(page.title)).toBeTruthy();
      await act(async () => {
        jest.advanceTimersByTime(page.ms + 200);
      });
    }
    /* The last page waits for Continue rather than leaving on its own. */
    expect(screen.getByText("Build barakah")).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText("Continue"));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("does not advance under Reduce Motion", async () => {
    (globalThis as { __reducedMotion?: boolean }).__reducedMotion = true;
    await render(<Story onDone={jest.fn()} />);
    await fireEvent(screen.getByTestId("story-stage"), "layout", LAYOUT);
    await act(async () => {
      jest.advanceTimersByTime(PAGE_MS * 4);
    });
    expect(screen.getByText("Search")).toBeTruthy();
  });

  it("leaves from Skip", async () => {
    const onDone = jest.fn();
    await render(<Story onDone={onDone} />);
    await fireEvent.press(screen.getByText("Skip"));
    expect(onDone).toHaveBeenCalled();
  });
});
