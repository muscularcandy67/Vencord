/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 your mom lol
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

const appIds = [
    // insert discord appids here
    "1095440531821170820",
    "968292722391785512",
    "1043858434585526382"
];

export default definePlugin({
    name: "ReplaceActivityType",
    description: "Replace activity types on media apps",
    authors: [{ name: "banana", id: 0n }],
    patches: [
        {
            find: '.displayName="LocalActivityStore"',
            replacement: {
                match: /LOCAL_ACTIVITY_UPDATE:function\((\i)\)\{/,
                replace: "$&$self.replaceType($1.activity);",
            }
        }
    ],
    replaceType(activity) {
        if (!activity) return;
        if (appIds.includes(activity.application_id)) {
            activity.type = 2; // 2 = listening 3 = watching
            // you can also swap name and details (which are usually media/song titles) here if you like
        }
    },
});
