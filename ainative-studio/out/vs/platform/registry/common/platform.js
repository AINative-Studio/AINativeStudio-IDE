/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as Assert from '../../../base/common/assert.js';
import * as Types from '../../../base/common/types.js';
class RegistryImpl {
    constructor() {
        this.data = new Map();
    }
    add(id, data) {
        Assert.ok(Types.isString(id));
        Assert.ok(Types.isObject(data));
        Assert.ok(!this.data.has(id), 'There is already an extension with this id');
        this.data.set(id, data);
    }
    knows(id) {
        return this.data.has(id);
    }
    as(id) {
        return this.data.get(id) || null;
    }
}
export const Registry = new RegistryImpl();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhdGZvcm0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVnaXN0cnkvY29tbW9uL3BsYXRmb3JtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sZ0NBQWdDLENBQUM7QUFDekQsT0FBTyxLQUFLLEtBQUssTUFBTSwrQkFBK0IsQ0FBQztBQXlCdkQsTUFBTSxZQUFZO0lBQWxCO1FBRWtCLFNBQUksR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFDO0lBaUJoRCxDQUFDO0lBZk8sR0FBRyxDQUFDLEVBQVUsRUFBRSxJQUFTO1FBQy9CLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSw0Q0FBNEMsQ0FBQyxDQUFDO1FBRTVFLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN6QixDQUFDO0lBRU0sS0FBSyxDQUFDLEVBQVU7UUFDdEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBRU0sRUFBRSxDQUFDLEVBQVU7UUFDbkIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUM7SUFDbEMsQ0FBQztDQUNEO0FBRUQsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFjLElBQUksWUFBWSxFQUFFLENBQUMifQ==