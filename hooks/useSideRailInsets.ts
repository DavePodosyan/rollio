import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { ViewInstance } from 'react-native';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Horizontal padding that keeps a view clear of iOS side rails (the vertical
 * toolbar/tab/status column on iPhone Duo and in Split View).
 *
 * Modal sheets do not receive these insets through their own safe area, so the
 * padding is derived from the root window's insets and the view's measured
 * position in that window. On a regular phone both values are 0.
 */
export function useSideRailInsets(viewRef: RefObject<ViewInstance | null>) {
    const insets = useSafeAreaInsets();
    const frame = useSafeAreaFrame();
    const [pad, setPad] = useState({ left: 0, right: 0 });

    const measure = useCallback(() => {
        viewRef.current?.measureInWindow((x, _y, width) => {
            const contentStart = frame.x + insets.left;
            const contentEnd = frame.x + frame.width - insets.right;
            const left = Math.max(0, Math.round(contentStart - x));
            const right = Math.max(0, Math.round(x + width - contentEnd));
            setPad((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
        });
    }, [viewRef, frame, insets]);

    // Re-measure when the window insets change (fold, Split View) as well as on layout.
    useEffect(() => {
        measure();
    }, [measure]);

    return { left: pad.left, right: pad.right, onLayout: measure };
}
