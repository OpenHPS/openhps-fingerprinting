import { SerializableArrayMember, SerializableMember, SerializableObject } from '@openhps/core';

@SerializableObject()
export class FingerprintFeature {
    @SerializableMember()
    public key: string;
    @SerializableArrayMember(Number)
    public values: number[] = [];

    constructor(key?: string) {
        this.key = key;
    }
}
