import type { Frame } from '@/types';

// Pure rules for skipped frames, shared by the list, the form and the exports.

/** True for a frame logged as skipped. Tolerates rows read before the column existed. */
export const isSkipped = (frame: Pick<Frame, 'skipped'> | null | undefined): boolean => !!frame?.skipped;

/**
 * The frame a new frame copies its settings from: the highest-numbered frame
 * that was actually logged. With `before`, only frames numbered below it
 * count, for a skipped frame that is being logged after all.
 */
export const lastLoggedFrame = <T extends Pick<Frame, 'frame_no' | 'skipped'>>(frames: T[], before?: number): T | null => {
    let last: T | null = null;
    for (const frame of frames) {
        if (isSkipped(frame)) continue;
        if (before !== undefined && frame.frame_no >= before) continue;
        if (!last || frame.frame_no > last.frame_no) last = frame;
    }
    return last;
};
