// Closing a form (new frame, new film). Pure, with the router passed in, so it
// runs under Node for tests.

type RouterLike = {
    canGoBack: () => boolean;
    back: () => void;
    replace: (href: any, options?: { withAnchor?: boolean }) => void;
    navigate: (href: any) => void;
};

/**
 * Closes the form and, when `then` is given, goes on to it. A form normally
 * has the screen it was opened from behind it. One opened straight from a
 * widget with the app closed has nothing behind it: there the app's start
 * screen takes the form's place, or `then` does.
 *
 * (The tabs are deliberately not placed under such a form with a root-layout
 * `anchor`: with the start screen's redirect that mounts the tabs twice, and
 * everything the tabs layout does on launch, like What's New, runs twice.)
 */
export const closeModal = (router: RouterLike, then?: string) => {
    if (router.canGoBack()) {
        router.back();
        if (then) router.navigate(then);
    } else if (then) {
        // withAnchor puts the destination's own base screen behind it (the film list behind a roll,
        // see unstable_settings in app/(tabs)/films/_layout.tsx), so Back has somewhere to go.
        router.replace(then, { withAnchor: true });
    } else {
        router.replace('/');
    }
};
