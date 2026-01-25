import {
    Button,
    ContextMenu,
    Host,
    Image,
    Submenu,
    Switch,
} from "@expo/ui/swift-ui";
import { SymbolView } from "expo-symbols";
import * as React from "react";
import { View } from "react-native";
import { useColorScheme } from "react-native";
const options = [
    // {
    //     systemImage: "info.circle",
    //     title: "Show List Info",
    //     type: "button",
    // },
    // {
    //     title: "Select Reminders",
    //     systemImage: "checkmark.circle",
    //     type: "button",
    // },
    // {
    //     title: "Sort By",
    //     systemImage: "arrow.up.arrow.down",
    //     type: "submenu",
    //     items: [
    //         {
    //             title: "Manual",
    //             systemImage: "hand.point.up.left",
    //             type: "button",
    //         },
    //         {
    //             title: "Due Date",
    //             systemImage: "calendar",
    //             type: "button",
    //         },
    //         {
    //             title: "Creation Date",
    //             systemImage: "plus.circle",
    //             type: "button",
    //         },
    //         {
    //             title: "Priority",
    //             systemImage: "exclamationmark.triangle",
    //             type: "button",
    //         },
    //         {
    //             title: "Title",
    //             systemImage: "textformat.abc",
    //             type: "button",
    //         },
    //     ],
    // },
    // {
    //     title: "Show Completed",
    //     systemImage: "eye",
    //     type: "switch",
    //     value: true,
    // },
    // {
    //     title: "Settings",
    //     systemImage: "gear",
    //     type: "submenu",
    //     items: [
    //         {
    //             title: "Notifications",
    //             systemImage: "bell",
    //             type: "button",
    //         },
    //         {
    //             title: "Advanced",
    //             systemImage: "wrench.and.screwdriver",
    //             type: "submenu",
    //             items: [
    //                 {
    //                     title: "Debug Mode",
    //                     systemImage: "ladybug",
    //                     type: "button",
    //                 },
    //                 {
    //                     title: "Reset Settings",
    //                     systemImage: "arrow.clockwise",
    //                     type: "button",
    //                     destructive: true,
    //                 },
    //             ],
    //         },
    //     ],
    // },
    // {
    //     title: "Print",
    //     systemImage: "printer",
    //     type: "button",
    // },
    {
        title: "Edit",
        systemImage: "pencil",
        type: "button",
    },
    {
        title: "Delete",
        systemImage: "trash",
        type: "button",
        destructive: true,
    },
];

export default function ContextMenuFilm({ onSelect }: { onSelect: (action: string) => void }) {
    const colorScheme = useColorScheme();
    const [switchStates, setSwitchStates] = React.useState<
        Record<string, boolean>
    >({
        "Show Completed": true,
    });

    const renderOption = (
        option: any,
        index: number
    ): React.ReactElement | null => {
        switch (option.type) {
            case "button":
                return (
                    <Button
                        key={index}
                        systemImage={option.systemImage}
                        role={option.destructive ? "destructive" : undefined}
                        onPress={() =>
                            onSelect(
                                option.title.toString().toLowerCase().replace(/\s+/g, "_")
                            )
                        }
                    >
                        {option.title}
                    </Button>
                );

            case "switch":
                return (
                    <Switch
                        key={index}
                        value={switchStates[option.title] || false}
                        label={option.title}
                        variant="checkbox"
                        onValueChange={(value) =>
                            setSwitchStates((prev) => ({ ...prev, [option.title]: value }))
                        }
                    />
                );
            case "submenu":
                return (
                    <Submenu
                        key={index}
                        button={
                            <Button systemImage={option.systemImage}>{option.title}</Button>
                        }
                    >
                        {option.items?.map((subItem: any, subIndex: number) =>
                            renderOption(subItem, subIndex)
                        )}
                    </Submenu>
                );
            default:
                return null;
        }
    };

    return (
        <Host style={{ width: 35, height: 35 }}>
            <ContextMenu>
                <ContextMenu.Items>
                    {options.map((option, index) => renderOption(option, index))}
                </ContextMenu.Items>
                <ContextMenu.Trigger>
                    <View style={{ width: 35, height: 35, justifyContent: 'center', alignItems: 'center', }} >
                        <SymbolView name="ellipsis" size={22} tintColor={colorScheme === 'dark' ? '#ffffff' : '#100528'} />
                    </View>
                </ContextMenu.Trigger>
            </ContextMenu>
        </Host>
    );
}
