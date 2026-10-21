// Registry of late location fills: a frame saved while its position was
// still being found gets the fix written onto its row when it arrives. One
// entry per frame id; a newer schedule replaces an older one, and saving or
// deleting that frame again cancels it. Pure (promises and timers only) so
// it runs under Node for tests.
import { LATE_FILL_TIMEOUT_MS, type FrameFix } from '@/services/frameLocation';

type Entry = { cancelled: boolean };

const pending = new Map<number, Entry>();

export const hasPendingLateFill = (frameId: number): boolean => pending.has(frameId);

export const cancelLateFill = (frameId: number): void => {
    const entry = pending.get(frameId);
    if (!entry) return;
    entry.cancelled = true;
    pending.delete(frameId);
};

/**
 * Waits for `fixPromise` (at most `timeoutMs`) and hands the fix to `write`.
 * Nothing is written if the fill was cancelled or replaced meanwhile, if the
 * request yielded no fix, or if the timeout won. `write` gets a `stillWanted`
 * check to call after its own awaits (a place lookup, say), since a cancel
 * can land while it is running. A failing write (for example the frame was
 * deleted) is logged and swallowed.
 */
export const scheduleLateFill = (
    frameId: number,
    fixPromise: Promise<FrameFix | null>,
    write: (fix: FrameFix, stillWanted: () => boolean) => Promise<void>,
    timeoutMs: number = LATE_FILL_TIMEOUT_MS
): void => {
    cancelLateFill(frameId);
    const entry: Entry = { cancelled: false };
    pending.set(frameId, entry);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
    });

    Promise.race([fixPromise, timeout])
        .then(async (fix) => {
            if (entry.cancelled || !fix) return;
            await write(fix, () => !entry.cancelled);
        })
        .catch((err) => console.warn('Could not attach the late location fix:', err))
        .finally(() => {
            if (timer) clearTimeout(timer);
            if (pending.get(frameId) === entry) pending.delete(frameId);
        });
};
