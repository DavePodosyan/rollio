// Closing a form: normally "back", but a form opened straight from a widget
// with the app closed has nothing behind it, and must still land somewhere.
import '../db/harness.mjs';
import assert from 'node:assert/strict';

const { closeModal } = await import('@/services/closeModal');

const fakeRouter = (canGoBack) => {
    const calls = [];
    return {
        calls,
        canGoBack: () => canGoBack,
        back: () => calls.push(['back']),
        replace: (href, options) => calls.push(options ? ['replace', href, options] : ['replace', href]),
        navigate: (href) => calls.push(['navigate', href]),
    };
};

// something behind the form: go back to it
let router = fakeRouter(true);
closeModal(router);
assert.deepEqual(router.calls, [['back']]);

// ...and then on to a destination, when one is asked for (the roll a widget's frame was saved to)
router = fakeRouter(true);
closeModal(router, '/films/7');
assert.deepEqual(router.calls, [['back'], ['navigate', '/films/7']]);

// nothing behind the form: the app's start screen takes its place
router = fakeRouter(false);
closeModal(router);
assert.deepEqual(router.calls, [['replace', '/']]);

// ...or the destination does, with the film list put behind it so Back has somewhere to go
router = fakeRouter(false);
closeModal(router, '/films/7');
assert.deepEqual(router.calls, [['replace', '/films/7', { withAnchor: true }]]);

console.log('ALL PASSED');
