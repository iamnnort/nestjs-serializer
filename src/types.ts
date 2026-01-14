declare global {
  // eslint-disable-next-line no-var
  var serializerFieldConfigs: SerializerFieldConfig[];
}

export type SerializerFieldConfig = {
  scopes: string[];
  relationScopes?: string[];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  target: Function;
  name: string;
  fieldName?: string;
  fieldTransform?: (entity: any) => any | Promise<any>;
};

export type SerializerConfig = {
  globalEntityNames?: string[];
  globalLimitedScopes?: string[];
  globalSecretScopes?: string[];
};

export type SerializerRequest = Request & {
  scopes?: string[];
};
