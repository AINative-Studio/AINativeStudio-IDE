/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import { Emitter } from '../../../../base/common/event.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { SyncDescriptor } from '../../common/descriptors.js';
import { createDecorator, IInstantiationService } from '../../common/instantiation.js';
import { InstantiationService } from '../../common/instantiationService.js';
import { ServiceCollection } from '../../common/serviceCollection.js';
const IService1 = createDecorator('service1');
class Service1 {
    constructor() {
        this.c = 1;
    }
}
const IService2 = createDecorator('service2');
class Service2 {
    constructor() {
        this.d = true;
    }
}
const IService3 = createDecorator('service3');
class Service3 {
    constructor() {
        this.s = 'farboo';
    }
}
const IDependentService = createDecorator('dependentService');
let DependentService = class DependentService {
    constructor(service) {
        this.name = 'farboo';
        assert.strictEqual(service.c, 1);
    }
};
DependentService = __decorate([
    __param(0, IService1)
], DependentService);
let Service1Consumer = class Service1Consumer {
    constructor(service1) {
        assert.ok(service1);
        assert.strictEqual(service1.c, 1);
    }
};
Service1Consumer = __decorate([
    __param(0, IService1)
], Service1Consumer);
let Target2Dep = class Target2Dep {
    constructor(service1, service2) {
        assert.ok(service1 instanceof Service1);
        assert.ok(service2 instanceof Service2);
    }
};
Target2Dep = __decorate([
    __param(0, IService1),
    __param(1, IService2)
], Target2Dep);
let TargetWithStaticParam = class TargetWithStaticParam {
    constructor(v, service1) {
        assert.ok(v);
        assert.ok(service1);
        assert.strictEqual(service1.c, 1);
    }
};
TargetWithStaticParam = __decorate([
    __param(1, IService1)
], TargetWithStaticParam);
let DependentServiceTarget = class DependentServiceTarget {
    constructor(d) {
        assert.ok(d);
        assert.strictEqual(d.name, 'farboo');
    }
};
DependentServiceTarget = __decorate([
    __param(0, IDependentService)
], DependentServiceTarget);
let DependentServiceTarget2 = class DependentServiceTarget2 {
    constructor(d, s) {
        assert.ok(d);
        assert.strictEqual(d.name, 'farboo');
        assert.ok(s);
        assert.strictEqual(s.c, 1);
    }
};
DependentServiceTarget2 = __decorate([
    __param(0, IDependentService),
    __param(1, IService1)
], DependentServiceTarget2);
let ServiceLoop1 = class ServiceLoop1 {
    constructor(s) {
        this.c = 1;
    }
};
ServiceLoop1 = __decorate([
    __param(0, IService2)
], ServiceLoop1);
let ServiceLoop2 = class ServiceLoop2 {
    constructor(s) {
        this.d = true;
    }
};
ServiceLoop2 = __decorate([
    __param(0, IService1)
], ServiceLoop2);
suite('Instantiation Service', () => {
    test('service collection, cannot overwrite', function () {
        const collection = new ServiceCollection();
        let result = collection.set(IService1, null);
        assert.strictEqual(result, undefined);
        result = collection.set(IService1, new Service1());
        assert.strictEqual(result, null);
    });
    test('service collection, add/has', function () {
        const collection = new ServiceCollection();
        collection.set(IService1, null);
        assert.ok(collection.has(IService1));
        collection.set(IService2, null);
        assert.ok(collection.has(IService1));
        assert.ok(collection.has(IService2));
    });
    test('@Param - simple clase', function () {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new Service1());
        collection.set(IService2, new Service2());
        collection.set(IService3, new Service3());
        service.createInstance(Service1Consumer);
    });
    test('@Param - fixed args', function () {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new Service1());
        collection.set(IService2, new Service2());
        collection.set(IService3, new Service3());
        service.createInstance(TargetWithStaticParam, true);
    });
    test('service collection is live', function () {
        const collection = new ServiceCollection();
        collection.set(IService1, new Service1());
        const service = new InstantiationService(collection);
        service.createInstance(Service1Consumer);
        collection.set(IService2, new Service2());
        service.createInstance(Target2Dep);
        service.invokeFunction(function (a) {
            assert.ok(a.get(IService1));
            assert.ok(a.get(IService2));
        });
    });
    // we made this a warning
    // test('@Param - too many args', function () {
    // 	let service = instantiationService.create(Object.create(null));
    // 	service.addSingleton(IService1, new Service1());
    // 	service.addSingleton(IService2, new Service2());
    // 	service.addSingleton(IService3, new Service3());
    // 	assert.throws(() => service.createInstance(ParameterTarget2, true, 2));
    // });
    // test('@Param - too few args', function () {
    // 	let service = instantiationService.create(Object.create(null));
    // 	service.addSingleton(IService1, new Service1());
    // 	service.addSingleton(IService2, new Service2());
    // 	service.addSingleton(IService3, new Service3());
    // 	assert.throws(() => service.createInstance(ParameterTarget2));
    // });
    test('SyncDesc - no dependencies', function () {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new SyncDescriptor(Service1));
        service.invokeFunction(accessor => {
            const service1 = accessor.get(IService1);
            assert.ok(service1);
            assert.strictEqual(service1.c, 1);
            const service2 = accessor.get(IService1);
            assert.ok(service1 === service2);
        });
    });
    test('SyncDesc - service with service dependency', function () {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new SyncDescriptor(Service1));
        collection.set(IDependentService, new SyncDescriptor(DependentService));
        service.invokeFunction(accessor => {
            const d = accessor.get(IDependentService);
            assert.ok(d);
            assert.strictEqual(d.name, 'farboo');
        });
    });
    test('SyncDesc - target depends on service future', function () {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new SyncDescriptor(Service1));
        collection.set(IDependentService, new SyncDescriptor(DependentService));
        const d = service.createInstance(DependentServiceTarget);
        assert.ok(d instanceof DependentServiceTarget);
        const d2 = service.createInstance(DependentServiceTarget2);
        assert.ok(d2 instanceof DependentServiceTarget2);
    });
    test('SyncDesc - explode on loop', function () {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new SyncDescriptor(ServiceLoop1));
        collection.set(IService2, new SyncDescriptor(ServiceLoop2));
        assert.throws(() => {
            service.invokeFunction(accessor => {
                accessor.get(IService1);
            });
        });
        assert.throws(() => {
            service.invokeFunction(accessor => {
                accessor.get(IService2);
            });
        });
        try {
            service.invokeFunction(accessor => {
                accessor.get(IService1);
            });
        }
        catch (err) {
            assert.ok(err.name);
            assert.ok(err.message);
        }
    });
    test('Invoke - get services', function () {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new Service1());
        collection.set(IService2, new Service2());
        function test(accessor) {
            assert.ok(accessor.get(IService1) instanceof Service1);
            assert.strictEqual(accessor.get(IService1).c, 1);
            return true;
        }
        assert.strictEqual(service.invokeFunction(test), true);
    });
    test('Invoke - get service, optional', function () {
        const collection = new ServiceCollection([IService1, new Service1()]);
        const service = new InstantiationService(collection);
        function test(accessor) {
            assert.ok(accessor.get(IService1) instanceof Service1);
            assert.throws(() => accessor.get(IService2));
            return true;
        }
        assert.strictEqual(service.invokeFunction(test), true);
    });
    test('Invoke - keeping accessor NOT allowed', function () {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new Service1());
        collection.set(IService2, new Service2());
        let cached;
        function test(accessor) {
            assert.ok(accessor.get(IService1) instanceof Service1);
            assert.strictEqual(accessor.get(IService1).c, 1);
            cached = accessor;
            return true;
        }
        assert.strictEqual(service.invokeFunction(test), true);
        assert.throws(() => cached.get(IService2));
    });
    test('Invoke - throw error', function () {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new Service1());
        collection.set(IService2, new Service2());
        function test(accessor) {
            throw new Error();
        }
        assert.throws(() => service.invokeFunction(test));
    });
    test('Create child', function () {
        let serviceInstanceCount = 0;
        const CtorCounter = class {
            constructor() {
                this.c = 1;
                serviceInstanceCount += 1;
            }
        };
        // creating the service instance BEFORE the child service
        let service = new InstantiationService(new ServiceCollection([IService1, new SyncDescriptor(CtorCounter)]));
        service.createInstance(Service1Consumer);
        // second instance must be earlier ONE
        let child = service.createChild(new ServiceCollection([IService2, new Service2()]));
        child.createInstance(Service1Consumer);
        assert.strictEqual(serviceInstanceCount, 1);
        // creating the service instance AFTER the child service
        serviceInstanceCount = 0;
        service = new InstantiationService(new ServiceCollection([IService1, new SyncDescriptor(CtorCounter)]));
        child = service.createChild(new ServiceCollection([IService2, new Service2()]));
        // second instance must be earlier ONE
        service.createInstance(Service1Consumer);
        child.createInstance(Service1Consumer);
        assert.strictEqual(serviceInstanceCount, 1);
    });
    test('Remote window / integration tests is broken #105562', function () {
        const Service1 = createDecorator('service1');
        let Service1Impl = class Service1Impl {
            constructor(insta) {
                const c = insta.invokeFunction(accessor => accessor.get(Service2)); // THIS is the recursive call
                assert.ok(c);
            }
        };
        Service1Impl = __decorate([
            __param(0, IInstantiationService)
        ], Service1Impl);
        const Service2 = createDecorator('service2');
        class Service2Impl {
            constructor() { }
        }
        // This service depends on Service1 and Service2 BUT creating Service1 creates Service2 (via recursive invocation)
        // and then Servce2 should not be created a second time
        const Service21 = createDecorator('service21');
        let Service21Impl = class Service21Impl {
            constructor(service2, service1) {
                this.service2 = service2;
                this.service1 = service1;
            }
        };
        Service21Impl = __decorate([
            __param(0, Service2),
            __param(1, Service1)
        ], Service21Impl);
        const insta = new InstantiationService(new ServiceCollection([Service1, new SyncDescriptor(Service1Impl)], [Service2, new SyncDescriptor(Service2Impl)], [Service21, new SyncDescriptor(Service21Impl)]));
        const obj = insta.invokeFunction(accessor => accessor.get(Service21));
        assert.ok(obj);
    });
    test('Sync/Async dependency loop', async function () {
        const A = createDecorator('A');
        const B = createDecorator('B');
        let BConsumer = class BConsumer {
            constructor(b) {
                this.b = b;
            }
            doIt() {
                return this.b.b();
            }
        };
        BConsumer = __decorate([
            __param(0, B)
        ], BConsumer);
        let AService = class AService {
            constructor(insta) {
                this.prop = insta.createInstance(BConsumer);
            }
            doIt() {
                return this.prop.doIt();
            }
        };
        AService = __decorate([
            __param(0, IInstantiationService)
        ], AService);
        let BService = class BService {
            constructor(a) {
                assert.ok(a);
            }
            b() { return true; }
        };
        BService = __decorate([
            __param(0, A)
        ], BService);
        // SYNC -> explodes AImpl -> [insta:BConsumer] -> BImpl -> AImpl
        {
            const insta1 = new InstantiationService(new ServiceCollection([A, new SyncDescriptor(AService)], [B, new SyncDescriptor(BService)]), true, undefined, true);
            try {
                insta1.invokeFunction(accessor => accessor.get(A));
                assert.ok(false);
            }
            catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes('RECURSIVELY'));
            }
        }
        // ASYNC -> doesn't explode but cycle is tracked
        {
            const insta2 = new InstantiationService(new ServiceCollection([A, new SyncDescriptor(AService, undefined, true)], [B, new SyncDescriptor(BService, undefined)]), true, undefined, true);
            const a = insta2.invokeFunction(accessor => accessor.get(A));
            a.doIt();
            const cycle = insta2._globalGraph?.findCycleSlow();
            assert.strictEqual(cycle, 'A -> B -> A');
        }
    });
    test('Delayed and events', function () {
        const A = createDecorator('A');
        let created = false;
        class AImpl {
            constructor() {
                this._doIt = 0;
                this._onDidDoIt = new Emitter();
                this.onDidDoIt = this._onDidDoIt.event;
                created = true;
            }
            doIt() {
                this._doIt += 1;
                this._onDidDoIt.fire(this);
            }
        }
        const insta = new InstantiationService(new ServiceCollection([A, new SyncDescriptor(AImpl, undefined, true)]), true, undefined, true);
        let Consumer = class Consumer {
            constructor(a) {
                this.a = a;
                // eager subscribe -> NO service instance
            }
        };
        Consumer = __decorate([
            __param(0, A)
        ], Consumer);
        const c = insta.createInstance(Consumer);
        let eventCount = 0;
        // subscribing to event doesn't trigger instantiation
        const listener = (e) => {
            assert.ok(e instanceof AImpl);
            eventCount++;
        };
        const d1 = c.a.onDidDoIt(listener);
        const d2 = c.a.onDidDoIt(listener);
        assert.strictEqual(created, false);
        assert.strictEqual(eventCount, 0);
        d2.dispose();
        // instantiation happens on first call
        c.a.doIt();
        assert.strictEqual(created, true);
        assert.strictEqual(eventCount, 1);
        const d3 = c.a.onDidDoIt(listener);
        c.a.doIt();
        assert.strictEqual(eventCount, 3);
        dispose([d1, d3]);
    });
    test('Capture event before init, use after init', function () {
        const A = createDecorator('A');
        let created = false;
        class AImpl {
            constructor() {
                this._doIt = 0;
                this._onDidDoIt = new Emitter();
                this.onDidDoIt = this._onDidDoIt.event;
                created = true;
            }
            doIt() {
                this._doIt += 1;
                this._onDidDoIt.fire(this);
            }
            noop() {
            }
        }
        const insta = new InstantiationService(new ServiceCollection([A, new SyncDescriptor(AImpl, undefined, true)]), true, undefined, true);
        let Consumer = class Consumer {
            constructor(a) {
                this.a = a;
                // eager subscribe -> NO service instance
            }
        };
        Consumer = __decorate([
            __param(0, A)
        ], Consumer);
        const c = insta.createInstance(Consumer);
        let eventCount = 0;
        // subscribing to event doesn't trigger instantiation
        const listener = (e) => {
            assert.ok(e instanceof AImpl);
            eventCount++;
        };
        const event = c.a.onDidDoIt;
        // const d1 = c.a.onDidDoIt(listener);
        assert.strictEqual(created, false);
        c.a.noop();
        assert.strictEqual(created, true);
        const d1 = event(listener);
        c.a.doIt();
        // instantiation happens on first call
        assert.strictEqual(eventCount, 1);
        dispose(d1);
    });
    test('Dispose early event listener', function () {
        const A = createDecorator('A');
        let created = false;
        class AImpl {
            constructor() {
                this._doIt = 0;
                this._onDidDoIt = new Emitter();
                this.onDidDoIt = this._onDidDoIt.event;
                created = true;
            }
            doIt() {
                this._doIt += 1;
                this._onDidDoIt.fire(this);
            }
        }
        const insta = new InstantiationService(new ServiceCollection([A, new SyncDescriptor(AImpl, undefined, true)]), true, undefined, true);
        let Consumer = class Consumer {
            constructor(a) {
                this.a = a;
                // eager subscribe -> NO service instance
            }
        };
        Consumer = __decorate([
            __param(0, A)
        ], Consumer);
        const c = insta.createInstance(Consumer);
        let eventCount = 0;
        // subscribing to event doesn't trigger instantiation
        const listener = (e) => {
            assert.ok(e instanceof AImpl);
            eventCount++;
        };
        const d1 = c.a.onDidDoIt(listener);
        assert.strictEqual(created, false);
        assert.strictEqual(eventCount, 0);
        c.a.doIt();
        // instantiation happens on first call
        assert.strictEqual(created, true);
        assert.strictEqual(eventCount, 1);
        dispose(d1);
        c.a.doIt();
        assert.strictEqual(eventCount, 1);
    });
    test('Dispose services it created', function () {
        let disposedA = false;
        let disposedB = false;
        const A = createDecorator('A');
        class AImpl {
            constructor() {
                this.value = 1;
            }
            dispose() {
                disposedA = true;
            }
        }
        const B = createDecorator('B');
        class BImpl {
            constructor() {
                this.value = 1;
            }
            dispose() {
                disposedB = true;
            }
        }
        const insta = new InstantiationService(new ServiceCollection([A, new SyncDescriptor(AImpl, undefined, true)], [B, new BImpl()]), true, undefined, true);
        let Consumer = class Consumer {
            constructor(a, b) {
                this.a = a;
                this.b = b;
                assert.strictEqual(a.value, b.value);
            }
        };
        Consumer = __decorate([
            __param(0, A),
            __param(1, B)
        ], Consumer);
        const c = insta.createInstance(Consumer);
        insta.dispose();
        assert.ok(c);
        assert.strictEqual(disposedA, true);
        assert.strictEqual(disposedB, false);
    });
    test('Disposed service cannot be used anymore', function () {
        const B = createDecorator('B');
        class BImpl {
            constructor() {
                this.value = 1;
            }
        }
        const insta = new InstantiationService(new ServiceCollection([B, new BImpl()]), true, undefined, true);
        let Consumer = class Consumer {
            constructor(b) {
                this.b = b;
                assert.strictEqual(b.value, 1);
            }
        };
        Consumer = __decorate([
            __param(0, B)
        ], Consumer);
        const c = insta.createInstance(Consumer);
        assert.ok(c);
        insta.dispose();
        assert.throws(() => insta.createInstance(Consumer));
        assert.throws(() => insta.invokeFunction(accessor => { }));
        assert.throws(() => insta.createChild(new ServiceCollection()));
    });
    test('Child does not dispose parent', function () {
        const B = createDecorator('B');
        class BImpl {
            constructor() {
                this.value = 1;
            }
        }
        const insta1 = new InstantiationService(new ServiceCollection([B, new BImpl()]), true, undefined, true);
        const insta2 = insta1.createChild(new ServiceCollection());
        let Consumer = class Consumer {
            constructor(b) {
                this.b = b;
                assert.strictEqual(b.value, 1);
            }
        };
        Consumer = __decorate([
            __param(0, B)
        ], Consumer);
        assert.ok(insta1.createInstance(Consumer));
        assert.ok(insta2.createInstance(Consumer));
        insta2.dispose();
        assert.ok(insta1.createInstance(Consumer)); // parent NOT disposed by child
        assert.throws(() => insta2.createInstance(Consumer));
    });
    test('Parent does dispose children', function () {
        const B = createDecorator('B');
        class BImpl {
            constructor() {
                this.value = 1;
            }
        }
        const insta1 = new InstantiationService(new ServiceCollection([B, new BImpl()]), true, undefined, true);
        const insta2 = insta1.createChild(new ServiceCollection());
        let Consumer = class Consumer {
            constructor(b) {
                this.b = b;
                assert.strictEqual(b.value, 1);
            }
        };
        Consumer = __decorate([
            __param(0, B)
        ], Consumer);
        assert.ok(insta1.createInstance(Consumer));
        assert.ok(insta2.createInstance(Consumer));
        insta1.dispose();
        assert.throws(() => insta2.createInstance(Consumer)); // child is disposed by parent
        assert.throws(() => insta1.createInstance(Consumer));
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFudGlhdGlvblNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2luc3RhbnRpYXRpb24vdGVzdC9jb21tb24vaW5zdGFudGlhdGlvblNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV0RSxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQVksVUFBVSxDQUFDLENBQUM7QUFPekQsTUFBTSxRQUFRO0lBQWQ7UUFFQyxNQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztDQUFBO0FBRUQsTUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFZLFVBQVUsQ0FBQyxDQUFDO0FBT3pELE1BQU0sUUFBUTtJQUFkO1FBRUMsTUFBQyxHQUFHLElBQUksQ0FBQztJQUNWLENBQUM7Q0FBQTtBQUVELE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBWSxVQUFVLENBQUMsQ0FBQztBQU96RCxNQUFNLFFBQVE7SUFBZDtRQUVDLE1BQUMsR0FB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