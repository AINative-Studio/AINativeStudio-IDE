/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isFunction } from '../../../../base/common/types.js';
import { Registry } from '../../common/platform.js';
suite('Platform / Registry', () => {
    test('registry - api', function () {
        assert.ok(isFunction(Registry.add));
        assert.ok(isFunction(Registry.as));
        assert.ok(isFunction(Registry.knows));
    });
    test('registry - mixin', function () {
        Registry.add('foo', { bar: true });
        assert.ok(Registry.knows('foo'));
        assert.ok(Registry.as('foo').bar);
        assert.strictEqual(Registry.as('foo').bar, true);
    });
    test('registry - knows, as', function () {
        const ext = {};
        Registry.add('knows,as', ext);
        assert.ok(Registry.knows('knows,as'));
        assert.ok(!Registry.knows('knows,as1234'));
        assert.ok(Registry.as('knows,as') === ext);
        assert.ok(Registry.as('knows,as1234') === null);
    });
    test('registry - mixin, fails on duplicate ids', function () {
        Registry.add('foo-dup', { bar: true });
        try {
            Registry.add('foo-dup', { bar: false });
            assert.ok(false);
        }
        catch (e) {
            assert.ok(true);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhdGZvcm0udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZWdpc3RyeS90ZXN0L2NvbW1vbi9wbGF0Zm9ybS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXBELEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7SUFFakMsSUFBSSxDQUFDLGdCQUFnQixFQUFFO1FBQ3RCLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3ZDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGtCQUFrQixFQUFFO1FBRXhCLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFbkMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFNLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBTSxLQUFLLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdkQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsc0JBQXNCLEVBQUU7UUFFNUIsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBRWYsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFFOUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUUzQyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDO0lBQ2pELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDBDQUEwQyxFQUFFO1FBRWhELFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFdkMsSUFBSSxDQUFDO1lBQ0osUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUN4QyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2xCLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqQixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9