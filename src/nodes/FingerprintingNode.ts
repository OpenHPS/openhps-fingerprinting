import {
    DataFrame,
    DataObject,
    RelativePosition,
    ObjectProcessingNode,
    ObjectProcessingNodeOptions,
} from '@openhps/core';
import { Fingerprint } from '../data';
import { FingerprintingOptions, FingerprintService } from '../service/FingerprintService';

/**
 * Fingerprinting processing node. Stores and computes fingerprints.
 *
 * @category Processing node
 */
export class FingerprintingNode<
    InOut extends DataFrame,
    F extends Fingerprint = Fingerprint,
> extends ObjectProcessingNode<InOut> {
    protected options: FingerprintingNodeOptions;
    protected service: FingerprintService<F>;

    constructor(options?: FingerprintingNodeOptions) {
        super(options);
        this.options.valueFilter = this.options.valueFilter || (() => true);
        this.once('build', this._onBuild.bind(this));
    }

    private _onBuild(): void {
        if (this.options.classifier && this.options.classifier.length > 0) {
            this.service = this.model.findDataService(this.options.classifier);
            if (!this.service || !(this.service instanceof FingerprintService)) {
                throw new Error(
                    `Fingerprinting node requires a fingerprint data service with classifier '${this.options.classifier}'!`,
                );
            }
        } else {
            this.service = this.model.findDataService(Fingerprint);
            if (!this.service || !(this.service instanceof FingerprintService)) {
                throw new Error('Fingerprinting node requires a fingerprint data service!');
            }
        }
        this.service.on('update', () => this.emit('update'));
        return;
    }

    get serviceOptions(): FingerprintingOptions {
        return this.service.options;
    }

    get cache(): Fingerprint[] {
        return this.service.cache;
    }

    get cachedReferences(): Set<string> {
        return this.service.cachedReferences;
    }

    processObject(dataObject: DataObject, dataFrame: InOut): Promise<DataObject> {
        return new Promise((resolve, reject) => {
            if (dataObject.position !== undefined && !this.options.locked) {
                this.offlineFingerprinting(dataObject, dataFrame).then(resolve).catch(reject);
            } else if (dataObject.relativePositions.length > 0) {
                this.onlineFingerprinting(dataObject, dataFrame).then(resolve).catch(reject);
            } else {
                resolve(dataObject);
            }
        });
    }

    /**
     * Online fingerprinting
     *  Use relative positions to retrieve a position.
     *
     * @param {DataObject} dataObject Data object to reverse fingerprint
     * @param {DataFrame} _dataFrame Data frame this data object was included in
     * @returns {Promise<DataObject>} Promise of data object
     */
    protected onlineFingerprinting(dataObject: DataObject, _dataFrame: InOut): Promise<DataObject> {
        return new Promise((resolve) => {
            resolve(dataObject);
        });
    }

    /**
     * Offline fingerprinting
     *  Store the fingerprint if it has a position and relative positions.
     *
     * @param {DataObject} dataObject Data object to treat as fingerprinting source
     * @param {DataFrame} dataFrame Data frame this data object was included in
     * @returns {Promise<DataObject>} Data object promise
     */
    protected offlineFingerprinting(dataObject: DataObject, dataFrame: InOut): Promise<DataObject> {
        return new Promise((resolve, reject) => {
            // Create a fingerprint at the current position
            const fingerprint = new Fingerprint();
            fingerprint.source = dataObject;
            fingerprint.createdTimestamp = dataFrame.createdTimestamp;
            fingerprint.position = dataObject.position;
            fingerprint.classifier = this.serviceOptions.classifier;

            // Add relative positions that will define the fingerprint
            dataObject.relativePositions.filter(this.options.valueFilter).forEach((rel) => {
                // Do not add relative position if reference value is unusable
                if (rel.referenceValue !== undefined && !isNaN(rel.referenceValue)) {
                    fingerprint.addFeature(rel.referenceObjectUID, rel.referenceValue);
                }
            });

            if (fingerprint.features.size > 0) {
                // Store the fingerprint
                this.service
                    .insertObject(fingerprint as any)
                    .then(() => {
                        resolve(dataObject);
                    })
                    .catch(reject);
            } else {
                resolve(dataObject);
            }
        });
    }

    on(name: string | symbol, listener: (...args: any[]) => void): this;
    /**
    /**
     * Event when fingerprints are being updated
     *
     * @param {string} event update
     * @param {Function} listener Event callback
     * @returns {FingerprintingNode} Instance of node
     */
    on(event: 'update', listener: () => Promise<void> | void): this {
        return super.on(event, listener);
    }
}

export interface FingerprintingNodeOptions extends ObjectProcessingNodeOptions {
    locked?: boolean;
    /**
     * Fingerprint classifier
     *
     * @default ""
     */
    classifier?: string;
    /**
     * Filter on relative positions
     */
    valueFilter?: (pos: RelativePosition) => boolean;
}
