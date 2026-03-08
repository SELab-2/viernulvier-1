import z from "zod";

export type Serial = z.ZodInt;

export const serial = z.int().nonnegative

type RecursionHelper<O extends z.ZodType> = z.ZodType<{
  [Key in keyof z.output<O>]: z.output<O>[Key] extends ForeignKey<any, any>
    ? ForeignKey<any, any>
    : z.output<O>[Key];
}>;

export type PrimaryKey<T extends z.ZodType> = T & z.$brand<"PrimaryKey">;

/**
 * ForeignKey class that extends ZodType to add a references getter.
 *
 */
export class ForeignKey<O extends z.ZodType, T extends z.ZodType = Serial>
  extends z.ZodType
{
  private _foreignKeyRef: z.ZodLazy<O>;
  constructor(type: T, target: () => O) {
    super(type.brand<"ForeignKey">().def);
    this._foreignKeyRef = z.lazy(target);
  }

  public get references(): z.ZodType<RecursionHelper<O>> {
    return this._foreignKeyRef as z.ZodType<RecursionHelper<O>>;
  }
}

/**
 * Helper function used to declare foreign keys.
 *
 * @template O - The type of the schema to which this key references
 * @param {() => O} schema - A callback that returns the schema which this key references
 * @return {ForeignKey<O, Serial>} A branded `z.int().nonnegative()` which has a property `.references` which
 * returns the schema to which the key points to.
 */
export function foreignKey<O extends z.ZodObject>(
  schema: () => O,
): ForeignKey<O>;
/**
 * Helper function used to declare foreign keys.
 *
 * @template T - The type of zod type used as key
 * @template O - The type of the schema to which this key references
 * @param {T} type - The zod type to be used as a key
 * @param {() => O} schema - A callback that returns the schema which this key references
 * @return {ForeignKey<O, T>} A branded `T` which has a property `.references` which returns the schema
 * to which the key points to.
 */
export function foreignKey<T extends z.ZodType, O extends z.ZodObject>(
  type: T,
  schema: () => O,
): ForeignKey<O, T>;
export function foreignKey<T extends z.ZodType, O extends z.ZodObject>(
  typeOrObj: (() => O) | T,
  obj?: () => O,
) {
  const base = obj ? (typeOrObj as T) : z.int().nonnegative();
  const target = obj ?? (typeOrObj as () => O);
  return new ForeignKey(base, target);
}
/**
 * A helper function used to declare a primary key.
 *
 * @return {PrimaryKey<Serial>}  A branded `z.int().nonnegative()`
 */
export function primaryKey(): PrimaryKey<Serial>;
/**
 * A helper function used to declare a primary key.
 *
 * @param {T} type - The type of zod type used as key
 * @return {PrimaryKey<Serial>}  A branded `T`
 */
export function primaryKey<T extends z.ZodType>(type: T): PrimaryKey<T>;
export function primaryKey<T extends z.ZodType>(type?: T) {
  return (type ?? z.int().nonnegative()).brand<"PrimaryKey">();
}

export const VALID_LANGUAGES = z.enum(["nl", "en", "fr"]);

export const languageMap = z
  .partialRecord(VALID_LANGUAGES, z.string())
  .refine((map) => Object.keys(map).length >= 1);

export const stringToInt = z.codec(
  z.string().regex(z.regexes.integer),
  z.int(),
  {
    decode: (str) => Number.parseInt(str, 10),
    encode: (num) => num.toString(),
  },
);

export const stringToSerial = z.codec(z.string().regex(z.regexes.integer), serial(), {
  decode: (str) => Number.parseInt(str, 10),
  encode: (num) => num.toString(),
})
