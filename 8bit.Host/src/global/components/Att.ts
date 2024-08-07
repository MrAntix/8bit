import 'reflect-metadata';
import { logger } from '../../logger';

export const ATTR_FALSE_VALUES = ['false', 'no', 'off', null, undefined];
export const ATT_ACCESS_READ_WRITE = 'read-write';
export const ATT_ACCESS_READ_ONLY = 'read-only';
export const ATT_ACCESS_WRITE_ONLY = 'write-only';
export type AttrAccess = typeof ATT_ACCESS_READ_WRITE | typeof ATT_ACCESS_READ_ONLY | typeof ATT_ACCESS_WRITE_ONLY;

/**
 * Decorator to sync a property and attribute on a web component
 *
 * value to serialize to and from a string - json not supported
 *
 * @param options.name attribute name, defaults to kebab case of the property name
 * @param options.access read and write access to attribute from property, default ```'read-write'```
 *
 * @example
 * ```typescript
 * ＠Att() value: number
 * ```
 */
export function Att<T>(
    options: {
        name?: string;
        access?: AttrAccess;
    } = {}) {

    return function (
        target: IComponent,
        propertyKey: string,
        property?: TypedPropertyDescriptor<T>
    ) {
        const o: {
            name: string;
            access: AttrAccess;
        } = {
            name: propertyKey.replace(/[A-Z]+(?![a-z])|[A-Z]/g, (c, m) => (m ? '-' : '') + c.toLowerCase()),
            access: ATT_ACCESS_READ_WRITE,
            ...options
        };

        const type = Reflect.getMetadata('design:type', target, propertyKey);

        if (!property) {
            const fieldName = `__${propertyKey}`;

            Object.defineProperty(target, propertyKey, {
                get: function () { return this[fieldName] ?? (type === Boolean ? false : this[fieldName]); },
                set: function (value: T) { this[fieldName] = value; },
                configurable: true,
                enumerable: false
            });

            property = Object.getOwnPropertyDescriptor(target, propertyKey);

            logger.debug('Att.createField', fieldName);
        }

        const get = property?.get ?? function () { return undefined as T; };
        const set = property?.set ?? function () { };

        if (o.access === ATT_ACCESS_READ_WRITE
            || o.access === ATT_ACCESS_READ_ONLY) {

            const targetCtor = target.constructor as IComponentConstructor;
            targetCtor.observedAttributes
                = [...(targetCtor.observedAttributes ?? []), o.name];
            const change = target.attributeChangedCallback;

            target.attributeChangedCallback
                = function (name, oldValue, newValue) {
                    if (oldValue === newValue)
                        return;

                    change?.call(this, name, oldValue, newValue);
                    if (name !== o.name)
                        return;

                    let newValueTyped: unknown = newValue;
                    if (newValue != null) {
                        if (type === Boolean) {
                            newValueTyped = !ATTR_FALSE_VALUES.includes(newValue);

                        } else if (type === Number) {
                            newValueTyped = Number.parseFloat(newValue);
                        }
                    }

                    logger.debug('Att.attributeChangedCallback', {
                        name, propertyKey, oldValue, newValue, newValueTyped
                    });

                    if (get.call(this) !== newValueTyped)
                        set.call(this, newValueTyped as T);
                };
        }

        if (o.access === ATT_ACCESS_READ_WRITE
            || o.access === ATT_ACCESS_WRITE_ONLY) {

            Object.defineProperty(target, propertyKey, {
                get,
                set: function (value) {
                    if (value === get.call(this))
                        return;
                    logger.debug('Att.set', o.name, value);

                    set.call(this, value);
                    try {

                        if (type === Boolean) {
                            value
                                ? this.setAttribute(o.name, '')
                                : this.removeAttribute(o.name);
                        } else {
                            value == undefined
                                ? this.removeAttribute(o.name)
                                : this.setAttribute(o.name, `${value}`);
                        }

                    } catch (error) {
                        logger.error('Att.setAttribute', this, o.name, value, error);
                    }
                },
                configurable: true,
                enumerable: true
            });
        }
    };
}
