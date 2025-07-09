/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { $ } from '../../../../browser/dom.js';
import { unthemedMenuStyles } from '../../../../browser/ui/menu/menu.js';
import { MenuBar } from '../../../../browser/ui/menu/menubar.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../common/utils.js';
function getButtonElementByAriaLabel(menubarElement, ariaLabel) {
    let i;
    for (i = 0; i < menubarElement.childElementCount; i++) {
        if (menubarElement.children[i].getAttribute('aria-label') === ariaLabel) {
            return menubarElement.children[i];
        }
    }
    return null;
}
function getTitleDivFromButtonDiv(menuButtonElement) {
    let i;
    for (i = 0; i < menuButtonElement.childElementCount; i++) {
        if (menuButtonElement.children[i].classList.contains('menubar-menu-title')) {
            return menuButtonElement.children[i];
        }
    }
    return null;
}
function getMnemonicFromTitleDiv(menuTitleDiv) {
    let i;
    for (i = 0; i < menuTitleDiv.childElementCount; i++) {
        if (menuTitleDiv.children[i].tagName.toLocaleLowerCase() === 'mnemonic') {
            return menuTitleDiv.children[i].textContent;
        }
    }
    return null;
}
function validateMenuBarItem(menubar, menubarContainer, label, readableLabel, mnemonic) {
    menubar.push([
        {
            actions: [],
            label: label
        }
    ]);
    const buttonElement = getButtonElementByAriaLabel(menubarContainer, readableLabel);
    assert(buttonElement !== null, `Button element not found for ${readableLabel} button.`);
    const titleDiv = getTitleDivFromButtonDiv(buttonElement);
    assert(titleDiv !== null, `Title div not found for ${readableLabel} button.`);
    const mnem = getMnemonicFromTitleDiv(titleDiv);
    assert.strictEqual(mnem, mnemonic, 'Mnemonic not correct');
}
suite('Menubar', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const container = $('.container');
    const menubar = new MenuBar(container, {
        enableMnemonics: true,
        visibility: 'visible'
    }, unthemedMenuStyles);
    test('English File menu renders mnemonics', function () {
        validateMenuBarItem(menubar, container, '&File', 'File', 'F');
    });
    test('Russian File menu renders mnemonics', function () {
        validateMenuBarItem(menubar, container, '&Файл', 'Файл', 'Ф');
    });
    test('Chinese File menu renders mnemonics', function () {
        validateMenuBarItem(menubar, container, '文件(&F)', '文件', 'F');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9icm93c2VyL3VpL21lbnUvbWVudWJhci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDL0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRW5GLFNBQVMsMkJBQTJCLENBQUMsY0FBMkIsRUFBRSxTQUFpQjtJQUNsRixJQUFJLENBQUMsQ0FBQztJQUNOLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsY0FBYyxDQUFDLGlCQUFpQixFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFFdkQsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN6RSxPQUFPLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFnQixDQUFDO1FBQ2xELENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDO0FBRUQsU0FBUyx3QkFBd0IsQ0FBQyxpQkFBOEI7SUFDL0QsSUFBSSxDQUFDLENBQUM7SUFDTixLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGlCQUFpQixDQUFDLGlCQUFpQixFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDMUQsSUFBSSxpQkFBaUIs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