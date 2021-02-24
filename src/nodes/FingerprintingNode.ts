import {
    Fingerprint,
    DataFrame,
    DataObject,
    RelativePosition,
    ObjectProcessingNode,
    ObjectProcessingNodeOptions,
} from '@openhps/core';
import { FingerprintingOptions, FingerprintService } from '../service/FingerprintService';

/**
 * Fingerprinting processing node. Stores and computes fingerprints.
 *
 * @category Processing node
 */
export abstract class FingerprintingNode<
    InOut extends DataFrame,
    F extends Fingerprint = Fingerprint
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

    public get serviceOptions(): FingerprintingOptions {
        return this.service.options;
    }

    public get cache(): Fingerprint[] {
        return this.service.cache;
    }

    public get cachedReferences(): Set<string> {
        return this.service.cachedReferences;
    }

    /**
     * Online fingerprinting
     *  Use relative positions to retrieve a position.
     *
     * @param {DataObject} dataObject Data object to reverse fingerprint
     * @param {DataFrame} dataFrame Data frame this data object was included in
     */
    protected abstract onlineFingerprinting(dataObject: DataObject, dataFrame: InOut): Promise<DataObject>;

    /**
     * Offline fingerprinting
     *  Store the fingerprint if it has a position and relative positions.
     *
     * @param {DataObject} dataObject Data object to treat as fingerprinting source
     * @param {DataFrame} dataFrame Data frame this data object was included in
     * @returns {Promise<DataObject>} Data object promise
     */
    protected abstract offlineFingerprinting(dataObject: DataObject, dataFrame: InOut): Promise<DataObject>;

    public on(name: string | symbol, listener: (...args: any[]) => void): this;
    /**
    /**
     * Event when fingerprints are being updated
     *
     * @param {string} event update
     * @param {Function} listener Event callback
     * @returns {FingerprintingNode} Instance of node
     */
    public on(event: 'update', listener: () => Promise<void> | void): this {
        return super.on(event, listener);
    }
}

export interface FingerprintingNodeOptions extends ObjectProcessingNodeOptions {
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
