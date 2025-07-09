/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import assert from 'assert';
import * as path from '../../../../../base/common/path.js';
import { Promises } from '../../../../../base/node/pfs.js';
import { FileAccess } from '../../../../../base/common/network.js';
function toIResolvedKeybinding(kb) {
    return {
        label: kb.getLabel(),
        ariaLabel: kb.getAriaLabel(),
        electronAccelerator: kb.getElectronAccelerator(),
        userSettingsLabel: kb.getUserSettingsLabel(),
        isWYSIWYG: kb.isWYSIWYG(),
        isMultiChord: kb.hasMultipleChords(),
        dispatchParts: kb.getDispatchChords(),
        singleModifierDispatchParts: kb.getSingleModifierDispatchChords()
    };
}
export function assertResolveKeyboardEvent(mapper, keyboardEvent, expected) {
    const actual = toIResolvedKeybinding(mapper.resolveKeyboardEvent(keyboardEvent));
    assert.deepStrictEqual(actual, expected);
}
export function assertResolveKeybinding(mapper, keybinding, expected) {
    const actual = mapper.resolveKeybinding(keybinding).map(toIResolvedKeybinding);
    assert.deepStrictEqual(actual, expected);
}
export function readRawMapping(file) {
    return fs.promises.readFile(FileAccess.asFileUri(`vs/workbench/services/keybinding/test/node/${file}.js`).fsPath).then((buff) => {
        const contents = buff.toString();
        const func = new Function('define', contents); // CodeQL [SM01632] This is used in tests and we read the files as JS to avoid slowing down TS compilation
        let rawMappings = null;
        func(function (value) {
            rawMappings = value;
        });
        return rawMappings;
    });
}
export function assertMapping(writeFileIfDifferent, mapper, file) {
    const filePath = path.normalize(FileAccess.asFileUri(`vs/workbench/services/keybinding/test/node/${file}`).fsPath);
    return fs.promises.readFile(filePath).then((buff) => {
        const expected = buff.toString().replace(/\r\n/g, '\n');
        const actual = mapper.dumpDebugInfo().replace(/\r\n/g, '\n');
        if (actual !== expected && writeFileIfDifferent) {
            const destPath = filePath.replace(/[\/\\]out[\/\\]vs[\/\\]workbench/, '/src/vs/workbench');
            Promises.writeFile(destPath, actual);
        }
        assert.deepStrictEqual(actual, expected);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRNYXBwZXJUZXN0VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2tleWJpbmRpbmcvdGVzdC9ub2RlL2tleWJvYXJkTWFwcGVyVGVzdFV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssSUFBSSxNQUFNLG9DQUFvQyxDQUFDO0FBRTNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUczRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFhbkUsU0FBUyxxQkFBcUIsQ0FBQyxFQUFzQjtJQUNwRCxPQUFPO1FBQ04sS0FBSyxFQUFFLEVBQUUsQ0FBQyxRQUFRLEVBQUU7UUFDcEIsU0FBUyxFQUFFLEVBQUUsQ0FBQyxZQUFZLEVBQUU7UUFDNUIsbUJBQW1CLEVBQUUsRUFBRSxDQUFDLHNCQUFzQixFQUFFO1FBQ2hELGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRTtRQUM1QyxTQUFTLEVBQUUsRUFBRSxDQUFDLFNBQVMsRUFBRTtRQUN6QixZQUFZLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixFQUFFO1FBQ3BDLGFBQWEsRUFBRSxFQUFFLENBQUMsaUJBQWlCLEVBQUU7UUFDckMsMkJBQTJCLEVBQUUsRUFBRSxDQUFDLCtCQUErQixFQUFFO0tBQ2pFLENBQUM7QUFDSCxDQUFDO0FBRUQsTUFBTSxVQUFVLDBCQUEwQixDQUFDLE1BQXVCLEVBQUUsYUFBNkIsRUFBRSxRQUE2QjtJQUMvSCxNQUFNLE1BQU0sR0FBRyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUNqRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztBQUMxQyxDQUFDO0FBRUQsTUFBTSxVQUFVLHVCQUF1QixDQUFDLE1BQXVCLEVBQUUsVUFBc0IsRUFBRSxRQUErQjtJQUN2SCxNQUFNLE1BQU0sR0FBMEIsTUFBTSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQ3RHLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQzFDLENBQUM7QUFFRCxNQUFNLFVBQVUsY0FBYyxDQUFJLElBQVk7SUFDN0MsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLDhDQUE4QyxJQUFJLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1FBQy9ILE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNqQyxNQUFNLElBQUksR0FBRyxJQUFJLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQSwwR0FBMEc7UUFDeEosSUFBSSxXQUFXLEdBQWEsSUFBSSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxVQUFVLEtBQVE7WUFDdEIsV0FBVyxHQUFHLEtBQUssQ0FBQztRQUNyQixDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sV0FBWSxDQUFDO0lBQ3JCLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELE1BQU0sVUFBVSxhQUFhLENBQUMsb0JBQTZCLEVBQUUsTUFBdUIsRUFBRSxJQUFZO0lBQ2pHLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyw4Q0FBOEMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUVuSCxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ25ELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hELE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzdELElBQUksTUFBTSxLQUFLLFFBQVEsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO1lBQ2pELE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsa0NBQWtDLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztZQUMzRixRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN0QyxDQUFDO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDMUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDIn0=