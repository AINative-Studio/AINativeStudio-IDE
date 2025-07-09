/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../base/common/codicons.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import * as platform from '../../registry/common/platform.js';
import { ColorScheme, ThemeTypeSelector } from './theme.js';
export const IThemeService = createDecorator('themeService');
export function themeColorFromId(id) {
    return { id };
}
export const FileThemeIcon = Codicon.file;
export const FolderThemeIcon = Codicon.folder;
export function getThemeTypeSelector(type) {
    switch (type) {
        case ColorScheme.DARK: return ThemeTypeSelector.VS_DARK;
        case ColorScheme.HIGH_CONTRAST_DARK: return ThemeTypeSelector.HC_BLACK;
        case ColorScheme.HIGH_CONTRAST_LIGHT: return ThemeTypeSelector.HC_LIGHT;
        default: return ThemeTypeSelector.VS;
    }
}
// static theming participant
export const Extensions = {
    ThemingContribution: 'base.contributions.theming'
};
class ThemingRegistry {
    constructor() {
        this.themingParticipants = [];
        this.themingParticipants = [];
        this.onThemingParticipantAddedEmitter = new Emitter();
    }
    onColorThemeChange(participant) {
        this.themingParticipants.push(participant);
        this.onThemingParticipantAddedEmitter.fire(participant);
        return toDisposable(() => {
            const idx = this.themingParticipants.indexOf(participant);
            this.themingParticipants.splice(idx, 1);
        });
    }
    get onThemingParticipantAdded() {
        return this.onThemingParticipantAddedEmitter.event;
    }
    getThemingParticipants() {
        return this.themingParticipants;
    }
}
const themingRegistry = new ThemingRegistry();
platform.Registry.add(Extensions.ThemingContribution, themingRegistry);
export function registerThemingParticipant(participant) {
    return themingRegistry.onColorThemeChange(participant);
}
/**
 * Utility base class for all themable components.
 */
export class Themable extends Disposable {
    constructor(themeService) {
        super();
        this.themeService = themeService;
        this.theme = themeService.getColorTheme();
        // Hook up to theme changes
        this._register(this.themeService.onDidColorThemeChange(theme => this.onThemeChange(theme)));
    }
    onThemeChange(theme) {
        this.theme = theme;
        this.updateStyles();
    }
    updateStyles() {
        // Subclasses to override
    }
    getColor(id, modify) {
        let color = this.theme.getColor(id);
        if (color && modify) {
            color = modify(color, this.theme);
        }
        return color ? color.toString() : null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RoZW1lL2NvbW1vbi90aGVtZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTNELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEtBQUssUUFBUSxNQUFNLG1DQUFtQyxDQUFDO0FBRzlELE9BQU8sRUFBRSxXQUFXLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFNUQsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLGVBQWUsQ0FBZ0IsY0FBYyxDQUFDLENBQUM7QUFFNUUsTUFBTSxVQUFVLGdCQUFnQixDQUFDLEVBQW1CO0lBQ25ELE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQztBQUNmLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztBQUMxQyxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztBQUU5QyxNQUFNLFVBQVUsb0JBQW9CLENBQUMsSUFBaUI7SUFDckQsUUFBUSxJQUFJLEVBQUUsQ0FBQztRQUNkLEtBQUssV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8saUJBQWlCLENBQUMsT0FBTyxDQUFDO1FBQ3hELEtBQUssV0FBVyxDQUFDLGtCQUFrQixDQUFDLENBQUMsT0FBTyxpQkFBaUIsQ0FBQyxRQUFRLENB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