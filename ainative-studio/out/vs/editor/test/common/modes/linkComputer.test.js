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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua0NvbXB1dGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVzL2xpbmtDb21wdXRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxPQUFPLEVBQXVCLFlBQVksRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRTlGLE1BQU0sd0JBQXdCO0lBRTdCLFlBQW9CLE1BQWdCO1FBQWhCLFdBQU0sR0FBTixNQUFNLENBQVU7UUFDbkMsb0JBQW9CO0lBQ3JCLENBQUM7SUFFTSxZQUFZO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDM0IsQ0FBQztJQUVNLGNBQWMsQ0FBQyxVQUFrQjtRQUN2QyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7Q0FDRDtBQUVELFNBQVMsY0FBYyxDQUFDLEtBQWU7SUFDdEMsTUFBTSxNQUFNLEdBQUcsSUFBSSx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNuRCxPQUFPLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QixDQUFDO0FBRUQsU0FBUyxVQUFVLENBQUMsSUFBWSxFQUFFLGFBQXFCO0lBQ3RELElBQUksV0FBVyxHQUFHLENBQUMsRUFDbEIsU0FBUyxHQUFHLENBQUMsRUFDYixHQUFXLEVBQ1gsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVQLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFB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