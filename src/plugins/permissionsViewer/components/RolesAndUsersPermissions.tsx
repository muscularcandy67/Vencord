/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { InfoIcon, OwnerCrownIcon } from "@components/Icons";
import { getUniqueUsername } from "@utils/discord";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { ContextMenu, FluxDispatcher, GuildMemberStore, Menu, PermissionsBits, ScrollerThin, Switch, Text, Tooltip, useEffect, UserStore, useState, useStateFromStores } from "@webpack/common";
import type { Guild } from "discord-types/general";

import { settings } from "..";
import { cl, getPermissionDescription, getPermissionString } from "../utils";
import { PermissionIcon, PermissionState } from "./icons";

export const enum PermissionType {
    Role = 0,
    User = 1,
    Owner = 2
}

export interface RoleOrUserPermission {
    type: PermissionType;
    id?: string;
    permissions?: bigint;
    overwriteAllow?: bigint;
    overwriteDeny?: bigint;
}

function openRolesAndUsersPermissionsModal(permissions: Array<RoleOrUserPermission>, guild: Guild, header: string) {
    return openModal(modalProps => (
        <RolesAndUsersPermissions
            modalProps={modalProps}
            permissions={permissions}
            guild={guild}
            header={header}
        />
    ));
}

function RolesAndUsersPermissionsComponent({ permissions, guild, modalProps, header }: { permissions: Array<RoleOrUserPermission>; guild: Guild; modalProps: ModalProps; header: string; }) {
    permissions.sort((a, b) => a.type - b.type);

    useStateFromStores(
        [GuildMemberStore],
        () => GuildMemberStore.getMemberIds(guild.id),
        null,
        (old, current) => old.length === current.length
    );

    useEffect(() => {
        const usersToRequest = permissions
            .filter(p => p.type === PermissionType.User && !GuildMemberStore.isMember(guild.id, p.id!))
            .map(({ id }) => id);

        FluxDispatcher.dispatch({
            type: "GUILD_MEMBERS_REQUEST",
            guildIds: [guild.id],
            userIds: usersToRequest
        });
    }, []);

    const [selectedItemIndex, selectItem] = useState(0);
    const selectedItem = permissions[selectedItemIndex];

    const [hideIrrelevantPermissions, setHideIrrelevantPermissions] =
        useState(settings.store.defaultHideIrrelevantPermissions);

    return (
        <ModalRoot
            {...modalProps}
            size={ModalSize.LARGE}
        >
            <ModalHeader>
                <Text className={cl("perms-title")} variant="heading-lg/semibold">{header} permissions:</Text>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>

            <ModalContent>
                {!selectedItem && (
                    <div className={cl("perms-no-perms")}>
                        <Text variant="heading-lg/normal">No permissions to display!</Text>
                    </div>
                )}

                {selectedItem && (
                    <div className={cl("perms-container")}>
                        <ScrollerThin className={cl("perms-list")}>
                            {permissions.map((permission, index) => {
                                const user = UserStore.getUser(permission.id ?? "");
                                const role = guild.roles[permission.id ?? ""];

                                return (
                                    <button
                                        className={cl("perms-list-item-btn")}
                                        onClick={() => selectItem(index)}
                                    >
                                        <div
                                            className={cl("perms-list-item", { "perms-list-item-active": selectedItemIndex === index })}
                                            onContextMenu={e => {
                                                if ((settings.store as any).unsafeViewAsRole && permission.type === PermissionType.Role)
                                                    ContextMenu.open(e, () => (
                                                        <RoleContextMenu
                                                            guild={guild}
                                                            roleId={permission.id!}
                                                            onClose={modalProps.onClose}
                                                        />
                                                    ));
                                            }}
                                        >
                                            {(permission.type === PermissionType.Role || permission.type === PermissionType.Owner) && (
                                                <span
                                                    className={cl("perms-role-circle")}
                                                    style={{ backgroundColor: role?.colorString ?? "var(--primary-300)" }}
                                                />
                                            )}
                                            {permission.type === PermissionType.User && user !== undefined && (
                                                <img
                                                    className={cl("perms-user-img")}
                                                    src={user.getAvatarURL(void 0, void 0, false)}
                                                />
                                            )}
                                            <Text variant="text-md/normal">
                                                {
                                                    permission.type === PermissionType.Role
                                                        ? role?.name || "Unknown Role"
                                                        : permission.type === PermissionType.User
                                                            ? (user && getUniqueUsername(user)) || "Unknown User"
                                                            : (
                                                                <Flex style={{ gap: "0.2em", justifyItems: "center" }}>
                                                                    @owner
                                                                    <OwnerCrownIcon
                                                                        height={18}
                                                                        width={18}
                                                                        aria-hidden="true"
                                                                    />
                                                                </Flex>
                                                            )
                                                }
                                            </Text>
                                        </div>
                                    </button>
                                );
                            })}
                        </ScrollerThin>
                        <ScrollerThin className={cl(
                            "perms-perms",
                            hideIrrelevantPermissions ? "perms-perms-hide-irrelevant-permissions" : undefined
                        )}>
                            <div className={cl("perms-perms-settings")}>
                                <Switch className={cl("perms-perms-settings-setting")}
                                    key="vc-permviewer-hide-irrelevant-permissions"
                                    value={hideIrrelevantPermissions}
                                    onChange={v => setHideIrrelevantPermissions(v)}
                                    hideBorder={true}
                                >Hide irrelevant permissions</Switch>
                            </div>
                            {Object.entries(PermissionsBits).map(([permissionName, bit]) => {
                                const { permissions, overwriteAllow, overwriteDeny } = selectedItem;
                                const permissionState = permissions !== undefined
                                    ? permissions === 0n ? PermissionState.Default
                                        : (permissions & bit) === bit ? PermissionState.Allow : PermissionState.Deny
                                    : undefined;
                                const permissionOverwriteState = overwriteAllow !== undefined || overwriteDeny !== undefined
                                    ? overwriteAllow !== undefined && (overwriteAllow & bit) === bit ? PermissionState.Allow
                                        : overwriteDeny !== undefined && (overwriteDeny & bit) === bit ? PermissionState.Deny
                                            : PermissionState.Default
                                    : undefined;
                                const computedPermissionState = permissionOverwriteState ?? permissionState ?? PermissionState.Default;

                                return (<div className={cl("perms-perms-item")}
                                    data-vc-permviewer-permission-state={permissionState}
                                    data-vc-permviewer-permission-overwrite-state={permissionOverwriteState}
                                >
                                    <div className={cl("perms-perms-item-icon")}><PermissionIcon
                                        permissionState={computedPermissionState}
                                    /></div>
                                    <Text variant="text-md/normal">{getPermissionString(permissionName)}</Text>

                                    <Tooltip text={getPermissionDescription(permissionName) || "No Description"}>{props =>
                                        <InfoIcon {...props} />
                                    }</Tooltip>
                                </div>);
                            })}
                        </ScrollerThin>
                    </div>
                )}
            </ModalContent>
        </ModalRoot >
    );
}

function RoleContextMenu({ guild, roleId, onClose }: { guild: Guild; roleId: string; onClose: () => void; }) {
    return (
        <Menu.Menu
            navId={cl("role-context-menu")}
            onClose={ContextMenu.close}
            aria-label="Role Options"
        >
            <Menu.MenuItem
                id="vc-pw-view-as-role"
                label="View As Role"
                action={() => {
                    const role = guild.roles[roleId];
                    if (!role) return;

                    onClose();

                    FluxDispatcher.dispatch({
                        type: "IMPERSONATE_UPDATE",
                        guildId: guild.id,
                        data: {
                            type: "ROLES",
                            roles: {
                                [roleId]: role
                            }
                        }
                    });
                }}
            />
        </Menu.Menu>
    );
}

const RolesAndUsersPermissions = ErrorBoundary.wrap(RolesAndUsersPermissionsComponent);

export default openRolesAndUsersPermissionsModal;
