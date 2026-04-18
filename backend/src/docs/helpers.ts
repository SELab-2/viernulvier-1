import z from "zod";

type schemaDef = {
  body?: z.ZodType;
  params?: z.ZodType;
  response?: Record<number, z.ZodType>;
  default?: z.ZodType;
  description?: string;
  tags?: string[];
};

export class RequestSchema {
  private _schema: schemaDef;
  constructor(schema: schemaDef = {}) {
    this._schema = schema;
    return this;
  }

  public extend(schema: schemaDef) {
    const newSchema = {
      ...this._schema,
      ...schema,
    };
    newSchema.response = {
      ...this._schema.response,
      ...schema.response,
    };
    newSchema.tags = [...(this._schema.tags ?? []), ...(schema.tags ?? [])];
    this._schema = newSchema;
    return this;
  }

  public use() {
    return this._schema;
  }
}