declare global {
  // eslint-disable-next-line no-var
  var serializerFieldConfigs: {
    scopes: string[];
    relationScopes?: string[];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    target: Function;
    name: string;
    fieldName?: string;
    fieldTransform?: (entity: any) => Promise<any>;
  }[];
}

export type SerializerConfig = {
  globalEntityNames?: string[];
};
