import { DataSerializer } from '@openhps/core';
import { expect } from 'chai';
import 'mocha';
import { Fingerprint } from '../../src';

describe('data fingerprint object', () => {

    it('should be serializable', () => {
        const fingerprint = new Fingerprint();
        fingerprint.addFeature("test", 1);
        fingerprint.addFeature("abc", 2);
        const serialized = DataSerializer.serialize(fingerprint);
        const deserialized = DataSerializer.deserialize(serialized);
    });

});
