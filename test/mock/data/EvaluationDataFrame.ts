import { DataFrame, SerializableObject, DataObject, SerializableMapMember } from '@openhps/core';

@SerializableObject()
export class EvaluationDataFrame extends DataFrame {
    @SerializableMapMember(String, DataObject)
    public evaluationObjects: Map<string, DataObject> = new Map();
}