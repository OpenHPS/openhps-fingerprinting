import { AbsolutePosition, RelativePosition, RelativeValue, DataObjectService, DataServiceDriver } from '@openhps/core';
import { Fingerprint } from '../data';

/**
 * A fingerprint service handles the preprocessing and storage of fingerprints.
 */
export class FingerprintService<T extends Fingerprint = Fingerprint> extends DataObjectService<T> {
    public cache: Fingerprint[] = [];
    public cachedReferences: Set<string> = new Set();
    private _options: FingerprintingOptions;

    constructor(dataServiceDriver: DataServiceDriver<string, T>, options?: FingerprintingOptions) {
        super(dataServiceDriver);
        this.options = options || {};
        this.name = this.options.classifier.length > 0 ? this.options.classifier : this.name;
        this.options.aggFn = this.options.aggFn || ((values: number[]) => values.reduce((a, b) => a + b) / values.length);
        this.once('ready', this.update.bind(this));
    }

    public set options(options: FingerprintingOptions) {
        this._options = options || this.options;
        // Default options
        this.options.classifier = this.options.classifier || '';
        this.options.defaultValue = this.options.defaultValue || 0;
        this.options.groupBy = this.options.groupBy || ((pos: AbsolutePosition) => JSON.stringify(pos.toVector3()));
    }

    public get options(): FingerprintingOptions {
        return this._options;
    }

    public insert(id: string, object: T): Promise<T> {
        return new Promise((resolve, reject) => {
            super
                .insert(id, object)
                .then((storedObject) => {
                    if (!this.options.autoUpdate) {
                        return resolve(storedObject);
                    }
                    return [storedObject, this.update()];
                })
                .then((result: [T, any]) => {
                    resolve(result[0]);
                })
                .catch(reject);
        });
    }

    /**
     * Trigger an update of all fingerprints
     *
     * @returns {Promise<void>} Promise of update
     */
    public update(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Load all fingerprints from the data service
            // We do not filter as we expect a separate service per classifier
            this.findAll()
                .then((fingerprints) => {
                    const processed = new Map<string, Fingerprint>();
                    this.cachedReferences = new Set();

                    fingerprints.forEach((fingerprint) => {
                        // Extract features
                        fingerprint.relativePositions = this.featureExtraction(fingerprint.relativePositions);
                        
                        // Cache all known reference objects
                        fingerprint.relativePositions.forEach((relativePosition) => {
                            if (!this.cachedReferences.has(relativePosition.referenceObjectUID))
                                this.cachedReferences.add(relativePosition.referenceObjectUID);
                        });

                        // Append fingerprint value
                        const group = JSON.stringify(this.options.groupBy(fingerprint.position));
                        if (processed.has(group)) {
                            const existingFingerprint = processed.get(group);
                            fingerprint.relativePositions.forEach((relativePosition) => {
                                existingFingerprint.addRelativePosition(relativePosition);
                            });
                        } else {
                            processed.set(group, fingerprint);
                        }
                    });
                    const filteredFingerprints = Array.from(processed.values());

                    // Cache relative positions to vector values
                    this.cacheFingerprints(filteredFingerprints);
                    this.emit('update');
                    resolve();
                })
                .catch(reject);
        });
    }

    /**
     * Cache filtered fingerprints
     *
     * @param {Fingerprint[]} fingerprints Filtered fingerprints
     */
    protected cacheFingerprints(fingerprints: Fingerprint[]): void {
        if (fingerprints.length > 0) {
            this.cache = [];
            fingerprints.forEach((fingerprint) => {
                // Complete missing references
                this.cachedReferences.forEach((relativeObject) => {
                    if (!fingerprint.hasRelativePosition(relativeObject)) {
                        fingerprint.addRelativePosition(
                            new RelativeValue(
                                    relativeObject, 
                                    this.options.defaultValue
                                ));
                    }
                });
                fingerprint.computeVector(this.options.aggFn);
                this.cache.push(fingerprint);
            });
        }
    }

    protected featureExtraction(rel: Array<RelativeValue>): Array<RelativeValue> {
        return rel;
    }
}

export interface FingerprintingOptions {
    /**
     * Default value of missing fingerprint values
     */
    defaultValue?: number;
    /**
     * Fingerprint classifier
     *
     * @default ""
     */
    classifier?: string;
    /**
     * Group by function for fingerprint positions
     *  By default, uses the position vector only.
     *  Can be modified for different rounding options or addition of orientation.
     */
    groupBy?: (position: AbsolutePosition) => any;
    /**
     * Aggregation function
     *
     * @default {} Mean value
     */
    aggFn?: (values: number[], key?: string) => number;
    /**
     * Auto update the fingerprints for each newly recorded
     * fingerprint.
     *
     * Enabling this can cause performance issues
     *
     * @default false
     */
    autoUpdate?: boolean;
    interpolate?: boolean;
}
