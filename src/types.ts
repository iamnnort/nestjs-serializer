declare global {
  // eslint-disable-next-line no-var
  var serializerFieldConfigs: SerializerFieldConfig[];
  // eslint-disable-next-line no-var, @typescript-eslint/no-unsafe-function-type
  var serializerEntityPrefixes: Map<Function, string>;
  // eslint-disable-next-line no-var, @typescript-eslint/no-unsafe-function-type
  var serializerPrefixEntities: Map<string, Function>;
}

export type SerializerFieldConfig = {
  scopes: string[];
  relationScopes?: string[];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  target: Function;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  relationTarget?: Function;
  name: string;
  fieldName?: string;
  fieldTransform?: (value: any, entity: any) => any | Promise<any>;
};

export type SerializerConfig = {
  globalLimitedScopes?: string[];
  globalSecretScopes?: string[];
  cache?: {
    redis: {
      host: string;
      port: number;
      username: string;
      password: string;
    };
    prefix: string;
    entitySystemNameField?: string;
    ttl?: number;
  };
};

export type SerializerRequest = Request & {
  scopes?: string[];
};
