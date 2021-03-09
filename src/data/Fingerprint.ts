import { SerializableMember, SerializableObject, DataObject, SerializableMapMember } from '@openhps/core';
import { v4 as uuidv4 } from 'uuid';
import { FingerprintFeature } from './FingerprintFeature';

@SerializableObject()
export class Fingerprint extends DataObject {
    public vector: number[];
    @SerializableMember()
    public classifier: string;
    @SerializableMember()
    public processed: boolean;
    @SerializableMapMember(String, FingerprintFeature)
    public features: Map<string, FingerprintFeature> = new Map();

    constructor(displayName?: string) {
        super(uuidv4(), displayName);
    }

    /**
     * Check if a fingerprint has a feature
     *
     * @param {string} key Feature key
     * @returns {boolean} Existance of feature
     */
    public hasFeature(key: string): boolean {
        return this.features.has(key);
    }

    /**
     * Add a feature to the fingerprint
     *
     * @param {string} key Feature key
     * @param {number} value Feature value
     * @returns {Fingerprint} instance
     */
    public addFeature(key: string, value: number): this {
        const feature: FingerprintFeature = this.features.get(key) || new FingerprintFeature(key);
        feature.values.push(value);
        this.features.set(key, feature);
        return this;
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
     * @param {Function} aggFn Aggregation function
     */
    public computeVector(aggFn: (values: number[], key?: string) => number): void {
        this.vector = [];
        Array.from(this.features.values())
            // Sort alphabetically
            .sort((a, b) => a.key.localeCompare(b.key))
            .forEach((feature) => {
                this.vector.push(aggFn(feature.values, feature.key));
            });
        this.processed = true;
    }
}
