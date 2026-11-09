/**
 * Spread into every Stack's `screenOptions`.
 *
 * By default the native stack pins each navigation bar to "light" or "dark"
 * from the navigation theme. iOS does not redraw the bar's glass buttons
 * (back, +, …) when that pin changes later, so after the system switched
 * appearance with the app open (sunset, Control Center) they kept the old
 * look until the app was restarted. Rollio always follows the system
 * appearance, so the bar is left unpinned and follows it too, live.
 *
 * The option's type only lists 'light' and 'dark'; the native side also
 * takes 'unspecified' (no pin), which is what this passes.
 */
export const headerFollowsSystemAppearance = {
    headerUserInterfaceStyle: 'unspecified',
} as unknown as { headerUserInterfaceStyle?: 'light' | 'dark' };
