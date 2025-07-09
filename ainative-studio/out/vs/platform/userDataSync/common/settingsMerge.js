/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { distinct } from '../../../base/common/arrays.js';
import { parse, visit } from '../../../base/common/json.js';
import { applyEdits, setProperty, withFormatting } from '../../../base/common/jsonEdit.js';
import { getEOL } from '../../../base/common/jsonFormatter.js';
import * as objects from '../../../base/common/objects.js';
import * as contentUtil from './content.js';
import { getDisallowedIgnoredSettings } from './userDataSync.js';
export function getIgnoredSettings(defaultIgnoredSettings, configurationService, settingsContent) {
    let value = [];
    if (settingsContent) {
        value = getIgnoredSettingsFromContent(settingsContent);
    }
    else {
        value = getIgnoredSettingsFromConfig(configurationService);
    }
    const added = [], removed = [...getDisallowedIgnoredSettings()];
    if (Array.isArray(value)) {
        for (const key of value) {
            if (key.startsWith('-')) {
                removed.push(key.substring(1));
            }
            else {
                added.push(key);
            }
        }
    }
    return distinct([...defaultIgnoredSettings, ...added,].filter(setting => !removed.includes(setting)));
}
function getIgnoredSettingsFromConfig(configurationService) {
    let userValue = configurationService.inspect('settingsSync.ignoredSettings').userValue;
    if (userValue !== undefined) {
        return userValue;
    }
    userValue = configurationService.inspect('sync.ignoredSettings').userValue;
    if (userValue !== undefined) {
        return userValue;
    }
    return configurationService.getValue('settingsSync.ignoredSettings') || [];
}
function getIgnoredSettingsFromContent(settingsContent) {
    const parsed = parse(settingsContent);
    return parsed ? parsed['settingsSync.ignoredSettings'] || parsed['sync.ignoredSettings'] || [] : [];
}
export function removeComments(content, formattingOptions) {
    const source = parse(content) || {};
    let result = '{}';
    for (const key of Object.keys(source)) {
        const edits = setProperty(result, [key], source[key], formattingOptions);
        result = applyEdits(result, edits);
    }
    return result;
}
export function updateIgnoredSettings(targetContent, sourceContent, ignoredSettings, formattingOptions) {
    if (ignoredSettings.length) {
        const sourceTree = parseSettings(sourceContent);
        const source = parse(sourceContent) || {};
        const target = parse(targetContent);
        if (!target) {
            return targetContent;
        }
        const settingsToAdd = [];
        for (const key of ignoredSettings) {
            const sourceValue = source[key];
            const targetValue = target[key];
            // Remove in target
            if (sourceValue === undefined) {
                targetContent = contentUtil.edit(targetContent, [key], undefined, formattingOptions);
            }
            // Update in target
            else if (targetValue !== undefined) {
                targetContent = contentUtil.edit(targetContent, [key], sourceValue, formattingOptions);
            }
            else {
                settingsToAdd.push(findSettingNode(key, sourceTree));
            }
        }
        settingsToAdd.sort((a, b) => a.startOffset - b.startOffset);
        settingsToAdd.forEach(s => targetContent = addSetting(s.setting.key, sourceContent, targetContent, formattingOptions));
    }
    return targetContent;
}
export function merge(originalLocalContent, originalRemoteContent, baseContent, ignoredSettings, resolvedConflicts, formattingOptions) {
    const localContentWithoutIgnoredSettings = updateIgnoredSettings(originalLocalContent, originalRemoteContent, ignoredSettings, formattingOptions);
    const localForwarded = baseContent !== localContentWithoutIgnoredSettings;
    const remoteForwarded = baseContent !== originalRemoteContent;
    /* no changes */
    if (!localForwarded && !remoteForwarded) {
        return { conflictsSettings: [], localContent: null, remoteContent: null, hasConflicts: false };
    }
    /* local has changed and remote has not */
    if (localForwarded && !remoteForwarded) {
        return { conflictsSettings: [], localContent: null, remoteContent: localContentWithoutIgnoredSettings, hasConflicts: false };
    }
    /* remote has changed and local has not */
    if (remoteForwarded && !localForwarded) {
        return { conflictsSettings: [], localContent: updateIgnoredSettings(originalRemoteContent, originalLocalContent, ignoredSettings, formattingOptions), remoteContent: null, hasConflicts: false };
    }
    /* local is empty and not synced before */
    if (baseContent === null && isEmpty(originalLocalContent)) {
        const localContent = areSame(originalLocalContent, originalRemoteContent, ignoredSettings) ? null : updateIgnoredSettings(originalRemoteContent, originalLocalContent, ignoredSettings, formattingOptions);
        return { conflictsSettings: [], localContent, remoteContent: null, hasConflicts: false };
    }
    /* remote and local has changed */
    let localContent = originalLocalContent;
    let remoteContent = originalRemoteContent;
    const local = parse(originalLocalContent);
    const remote = parse(originalRemoteContent);
    const base = baseContent ? parse(baseContent) : null;
    const ignored = ignoredSettings.reduce((set, key) => { set.add(key); return set; }, new Set());
    const localToRemote = compare(local, remote, ignored);
    const baseToLocal = compare(base, local, ignored);
    const baseToRemote = compare(base, remote, ignored);
    const conflicts = new Map();
    const handledConflicts = new Set();
    const handleConflict = (conflictKey) => {
        handledConflicts.add(conflictKey);
        const resolvedConflict = resolvedConflicts.filter(({ key }) => key === conflictKey)[0];
        if (resolvedConflict) {
            localContent = contentUtil.edit(localContent, [conflictKey], resolvedConflict.value, formattingOptions);
            remoteContent = contentUtil.edit(remoteContent, [conflictKey], resolvedConflict.value, formattingOptions);
        }
        else {
            conflicts.set(conflictKey, { key: conflictKey, localValue: local[conflictKey], remoteValue: remote[conflictKey] });
        }
    };
    // Removed settings in Local
    for (const key of baseToLocal.removed.values()) {
        // Conflict - Got updated in remote.
        if (baseToRemote.updated.has(key)) {
            handleConflict(key);
        }
        // Also remove in remote
        else {
            remoteContent = contentUtil.edit(remoteContent, [key], undefined, formattingOptions);
        }
    }
    // Removed settings in Remote
    for (const key of baseToRemote.removed.values()) {
        if (handledConflicts.has(key)) {
            continue;
        }
        // Conflict - Got updated in local
        if (baseToLocal.updated.has(key)) {
            handleConflict(key);
        }
        // Also remove in locals
        else {
            localContent = contentUtil.edit(localContent, [key], undefined, formattingOptions);
        }
    }
    // Updated settings in Local
    for (const key of baseToLocal.updated.values()) {
        if (handledConflicts.has(key)) {
            continue;
        }
        // Got updated in remote
        if (baseToRemote.updated.has(key)) {
            // Has different value
            if (localToRemote.updated.has(key)) {
                handleConflict(key);
            }
        }
        else {
            remoteContent = contentUtil.edit(remoteContent, [key], local[key], formattingOptions);
        }
    }
    // Updated settings in Remote
    for (const key of baseToRemote.updated.values()) {
        if (handledConflicts.has(key)) {
            continue;
        }
        // Got updated in local
        if (baseToLocal.updated.has(key)) {
            // Has different value
            if (localToRemote.updated.has(key)) {
                handleConflict(key);
            }
        }
        else {
            localContent = contentUtil.edit(localContent, [key], remote[key], formattingOptions);
        }
    }
    // Added settings in Local
    for (const key of baseToLocal.added.values()) {
        if (handledConflicts.has(key)) {
            continue;
        }
        // Got added in remote
        if (baseToRemote.added.has(key)) {
            // Has different value
            if (localToRemote.updated.has(key)) {
                handleConflict(key);
            }
        }
        else {
            remoteContent = addSetting(key, localContent, remoteContent, formattingOptions);
        }
    }
    // Added settings in remote
    for (const key of baseToRemote.added.values()) {
        if (handledConflicts.has(key)) {
            continue;
        }
        // Got added in local
        if (baseToLocal.added.has(key)) {
            // Has different value
            if (localToRemote.updated.has(key)) {
                handleConflict(key);
            }
        }
        else {
            localContent = addSetting(key, remoteContent, localContent, formattingOptions);
        }
    }
    const hasConflicts = conflicts.size > 0 || !areSame(localContent, remoteContent, ignoredSettings);
    const hasLocalChanged = hasConflicts || !areSame(localContent, originalLocalContent, []);
    const hasRemoteChanged = hasConflicts || !areSame(remoteContent, originalRemoteContent, []);
    return { localContent: hasLocalChanged ? localContent : null, remoteContent: hasRemoteChanged ? remoteContent : null, conflictsSettings: [...conflicts.values()], hasConflicts };
}
function areSame(localContent, remoteContent, ignoredSettings) {
    if (localContent === remoteContent) {
        return true;
    }
    const local = parse(localContent);
    const remote = parse(remoteContent);
    const ignored = ignoredSettings.reduce((set, key) => { set.add(key); return set; }, new Set());
    const localTree = parseSettings(localContent).filter(node => !(node.setting && ignored.has(node.setting.key)));
    const remoteTree = parseSettings(remoteContent).filter(node => !(node.setting && ignored.has(node.setting.key)));
    if (localTree.length !== remoteTree.length) {
        return false;
    }
    for (let index = 0; index < localTree.length; index++) {
        const localNode = localTree[index];
        const remoteNode = remoteTree[index];
        if (localNode.setting && remoteNode.setting) {
            if (localNode.setting.key !== remoteNode.setting.key) {
                return false;
            }
            if (!objects.equals(local[localNode.setting.key], remote[localNode.setting.key])) {
                return false;
            }
        }
        else if (!localNode.setting && !remoteNode.setting) {
            if (localNode.value !== remoteNode.value) {
                return false;
            }
        }
        else {
            return false;
        }
    }
    return true;
}
export function isEmpty(content) {
    if (content) {
        const nodes = parseSettings(content);
        return nodes.length === 0;
    }
    return true;
}
function compare(from, to, ignored) {
    const fromKeys = from ? Object.keys(from).filter(key => !ignored.has(key)) : [];
    const toKeys = Object.keys(to).filter(key => !ignored.has(key));
    const added = toKeys.filter(key => !fromKeys.includes(key)).reduce((r, key) => { r.add(key); return r; }, new Set());
    const removed = fromKeys.filter(key => !toKeys.includes(key)).reduce((r, key) => { r.add(key); return r; }, new Set());
    const updated = new Set();
    if (from) {
        for (const key of fromKeys) {
            if (removed.has(key)) {
                continue;
            }
            const value1 = from[key];
            const value2 = to[key];
            if (!objects.equals(value1, value2)) {
                updated.add(key);
            }
        }
    }
    return { added, removed, updated };
}
export function addSetting(key, sourceContent, targetContent, formattingOptions) {
    const source = parse(sourceContent);
    const sourceTree = parseSettings(sourceContent);
    const targetTree = parseSettings(targetContent);
    const insertLocation = getInsertLocation(key, sourceTree, targetTree);
    return insertAtLocation(targetContent, key, source[key], insertLocation, targetTree, formattingOptions);
}
function getInsertLocation(key, sourceTree, targetTree) {
    const sourceNodeIndex = sourceTree.findIndex(node => node.setting?.key === key);
    const sourcePreviousNode = sourceTree[sourceNodeIndex - 1];
    if (sourcePreviousNode) {
        /*
            Previous node in source is a setting.
            Find the same setting in the target.
            Insert it after that setting
        */
        if (sourcePreviousNode.setting) {
            const targetPreviousSetting = findSettingNode(sourcePreviousNode.setting.key, targetTree);
            if (targetPreviousSetting) {
                /* Insert after target's previous setting */
                return { index: targetTree.indexOf(targetPreviousSetting), insertAfter: true };
            }
        }
        /* Previous node in source is a comment */
        else {
            const sourcePreviousSettingNode = findPreviousSettingNode(sourceNodeIndex, sourceTree);
            /*
                Source has a setting defined before the setting to be added.
                Find the same previous setting in the target.
                If found, insert before its next setting so that comments are retrieved.
                Otherwise, insert at the end.
            */
            if (sourcePreviousSettingNode) {
                const targetPreviousSetting = findSettingNode(sourcePreviousSettingNode.setting.key, targetTree);
                if (targetPreviousSetting) {
                    const targetNextSetting = findNextSettingNode(targetTree.indexOf(targetPreviousSetting), targetTree);
                    const sourceCommentNodes = findNodesBetween(sourceTree, sourcePreviousSettingNode, sourceTree[sourceNodeIndex]);
                    if (targetNextSetting) {
                        const targetCommentNodes = findNodesBetween(targetTree, targetPreviousSetting, targetNextSetting);
                        const targetCommentNode = findLastMatchingTargetCommentNode(sourceCommentNodes, targetCommentNodes);
                        if (targetCommentNode) {
                            return { index: targetTree.indexOf(targetCommentNode), insertAfter: true }; /* Insert after comment */
                        }
                        else {
                            return { index: targetTree.indexOf(targetNextSetting), insertAfter: false }; /* Insert before target next setting */
                        }
                    }
                    else {
                        const targetCommentNodes = findNodesBetween(targetTree, targetPreviousSetting, targetTree[targetTree.length - 1]);
                        const targetCommentNode = findLastMatchingTargetCommentNode(sourceCommentNodes, targetCommentNodes);
                        if (targetCommentNode) {
                            return { index: targetTree.indexOf(targetCommentNode), insertAfter: true }; /* Insert after comment */
                        }
                        else {
                            return { index: targetTree.length - 1, insertAfter: true }; /* Insert at the end */
                        }
                    }
                }
            }
        }
        const sourceNextNode = sourceTree[sourceNodeIndex + 1];
        if (sourceNextNode) {
            /*
                Next node in source is a setting.
                Find the same setting in the target.
                Insert it before that setting
            */
            if (sourceNextNode.setting) {
                const targetNextSetting = findSettingNode(sourceNextNode.setting.key, targetTree);
                if (targetNextSetting) {
                    /* Insert before target's next setting */
                    return { index: targetTree.indexOf(targetNextSetting), insertAfter: false };
                }
            }
            /* Next node in source is a comment */
            else {
                const sourceNextSettingNode = findNextSettingNode(sourceNodeIndex, sourceTree);
                /*
                    Source has a setting defined after the setting to be added.
                    Find the same next setting in the target.
                    If found, insert after its previous setting so that comments are retrieved.
                    Otherwise, insert at the beginning.
                */
                if (sourceNextSettingNode) {
                    const targetNextSetting = findSettingNode(sourceNextSettingNode.setting.key, targetTree);
                    if (targetNextSetting) {
                        const targetPreviousSetting = findPreviousSettingNode(targetTree.indexOf(targetNextSetting), targetTree);
                        const sourceCommentNodes = findNodesBetween(sourceTree, sourceTree[sourceNodeIndex], sourceNextSettingNode);
                        if (targetPreviousSetting) {
                            const targetCommentNodes = findNodesBetween(targetTree, targetPreviousSetting, targetNextSetting);
                            const targetCommentNode = findLastMatchingTargetCommentNode(sourceCommentNodes.reverse(), targetCommentNodes.reverse());
                            if (targetCommentNode) {
                                return { index: targetTree.indexOf(targetCommentNode), insertAfter: false }; /* Insert before comment */
                            }
                            else {
                                return { index: targetTree.indexOf(targetPreviousSetting), insertAfter: true }; /* Insert after target previous setting */
                            }
                        }
                        else {
                            const targetCommentNodes = findNodesBetween(targetTree, targetTree[0], targetNextSetting);
                            const targetCommentNode = findLastMatchingTargetCommentNode(sourceCommentNodes.reverse(), targetCommentNodes.reverse());
                            if (targetCommentNode) {
                                return { index: targetTree.indexOf(targetCommentNode), insertAfter: false }; /* Insert before comment */
                            }
                            else {
                                return { index: 0, insertAfter: false }; /* Insert at the beginning */
                            }
                        }
                    }
                }
            }
        }
    }
    /* Insert at the end */
    return { index: targetTree.length - 1, insertAfter: true };
}
function insertAtLocation(content, key, value, location, tree, formattingOptions) {
    let edits;
    /* Insert at the end */
    if (location.index === -1) {
        edits = setProperty(content, [key], value, formattingOptions);
    }
    else {
        edits = getEditToInsertAtLocation(content, key, value, location, tree, formattingOptions).map(edit => withFormatting(content, edit, formattingOptions)[0]);
    }
    return applyEdits(content, edits);
}
function getEditToInsertAtLocation(content, key, value, location, tree, formattingOptions) {
    const newProperty = `${JSON.stringify(key)}: ${JSON.stringify(value)}`;
    const eol = getEOL(formattingOptions, content);
    const node = tree[location.index];
    if (location.insertAfter) {
        const edits = [];
        /* Insert after a setting */
        if (node.setting) {
            edits.push({ offset: node.endOffset, length: 0, content: ',' + newProperty });
        }
        /* Insert after a comment */
        else {
            const nextSettingNode = findNextSettingNode(location.index, tree);
            const previousSettingNode = findPreviousSettingNode(location.index, tree);
            const previousSettingCommaOffset = previousSettingNode?.setting?.commaOffset;
            /* If there is a previous setting and it does not has comma then add it */
            if (previousSettingNode && previousSettingCommaOffset === undefined) {
                edits.push({ offset: previousSettingNode.endOffset, length: 0, content: ',' });
            }
            const isPreviouisSettingIncludesComment = previousSettingCommaOffset !== undefined && previousSettingCommaOffset > node.endOffset;
            edits.push({
                offset: isPreviouisSettingIncludesComment ? previousSettingCommaOffset + 1 : node.endOffset,
                length: 0,
                content: nextSettingNode ? eol + newProperty + ',' : eol + newProperty
            });
        }
        return edits;
    }
    else {
        /* Insert before a setting */
        if (node.setting) {
            return [{ offset: node.startOffset, length: 0, content: newProperty + ',' }];
        }
        /* Insert before a comment */
        const content = (tree[location.index - 1] && !tree[location.index - 1].setting /* previous node is comment */ ? eol : '')
            + newProperty
            + (findNextSettingNode(location.index, tree) ? ',' : '')
            + eol;
        return [{ offset: node.startOffset, length: 0, content }];
    }
}
function findSettingNode(key, tree) {
    return tree.filter(node => node.setting?.key === key)[0];
}
function findPreviousSettingNode(index, tree) {
    for (let i = index - 1; i >= 0; i--) {
        if (tree[i].setting) {
            return tree[i];
        }
    }
    return undefined;
}
function findNextSettingNode(index, tree) {
    for (let i = index + 1; i < tree.length; i++) {
        if (tree[i].setting) {
            return tree[i];
        }
    }
    return undefined;
}
function findNodesBetween(nodes, from, till) {
    const fromIndex = nodes.indexOf(from);
    const tillIndex = nodes.indexOf(till);
    return nodes.filter((node, index) => fromIndex < index && index < tillIndex);
}
function findLastMatchingTargetCommentNode(sourceComments, targetComments) {
    if (sourceComments.length && targetComments.length) {
        let index = 0;
        for (; index < targetComments.length && index < sourceComments.length; index++) {
            if (sourceComments[index].value !== targetComments[index].value) {
                return targetComments[index - 1];
            }
        }
        return targetComments[index - 1];
    }
    return undefined;
}
function parseSettings(content) {
    const nodes = [];
    let hierarchyLevel = -1;
    let startOffset;
    let key;
    const visitor = {
        onObjectBegin: (offset) => {
            hierarchyLevel++;
        },
        onObjectProperty: (name, offset, length) => {
            if (hierarchyLevel === 0) {
                // this is setting key
                startOffset = offset;
                key = name;
            }
        },
        onObjectEnd: (offset, length) => {
            hierarchyLevel--;
            if (hierarchyLevel === 0) {
                nodes.push({
                    startOffset,
                    endOffset: offset + length,
                    value: content.substring(startOffset, offset + length),
                    setting: {
                        key,
                        commaOffset: undefined
                    }
                });
            }
        },
        onArrayBegin: (offset, length) => {
            hierarchyLevel++;
        },
        onArrayEnd: (offset, length) => {
            hierarchyLevel--;
            if (hierarchyLevel === 0) {
                nodes.push({
                    startOffset,
                    endOffset: offset + length,
                    value: content.substring(startOffset, offset + length),
                    setting: {
                        key,
                        commaOffset: undefined
                    }
                });
            }
        },
        onLiteralValue: (value, offset, length) => {
            if (hierarchyLevel === 0) {
                nodes.push({
                    startOffset,
                    endOffset: offset + length,
                    value: content.substring(startOffset, offset + length),
                    setting: {
                        key,
                        commaOffset: undefined
                    }
                });
            }
        },
        onSeparator: (sep, offset, length) => {
            if (hierarchyLevel === 0) {
                if (sep === ',') {
                    let index = nodes.length - 1;
                    for (; index >= 0; index--) {
                        if (nodes[index].setting) {
                            break;
                        }
                    }
                    const node = nodes[index];
                    if (node) {
                        nodes.splice(index, 1, {
                            startOffset: node.startOffset,
                            endOffset: node.endOffset,
                            value: node.value,
                            setting: {
                                key: node.setting.key,
                                commaOffset: offset
                            }
                        });
                    }
                }
            }
        },
        onComment: (offset, length) => {
            if (hierarchyLevel === 0) {
                nodes.push({
                    startOffset: offset,
                    endOffset: offset + length,
                    value: content.substring(offset, offset + length),
                });
            }
        }
    };
    visit(content, visitor);
    return nodes;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NNZXJnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL3NldHRpbmdzTWVyZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRTFELE9BQU8sRUFBZSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDekUsT0FBTyxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0YsT0FBTyxFQUEyQixNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN4RixPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFDO0FBRTNELE9BQU8sS0FBSyxXQUFXLE1BQU0sY0FBYyxDQUFDO0FBQzVDLE9BQU8sRUFBRSw0QkFBNEIsRUFBb0IsTUFBTSxtQkFBbUIsQ0FBQztBQVNuRixNQUFNLFVBQVUsa0JBQWtCLENBQUMsc0JBQWdDLEVBQUUsb0JBQTJDLEVBQUUsZUFBd0I7SUFDekksSUFBSSxLQUFLLEdBQTBCLEVBQUUsQ0FBQztJQUN0QyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3JCLEtBQUssR0FBRyw2QkFBNkIsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUN4RCxDQUFDO1NBQU0sQ0FBQztRQUNQLEtBQUssR0FBRyw0QkFBNEIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFDRCxNQUFNLEtBQUssR0FBYSxFQUFFLEVBQUUsT0FBTyxHQUFhLENBQUMsR0FBRyw0QkFBNEIsRUFBRSxDQUFDLENBQUM7SUFDcEYsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7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QUFFRCxTQUFTLE9BQU8sQ0FBQyxJQUFtQyxFQUFFLEVBQTBCLEVBQUUsT0FBb0I7SUFDckcsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDaEYsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNoRSxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksR0FBRyxFQUFVLENBQUMsQ0FBQztJQUM3SCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksR0FBRyxFQUFVLENBQUMsQ0FBQztJQUMvSCxNQUFNLE9BQU8sR0FBZ0IsSUFBSSxHQUFHLEVBQVUsQ0FBQztJQUUvQyxJQUFJLElBQUks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