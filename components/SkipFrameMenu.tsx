// The hold menu of a roll's "+" button on Android (see SkipFrameMenu.android.tsx).
// iOS builds the same menu natively in the toolbar, so this renders nothing there.
export interface SkipFrameMenuProps {
    open: boolean;
    label: string;
    onClose: () => void;
    onSkip: () => void;
}

export default function SkipFrameMenu(_props: SkipFrameMenuProps) {
    return null;
}
