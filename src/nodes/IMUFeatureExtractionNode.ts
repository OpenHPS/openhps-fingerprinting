import { DataFrame, IMUDataFrame, ProcessingNode, ProcessingNodeOptions, RelativeValue } from '@openhps/core';

export class IMUFeatureExtractionNode<InOut extends IMUDataFrame> extends ProcessingNode<InOut> {
    constructor(options?: ProcessingNodeOptions) {
        super(options);

        this.options.frameFilter = (frame: DataFrame) => frame instanceof IMUDataFrame;
    }

    public process(frame: IMUDataFrame): Promise<IMUDataFrame> {
        return new Promise((resolve) => {
            const source = frame.source;
            if (!source) return resolve(frame);

            if (frame.acceleration) {
                source.addRelativePosition(new RelativeValue('ACC_X', frame.acceleration.x));
                source.addRelativePosition(new RelativeValue('ACC_Y', frame.acceleration.y));
                source.addRelativePosition(new RelativeValue('ACC_Z', frame.acceleration.z));
            }

            if (frame.linearAcceleration) {
                source.addRelativePosition(new RelativeValue('LINEAR_ACC_X', frame.linearAcceleration.x));
                source.addRelativePosition(new RelativeValue('LINEAR_ACC_Y', frame.linearAcceleration.y));
                source.addRelativePosition(new RelativeValue('LINEAR_ACC_Z', frame.linearAcceleration.z));
            }

            if (frame.magnetism) {
                source.addRelativePosition(new RelativeValue('MAG_X', frame.magnetism.x));
                source.addRelativePosition(new RelativeValue('MAG_Y', frame.magnetism.y));
                source.addRelativePosition(new RelativeValue('MAG_Z', frame.magnetism.z));
            }

            if (frame.angularVelocity) {
                source.addRelativePosition(new RelativeValue('RRATE_X', frame.angularVelocity.x));
                source.addRelativePosition(new RelativeValue('RRATE_Y', frame.angularVelocity.y));
                source.addRelativePosition(new RelativeValue('RRATE_Z', frame.angularVelocity.z));
            }

            if (frame.absoluteOrientation) {
                source.addRelativePosition(new RelativeValue('QUAT_X', frame.absoluteOrientation.x));
                source.addRelativePosition(new RelativeValue('QUAT_Y', frame.absoluteOrientation.y));
                source.addRelativePosition(new RelativeValue('QUAT_Z', frame.absoluteOrientation.z));
                source.addRelativePosition(new RelativeValue('QUAT_W', frame.absoluteOrientation.w));
                const euler = frame.absoluteOrientation.toEuler();
                source.addRelativePosition(new RelativeValue('PITCH', euler.pitch));
                source.addRelativePosition(new RelativeValue('YAW', euler.yaw));
                source.addRelativePosition(new RelativeValue('ROLL', euler.roll));
            }
            resolve(frame);
        });
    }
}
