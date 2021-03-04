import { SerializableMember, SerializableObject, DataObject, RelativePosition } from '@openhps/core';
import { v4 as uuidv4 } from 'uuid';
import { FingerprintValue } from './FingerprintValue';

@SerializableObject()
export class Fingerprint extends DataObject {
    public vector: number[];
    @SerializableMember()
    public classifier: string;
    @SerializableMember()
    public processed: boolean;

    constructor(displayName?: string) {
        super(uuidv4(), displayName);
    }

    public addRelativePosition(rel: RelativePosition<any>): void {
        if (rel instanceof FingerprintValue) {
            rel.referenceValue.forEach(val => {
                this.addValue(rel.referenceObjectUID, val);
            });
        } else {
            this.addValue(rel.referenceObjectUID, rel.referenceValue);
        }
    }

    public addValue(key: string, value: number): void {
        let fingerprintValue: FingerprintValue = this.getRelativePosition(key);
        if (!fingerprintValue) {
            fingerprintValue = new FingerprintValue(key, []);
            super.addRelativePosition(fingerprintValue);
        }
        fingerprintValue.referenceValue.push(value);
    }

    /**
     * Set the fingerprint source. This can be used to identify the
     * user or device that captured the data.
     *
     * @param {DataObject} obj Fingerprint source
     */
    public set source(obj: DataObject) {
        this.parentUID = obj.uid;
    }

    /**
     * Compute the relative position vector from the relative positions
     *
     * @param {(values: number[], key?: string => number)} aggFn Aggregation function
     */
    public computeVector(aggFn: (values: number[], key?: string) => number): void {
        this.vector = [];
        super.relativePositions
            // Sort alphabetically
            .sort((a: FingerprintValue, b: FingerprintValue) =>
                a.referenceObjectUID.localeCompare(b.referenceObjectUID),
            )
            .map((rel: FingerprintValue) => {
                this.vector.push(aggFn(rel.referenceValue, rel.referenceObjectUID));
            });
    }
}
