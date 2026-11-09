const { withMainActivity } = require('expo/config-plugins');

/**
 * Android only. When the system has ended the app's process but the app is
 * still in recents, a link (for example from the home screen widget) arrives
 * through onNewIntent before JavaScript is running, and React Native drops it:
 * the app opens on its start screen instead of the linked one. Keeping the new
 * intent as the activity's intent lets the router read it as the initial URL.
 */
module.exports = function withDeepLinkAfterProcessDeath(config) {
    return withMainActivity(config, (mod) => {
        let src = mod.modResults.contents;
        if (src.includes('override fun onNewIntent')) return mod;
        if (!src.includes('import android.content.Intent')) {
            src = src.replace('import android.os.Bundle', 'import android.content.Intent\nimport android.os.Bundle');
        }
        const anchor = '  override fun getMainComponentName()';
        if (!src.includes(anchor)) {
            throw new Error('withDeepLinkAfterProcessDeath: MainActivity.kt has changed shape; update the plugin.');
        }
        src = src.replace(
            anchor,
            '  override fun onNewIntent(intent: Intent) {\n    super.onNewIntent(intent)\n    setIntent(intent)\n  }\n\n' + anchor,
        );
        mod.modResults.contents = src;
        return mod;
    });
};
