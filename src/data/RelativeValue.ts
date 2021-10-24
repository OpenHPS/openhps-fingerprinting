import { RelativePosition, SerializableObject, Unit } from '@openhps/core';

@SerializableObject()
export class RelativeValue extends RelativePosition<number, Unit> {}
