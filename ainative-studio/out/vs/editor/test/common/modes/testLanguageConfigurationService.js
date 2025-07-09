/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { LanguageConfigurationRegistry, LanguageConfigurationServiceChangeEvent, ResolvedLanguageConfiguration } from '../../../common/languages/languageConfigurationRegistry.js';
export class TestLanguageConfigurationService extends Disposable {
    constructor() {
        super();
        this._registry = this._register(new LanguageConfigurationRegistry());
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._register(this._registry.onDidChange((e) => this._onDidChange.fire(new LanguageConfigurationServiceChangeEvent(e.languageId))));
    }
    register(languageId, configuration, priority) {
        return this._registry.register(languageId, configuration, priority);
    }
    getLanguageConfiguration(languageId) {
        return this._registry.getLanguageConfiguration(languageId) ??
            new ResolvedLanguageConfiguration('unknown', {});
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdExhbmd1YWdlQ29uZmlndXJhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVzL3Rlc3RMYW5ndWFnZUNvbmZpZ3VyYXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFFL0UsT0FBTyxFQUFpQyw2QkFBNkIsRUFBRSx1Q0FBdUMsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRWxOLE1BQU0sT0FBTyxnQ0FBaUMsU0FBUSxVQUFVO0lBUS9EO1FBQ0MsS0FBSyxFQUFFLENBQUM7UUFOUSxjQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLDZCQUE2QixFQUFFLENBQUMsQ0FBQztRQUVoRSxpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQTJDLENBQUMsQ0FBQztRQUN2RixnQkFBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO1FBSXJELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksdUNBQXVDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RJLENBQUM7SUFFRCxRQUFRLENBQUMsVUFBa0IsRUFBRSxhQUFvQyxFQUFFLFFBQWlCO1FBQ25GLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLGFBQWEsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBRUQsd0JBQXdCLENBQUMsVUFBa0I7UUFDMUMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQztZQUN6RCxJQUFJLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNuRCxDQUFDO0NBQ0QifQ==