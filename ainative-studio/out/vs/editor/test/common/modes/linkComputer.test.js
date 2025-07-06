/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { computeLinks } from '../../../common/languages/linkComputer.js';
class SimpleLinkComputerTarget {
    constructor(_lines) {
        this._lines = _lines;
        // Intentional Empty
    }
    getLineCount() {
        return this._lines.length;
    }
    getLineContent(lineNumber) {
        return this._lines[lineNumber - 1];
    }
}
function myComputeLinks(lines) {
    const target = new SimpleLinkComputerTarget(lines);
    return computeLinks(target);
}
function assertLink(text, extractedLink) {
    let startColumn = 0, endColumn = 0, chr, i = 0;
    for (i = 0; i < extractedLink.length; i++) {
        chr = extractedLink.charAt(i);
        if (chr !== ' ' && chr !== '\t') {
            startColumn = i + 1;
            break;
        }
    }
    for (i = extractedLink.length - 1; i >= 0; i--) {
        chr = extractedLink.charAt(i);
        if (chr !== ' ' && chr !== '\t') {
            endColumn = i + 2;
            break;
        }
    }
    const r = myComputeLinks([text]);
    assert.deepStrictEqual(r, [{
            range: {
                startLineNumber: 1,
                startColumn: startColumn,
                endLineNumber: 1,
                endColumn: endColumn
            },
            url: extractedLink.substring(startColumn - 1, endColumn - 1)
        }]);
}
suite('Editor Modes - Link Computer', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Null model', () => {
        const r = computeLinks(null);
        assert.deepStrictEqual(r, []);
    });
    test('Parsing', () => {
        assertLink('x = "http://foo.bar";', '     http://foo.bar  ');
        assertLink('x = (http://foo.bar);', '     http://foo.bar  ');
        assertLink('x = [http://foo.bar];', '     http://foo.bar  ');
        assertLink('x = \'http://foo.bar\';', '     http://foo.bar  ');
        assertLink('x =  http://foo.bar ;', '     http://foo.bar  ');
        assertLink('x = <http://foo.bar>;', '     http://foo.bar  ');
        assertLink('x = {http://foo.bar};', '     http://foo.bar  ');
        assertLink('(see http://foo.bar)', '     http://foo.bar  ');
        assertLink('[see http://foo.bar]', '     http://foo.bar  ');
        assertLink('{see http://foo.bar}', '     http://foo.bar  ');
        assertLink('<see http://foo.bar>', '     http://foo.bar  ');
        assertLink('<url>http://mylink.com</url>', '     http://mylink.com      ');
        assertLink('// Click here to learn more. https://go.microsoft.com/fwlink/?LinkID=513275&clcid=0x409', '                             https://go.microsoft.com/fwlink/?LinkID=513275&clcid=0x409');
        assertLink('// Click here to learn more. https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx', '                             https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx');
        assertLink('// https://github.com/projectkudu/kudu/blob/master/Kudu.Core/Scripts/selectNodeVersion.js', '   https://github.com/projectkudu/kudu/blob/master/Kudu.Core/Scripts/selectNodeVersion.js');
        assertLink('<!-- !!! Do not remove !!!   WebContentRef(link:https://go.microsoft.com/fwlink/?LinkId=166007, area:Admin, updated:2015, nextUpdate:2016, tags:SqlServer)   !!! Do not remove !!! -->', '                                                https://go.microsoft.com/fwlink/?LinkId=166007                                                                                        ');
        assertLink('For instructions, see https://go.microsoft.com/fwlink/?LinkId=166007.</value>', '                      https://go.microsoft.com/fwlink/?LinkId=166007         ');
        assertLink('For instructions, see https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx.</value>', '                      https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx         ');
        assertLink('x = "https://en.wikipedia.org/wiki/Zürich";', '     https://en.wikipedia.org/wiki/Zürich  ');
        assertLink('請參閱 http://go.microsoft.com/fwlink/?LinkId=761051。', '    http://go.microsoft.com/fwlink/?LinkId=761051 ');
        assertLink('（請參閱 http://go.microsoft.com/fwlink/?LinkId=761051）', '     http://go.microsoft.com/fwlink/?LinkId=761051 ');
        assertLink('x = "file:///foo.bar";', '     file:///foo.bar  ');
        assertLink('x = "file://c:/foo.bar";', '     file://c:/foo.bar  ');
        assertLink('x = "file://shares/foo.bar";', '     file://shares/foo.bar  ');
        assertLink('x = "file://shäres/foo.bar";', '     file://shäres/foo.bar  ');
        assertLink('Some text, then http://www.bing.com.', '                http://www.bing.com ');
        assertLink('let url = `http://***/_api/web/lists/GetByTitle(\'Teambuildingaanvragen\')/items`;', '           http://***/_api/web/lists/GetByTitle(\'Teambuildingaanvragen\')/items  ');
    });
    test('issue #7855', () => {
        assertLink('7. At this point, ServiceMain has been called.  There is no functionality presently in ServiceMain, but you can consult the [MSDN documentation](https://msdn.microsoft.com/en-us/library/windows/desktop/ms687414(v=vs.85).aspx) to add functionality as desired!', '                                                                                                                                                 https://msdn.microsoft.com/en-us/library/windows/desktop/ms687414(v=vs.85).aspx                                  ');
    });
    test('issue #62278: "Ctrl + click to follow link" for IPv6 URLs', () => {
        assertLink('let x = "http://[::1]:5000/connect/token"', '         http://[::1]:5000/connect/token  ');
    });
    test('issue #70254: bold links dont open in markdown file using editor mode with ctrl + click', () => {
        assertLink('2. Navigate to **https://portal.azure.com**', '                 https://portal.azure.com  ');
    });
    test('issue #86358: URL wrong recognition pattern', () => {
        assertLink('POST|https://portal.azure.com|2019-12-05|', '     https://portal.azure.com            ');
    });
    test('issue #67022: Space as end of hyperlink isn\'t always good idea', () => {
        assertLink('aa  https://foo.bar/[this is foo site]  aa', '    https://foo.bar/[this is foo site]    ');
    });
    test('issue #100353: Link detection stops at ＆(double-byte)', () => {
        assertLink('aa  http://tree-mark.chips.jp/レーズン＆ベリーミックス  aa', '    http://tree-mark.chips.jp/レーズン＆ベリーミックス    ');
    });
    test('issue #121438: Link detection stops at【...】', () => {
        assertLink('aa  https://zh.wikipedia.org/wiki/【我推的孩子】 aa', '    https://zh.wikipedia.org/wiki/【我推的孩子】   ');
    });
    test('issue #121438: Link detection stops at《...》', () => {
        assertLink('aa  https://zh.wikipedia.org/wiki/《新青年》编辑部旧址 aa', '    https://zh.wikipedia.org/wiki/《新青年》编辑部旧址   ');
    });
    test('issue #121438: Link detection stops at “...”', () => {
        assertLink('aa  https://zh.wikipedia.org/wiki/“常凯申”误译事件 aa', '    https://zh.wikipedia.org/wiki/“常凯申”误译事件   ');
    });
    test('issue #150905: Colon after bare hyperlink is treated as its part', () => {
        assertLink('https://site.web/page.html: blah blah blah', 'https://site.web/page.html                ');
    });
    // Removed because of #156875
    // test('issue #151631: Link parsing stoped where comments include a single quote ', () => {
    // 	assertLink(
    // 		`aa https://regexper.com/#%2F''%2F aa`,
    // 		`   https://regexper.com/#%2F''%2F   `,
    // 	);
    // });
    test('issue #156875: Links include quotes ', () => {
        assertLink(`"This file has been converted from https://github.com/jeff-hykin/better-c-syntax/blob/master/autogenerated/c.tmLanguage.json",`, `                                   https://github.com/jeff-hykin/better-c-syntax/blob/master/autogenerated/c.tmLanguage.json  `);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua0NvbXB1dGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2Rlcy9saW5rQ29tcHV0ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsT0FBTyxFQUF1QixZQUFZLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUU5RixNQUFNLHdCQUF3QjtJQUU3QixZQUFvQixNQUFnQjtRQUFoQixXQUFNLEdBQU4sTUFBTSxDQUFVO1FBQ25DLG9CQUFvQjtJQUNyQixDQUFDO0lBRU0sWUFBWTtRQUNsQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQzNCLENBQUM7SUFFTSxjQUFjLENBQUMsVUFBa0I7UUFDdkMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNwQyxDQUFDO0NBQ0Q7QUFFRCxTQUFTLGNBQWMsQ0FBQyxLQUFlO0lBQ3RDLE1BQU0sTUFBTSxHQUFHLElBQUksd0JBQXdCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbkQsT0FBTyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLElBQVksRUFBRSxhQUFxQjtJQUN0RCxJQUFJLFdBQVcsR0FBRyxDQUFDLEVBQ2xCLFNBQVMsR0FBRyxDQUFDLEVBQ2IsR0FBVyxFQUNYLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFUCxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFF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