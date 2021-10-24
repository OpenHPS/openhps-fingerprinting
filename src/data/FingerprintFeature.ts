import { SerializableArrayMember, SerializableMember, SerializableObject } from '@openhps/core';

@SerializableObject()
export class FingerprintFeature {
    @SerializableMember()
    key: string;
    @SerializableArrayMember(Number)
    values: number[] = [];

    constructor(key?: string) {
        this.key = key;
    }
}
