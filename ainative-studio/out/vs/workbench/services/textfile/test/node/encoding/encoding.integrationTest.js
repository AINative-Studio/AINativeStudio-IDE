/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as terminalEncoding from '../../../../../../base/node/terminalEncoding.js';
import * as encoding from '../../../common/encoding.js';
suite('Encoding', function () {
    this.timeout(10000);
    test('resolve terminal encoding (detect)', async function () {
        const enc = await terminalEncoding.resolveTerminalEncoding();
        assert.ok(enc.length > 0);
    });
    test('resolve terminal encoding (environment)', async function () {
        process.env['VSCODE_CLI_ENCODING'] = 'utf16le';
        const enc = await terminalEncoding.resolveTerminalEncoding();
        assert.ok(await encoding.encodingExists(enc));
        assert.strictEqual(enc, 'utf16le');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jb2RpbmcuaW50ZWdyYXRpb25UZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0ZmlsZS90ZXN0L25vZGUvZW5jb2RpbmcvZW5jb2RpbmcuaW50ZWdyYXRpb25UZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssZ0JBQWdCLE1BQU0saURBQWlELENBQUM7QUFDcEYsT0FBTyxLQUFLLFFBQVEsTUFBTSw2QkFBNkIsQ0FBQztBQUV4RCxLQUFLLENBQUMsVUFBVSxFQUFFO0lBRWpCLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFcEIsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEtBQUs7UUFDL0MsTUFBTSxHQUFHLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1FBQzdELE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztJQUMzQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx5Q0FBeUMsRUFBRSxLQUFLO1FBQ3BELE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsR0FBRyxTQUFTLENBQUM7UUFFL0MsTUFBTSxHQUFHLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1FBQzdELE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxRQUFRLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDcEMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9