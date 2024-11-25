global.serializerFieldConfigs = [];

export const SerializeField = (
  configs: {
    scopes: string[];
    fieldName?: string;
  }[],
) => {
  return (target: object, name: string) => {
    configs.forEach((config) => {
      global.serializerFieldConfigs.push({
        scopes: config.scopes,
        target: target.constructor,
        name,
        fieldName: config.fieldName,
      });
    });
  };
};

export const SerializeRelation = (
  configs: {
    scopes: string[];
    relationScopes: string[];
    fieldName?: string;
    fieldTransform?: (entity: any) => any | Promise<any>;
  }[],
) => {
  return (target: object, name: string) => {
    configs.forEach((config) => {
      global.serializerFieldConfigs.push({
        scopes: config.scopes,
        relationScopes: config.relationScopes,
        target: target.constructor,
        name,
        fieldName: config.fieldName,
        fieldTransform: config.fieldTransform,
      });
    });
  };
};
