import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { Tour } from "./Tour";

/*
  The tour cannot be watched on a device from this repo, so this walks every
  panel and every demo beat under fake timers. A crash in any demo, or a panel
  that never shows, fails here instead of on a new user's first screen.
*/
const LAYOUT = { nativeEvent: { layout: { width: 340, height: 500 } } };

describe("onboarding tour", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("walks all five panels and runs every demo", async () => {
    await render(<Tour />);
    await fireEvent(screen.getByTestId("tour"), "layout", LAYOUT);

    for (const title of ["Read the Quran", "See what you carry", "Learn the Arabic", "Build barakah", "Ask"]) {
      expect(screen.getByText(title)).toBeTruthy();
      /* Long enough for each demo to run several beats before moving on. */
      await act(async () => {
        jest.advanceTimersByTime(4200);
      });
    }
    expect(screen.getByText("Read the Quran")).toBeTruthy();
  });

  it("jumps to a panel from its dot and types the question", async () => {
    await render(<Tour />);
    await fireEvent(screen.getByTestId("tour"), "layout", LAYOUT);
    await fireEvent.press(screen.getByLabelText("Show Ask"));
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.getByText("I feel anxious about work")).toBeTruthy();
  });
});
