import { DataServiceDriver, RelativeValue } from '@openhps/core';
import { Fingerprint } from '../data';
import { FingerprintingOptions, FingerprintService } from './FingerprintService';

export class MagFingerprintService extends FingerprintService<Fingerprint> {
    constructor(driver: DataServiceDriver<string, Fingerprint>, options?: FingerprintingOptions) {
        super(driver, options);
        this.options.aggFn = this.aggregationFn;
    }

    protected aggregationFn(values: number[], key: string): number {
        switch (key) {
            case 'MAG_X':
            case 'MAG_Y':
            case 'MAG_Z':
                // Apply gaussian distribution filtering

                // Use the mean value after gaussian filter
                return values.reduce((a, b) => a + b, 0) / values.length;
            default:
                // Use mean value for all other features
                return values.reduce((a, b) => a + b, 0) / values.length;
        }
    }
}
