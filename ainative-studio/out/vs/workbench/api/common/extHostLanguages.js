/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MainContext } from './extHost.protocol.js';
import * as typeConvert from './extHostTypeConverters.js';
import { StandardTokenType, Range, LanguageStatusSeverity } from './extHostTypes.js';
import Severity from '../../../base/common/severity.js';
import { disposableTimeout } from '../../../base/common/async.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
export class ExtHostLanguages {
    constructor(mainContext, _documents, _commands, _uriTransformer) {
        this._documents = _documents;
        this._commands = _commands;
        this._uriTransformer = _uriTransformer;
        this._languageIds = [];
        this._handlePool = 0;
        this._ids = new Set();
        this._proxy = mainContext.getProxy(MainContext.MainThreadLanguages);
    }
    $acceptLanguageIds(ids) {
        this._languageIds = ids;
    }
    async getLanguages() {
        return this._languageIds.slice(0);
    }
    async changeLanguage(uri, languageId) {
        await this._proxy.$changeLanguage(uri, languageId);
        const data = this._documents.getDocumentData(uri);
        if (!data) {
            throw new Error(`document '${uri.toString()}' NOT found`);
        }
        return data.document;
    }
    async tokenAtPosition(document, position) {
        const versionNow = document.version;
        const pos = typeConvert.Position.from(position);
        const info = await this._proxy.$tokensAtPosition(document.uri, pos);
        const defaultRange = {
            type: StandardTokenType.Other,
            range: document.getWordRangeAtPosition(position) ?? new Range(position.line, position.character, position.line, position.character)
        };
        if (!info) {
            // no result
            return defaultRange;
        }
        const result = {
            range: typeConvert.Range.to(info.range),
            type: typeConvert.TokenType.to(info.type)
        };
        if (!result.range.contains(position)) {
            // bogous result
            return defaultRange;
        }
        if (versionNow !== document.version) {
            // concurrent change
            return defaultRange;
        }
        return result;
    }
    createLanguageStatusItem(extension, id, selector) {
        const handle = this._handlePool++;
        const proxy = this._proxy;
        const ids = this._ids;
        // enforce extension unique identifier
        const fullyQualifiedId = `${extension.identifier.value}/${id}`;
        if (ids.has(fullyQualifiedId)) {
            throw new Error(`LanguageStatusItem with id '${id}' ALREADY exists`);
        }
        ids.add(fullyQualifiedId);
        const data = {
            selector,
            id,
            name: extension.displayName ?? extension.name,
            severity: LanguageStatusSeverity.Information,
            command: undefined,
            text: '',
            detail: '',
            busy: false
        };
        let soonHandle;
        const commandDisposables = new DisposableStore();
        const updateAsync = () => {
            soonHandle?.dispose();
            if (!ids.has(fullyQualifiedId)) {
                console.warn(`LanguageStatusItem (${id}) from ${extension.identifier.value} has been disposed and CANNOT be updated anymore`);
                return; // disposed in the meantime
            }
            soonHandle = disposableTimeout(() => {
                commandDisposables.clear();
                this._proxy.$setLanguageStatus(handle, {
                    id: fullyQualifiedId,
                    name: data.name ?? extension.displayName ?? extension.name,
                    source: extension.displayName ?? extension.name,
                    selector: typeConvert.DocumentSelector.from(data.selector, this._uriTransformer),
                    label: data.text,
                    detail: data.detail ?? '',
                    severity: data.severity === LanguageStatusSeverity.Error ? Severity.Error : data.severity === LanguageStatusSeverity.Warning ? Severity.Warning : Severity.Info,
                    command: data.command && this._commands.toInternal(data.command, commandDisposables),
                    accessibilityInfo: data.accessibilityInformation,
                    busy: data.busy
                });
            }, 0);
        };
        const result = {
            dispose() {
                commandDisposables.dispose();
                soonHandle?.dispose();
                proxy.$removeLanguageStatus(handle);
                ids.delete(fullyQualifiedId);
            },
            get id() {
                return data.id;
            },
            get name() {
                return data.name;
            },
            set name(value) {
                data.name = value;
                updateAsync();
            },
            get selector() {
                return data.selector;
            },
            set selector(value) {
                data.selector = value;
                updateAsync();
            },
            get text() {
                return data.text;
            },
            set text(value) {
                data.text = value;
                updateAsync();
            },
            set text2(value) {
                checkProposedApiEnabled(extension, 'languageStatusText');
                data.text = value;
                updateAsync();
            },
            get text2() {
                checkProposedApiEnabled(extension, 'languageStatusText');
                return data.text;
            },
            get detail() {
                return data.detail;
            },
            set detail(value) {
                data.detail = value;
                updateAsync();
            },
            get severity() {
                return data.severity;
            },
            set severity(value) {
                data.severity = value;
                updateAsync();
            },
            get accessibilityInformation() {
                return data.accessibilityInformation;
            },
            set accessibilityInformation(value) {
                data.accessibilityInformation = value;
                updateAsync();
            },
            get command() {
                return data.command;
            },
            set command(value) {
                data.command = value;
                updateAsync();
            },
            get busy() {
                return data.busy;
            },
            set busy(value) {
                data.busy = value;
                updateAsync();
            }
        };
        updateAsync();
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExhbmd1YWdlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0TGFuZ3VhZ2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQWlFLE1BQU0sdUJBQXVCLENBQUM7QUFHbkgsT0FBTyxLQUFLLFdBQVcsTUFBTSw0QkFBNEIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFZLHNCQUFzQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDL0YsT0FBTyxRQUFRLE1BQU0sa0NBQWtDLENBQUM7QUFDeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBSWpGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRXpGLE1BQU0sT0FBTyxnQkFBZ0I7SUFNNUIsWUFDQyxXQUF5QixFQUNSLFVBQTRCLEVBQzVCLFNBQTRCLEVBQzVCLGVBQTRDO1FBRjVDLGVBQVUsR0FBVixVQUFVLENBQWtCO1FBQzVCLGNBQVMsR0FBVCxTQUFTLENBQW1CO1FBQzVCLG9CQUFlLEdBQWYsZUFBZSxDQUE2QjtRQU50RCxpQkFBWSxHQUFhLEVBQUUsQ0FBQztRQXVENUIsZ0JBQVcsR0FBVyxDQUFDLENBQUM7UUFDeEIsU0FBSSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFoRGhDLElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBRUQsa0JBQWtCLENBQUMsR0FBYTtRQUMvQixJQUFJLENBQUMsWUFBWSxHQUFHLEdBQUcsQ0FBQztJQUN6QixDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVk7UUFDakIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxHQUFlLEVBQUUsVUFBa0I7UUFDdkQsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDbkQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQyxhQUFhLEdBQUcsQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDM0QsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN0QixDQUFDO0lBRUQsS0FBSyxDQUFDLGVBQWUsQ0FBQyxRQUE2QixFQUFFLFFBQXlCO1FBQzdFLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7UUFDcEMsTUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDaEQsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDcEUsTUFBTSxZQUFZLEdBQUc7WUFDcEIsSUFBSSxFQUFFLGlCQUFpQixDQUFDLEtBQUs7WUFDN0IsS0FBSyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDO1NBQ25JLENBQUM7UUFDRixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxZQUFZO1lBQ1osT0FBTyxZQUFZLENBQUM7UUFDckIsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHO1lBQ2QsS0FBSyxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7WUFDdkMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7U0FDekMsQ0FBQztRQUNGLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBVyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ2hELGdCQUFnQjtZQUNoQixPQUFPLFlBQVksQ0FBQztRQUNyQixDQUFDO1FBQ0QsSUFBSSxVQUFVLEtBQUssUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3JDLG9CQUFvQjtZQUNwQixPQUFPLFlBQVksQ0FBQztRQUNyQixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBS0Qsd0JBQXdCLENBQUMsU0FBZ0MsRUFBRSxFQUFVLEVBQUUsUUFBaUM7UUFFdkcsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2xDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDMUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUV0QixzQ0FBc0M7UUFDdEMsTUFBTSxnQkFBZ0IsR0FBRyxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxJQUFJLEVBQUUsRUFBRSxDQUFDO1FBQy9ELElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7WUFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFDRCxHQUFHLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFMUIsTUFBTSxJQUFJLEdBQXlEO1lBQ2xFLFFBQVE7WUFDUixFQUFFO1lBQ0YsSUFBSSxFQUFFLFNBQVMsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLElBQUk7WUFDN0MsUUFBUSxFQUFFLHNCQUFzQixDQUFDLFdBQVc7WUFDNUMsT0FBTyxFQUFFLFNBQVM7WUFDbEIsSUFBSSxFQUFFLEVBQUU7WUFDUixNQUFNLEVBQUUsRUFBRTtZQUNWLElBQUksRUFBRSxLQUFLO1NBQ1gsQ0FBQztRQUdGLElBQUksVUFBbUMsQ0FBQztRQUN4QyxNQUFNLGtCQUFrQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDakQsTUFBTSxXQUFXLEdBQUcsR0FBRyxFQUFFO1lBQ3hCLFVBQVUsRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUV0QixJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hDLE9BQU8sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsVUFBVSxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssa0RBQWtELENBQUMsQ0FBQztnQkFDOUgsT0FBTyxDQUFDLDJCQUEyQjtZQUNwQyxDQUFDO1lBRUQsVUFBVSxHQUFHLGlCQUFpQixDQUFDLEdBQUcsRUFBRTtnQkFDbkMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQzNCLElBQUksQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFO29CQUN0QyxFQUFFLEVBQUUsZ0JBQWdCO29CQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxTQUFTLENBQUMsV0FBVyxJQUFJLFNBQVMsQ0FBQyxJQUFJO29CQUMxRCxNQUFNLEVBQUUsU0FBUyxDQUFDLFdBQVcsSUFBSSxTQUFTLENBQUMsSUFBSTtvQkFDL0MsUUFBUSxFQUFFLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDO29CQUNoRixLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUk7b0JBQ2hCLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxJQUFJLEVBQUU7b0JBQ3pCLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxLQUFLLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FBSyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJO29CQUMvSixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGtCQUFrQixDQUFDO29CQUNwRixpQkFBaUIsRUFBRSxJQUFJLENBQUMsd0JBQXdCO29CQUNoRCxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7aUJBQ2YsQ0FBQyxDQUFDO1lBQ0osQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDO1FBRUYsTUFBTSxNQUFNLEdBQThCO1lBQ3pDLE9BQU87Z0JBQ04sa0JBQWtCLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzdCLFVBQVUsRUFBRSxPQUFPLEVBQUUsQ0FBQztnQkFDdEIsS0FBSyxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNwQyxHQUFHLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDOUIsQ0FBQztZQUNELElBQUksRUFBRTtnQkFDTCxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDaEIsQ0FBQztZQUNELElBQUksSUFBSTtnQkFDUCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDbEIsQ0FBQztZQUNELElBQUksSUFBSSxDQUFDLEtBQUs7Z0JBQ2IsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7Z0JBQ2xCLFdBQVcsRUFBRSxDQUFDO1lBQ2YsQ0FBQztZQUNELElBQUksUUFBUTtnQkFDWCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDdEIsQ0FBQztZQUNELElBQUksUUFBUSxDQUFDLEtBQUs7Z0JBQ2pCLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO2dCQUN0QixXQUFXLEVBQUUsQ0FBQztZQUNmLENBQUM7WUFDRCxJQUFJLElBQUk7Z0JBQ1AsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ2xCLENBQUM7WUFDRCxJQUFJLElBQUksQ0FBQyxLQUFLO2dCQUNiLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO2dCQUNsQixXQUFXLEVBQUUsQ0FBQztZQUNmLENBQUM7WUFDRCxJQUFJLEtBQUssQ0FBQyxLQUFLO2dCQUNkLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO2dCQUN6RCxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztnQkFDbEIsV0FBVyxFQUFFLENBQUM7WUFDZixDQUFDO1lBQ0QsSUFBSSxLQUFLO2dCQUNSLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO2dCQUN6RCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDbEIsQ0FBQztZQUNELElBQUksTUFBTTtnQkFDVCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDcEIsQ0FBQztZQUNELElBQUksTUFBTSxDQUFDLEtBQUs7Z0JBQ2YsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7Z0JBQ3BCLFdBQVcsRUFBRSxDQUFDO1lBQ2YsQ0FBQztZQUNELElBQUksUUFBUTtnQkFDWCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDdEIsQ0FBQztZQUNELElBQUksUUFBUSxDQUFDLEtBQUs7Z0JBQ2pCLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO2dCQUN0QixXQUFXLEVBQUUsQ0FBQztZQUNmLENBQUM7WUFDRCxJQUFJLHdCQUF3QjtnQkFDM0IsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUM7WUFDdEMsQ0FBQztZQUNELElBQUksd0JBQXdCLENBQUMsS0FBSztnQkFDakMsSUFBSSxDQUFDLHdCQUF3QixHQUFHLEtBQUssQ0FBQztnQkFDdEMsV0FBVyxFQUFFLENBQUM7WUFDZixDQUFDO1lBQ0QsSUFBSSxPQUFPO2dCQUNWLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUNyQixDQUFDO1lBQ0QsSUFBSSxPQUFPLENBQUMsS0FBSztnQkFDaEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7Z0JBQ3JCLFdBQVcsRUFBRSxDQUFDO1lBQ2YsQ0FBQztZQUNELElBQUksSUFBSTtnQkFDUCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDbEIsQ0FBQztZQUNELElBQUksSUFBSSxDQUFDLEtBQWM7Z0JBQ3RCLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO2dCQUNsQixXQUFXLEVBQUUsQ0FBQztZQUNmLENBQUM7U0FDRCxDQUFDO1FBQ0YsV0FBVyxFQUFFLENBQUM7UUFDZCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7Q0FDRCJ9