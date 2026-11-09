import { useColorScheme } from 'react-native';
import { Box, DropdownMenu, DropdownMenuItem, Host, Text as ComposeText } from '@expo/ui/jetpack-compose';
import { size } from '@expo/ui/jetpack-compose/modifiers';

import type { SkipFrameMenuProps } from './SkipFrameMenu';

/**
 * A Material dropdown that opens under the header "+" after a long press. The
 * button itself stays a React Native view; this is only an anchor of one dp
 * at its bottom edge plus the popup.
 */
export default function SkipFrameMenu({ open, label, onClose, onSkip }: SkipFrameMenuProps) {
    const colorScheme = useColorScheme();
    return (
        <Host matchContents colorScheme={colorScheme ?? undefined} style={{ position: 'absolute', left: 0, bottom: 0 }}>
            <DropdownMenu expanded={open} onDismissRequest={onClose}>
                <DropdownMenu.Trigger>
                    <Box modifiers={[size(1, 1)]} />
                </DropdownMenu.Trigger>
                <DropdownMenu.Items>
                    <DropdownMenuItem onClick={() => { onClose(); onSkip(); }}>
                        <DropdownMenuItem.Text>
                            <ComposeText>{label}</ComposeText>
                        </DropdownMenuItem.Text>
                    </DropdownMenuItem>
                </DropdownMenu.Items>
            </DropdownMenu>
        </Host>
    );
}
