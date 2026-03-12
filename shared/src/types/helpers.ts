import z from "zod";

export type Serial = z.ZodInt;

export const serial = z.int().nonnegative;

export type PrimaryKey<T extends z.ZodType> = T & z.$brand<"PrimaryKey">;

type RecursionHelper<O extends z.ZodType> = z.ZodType<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [Key in keyof z.output<O>]: z.output<O>[Key] extends ForeignKey<any, any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? ForeignKey<any, any>
    : z.output<O>[Key];
}>;
export class ForeignKey<O extends z.ZodType, T extends z.ZodType = Serial>
  extends z.ZodType
{
  private _foreignKeyRef: z.ZodLazy<O>;

  constructor(type: T, target: () => O) {
    const branded = type.brand<"ForeignKey">();
    super(branded.def);
    // Zod v4 does not assign `_zod.parse` in the base `ZodType` constructor —
    // each subclass's initializer is responsible for setting it. Since we extend
    // `ZodType` directly, we must manually wire it up by delegating to the
    // branded type's `_zod.run`, which is the full parse+check pipeline.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this._zod as any).parse = (branded as any)._zod.run.bind(branded._zod);
    this._foreignKeyRef = z.lazy(target);
  }

  public get references(): z.ZodType<RecursionHelper<O>> {
    return this._foreignKeyRef as z.ZodType<RecursionHelper<O>>;
  }
}

/**
 * Helper function used to declare foreign keys.
 *
 * @typeParam O - The type of the schema to which this key references
 * @param schema - A callback that returns the schema which this key references
 * @returns A branded `z.int().nonnegative()` which has a property `.references` which
 * returns the schema to which the key points to.
 */
export function foreignKey<O extends z.ZodObject>(
  schema: () => O,
): ForeignKey<O>;
/**
 * Helper function used to declare foreign keys.
 *
 * @typeParam T - The type of zod type used as key
 * @typeParam O - The type of the schema to which this key references
 * @param type - The zod type to be used as a key
 * @param schema - A callback that returns the schema which this key references
 * @returns A branded `T` which has a property `.references` which returns the schema
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
 * @returns A branded `z.int().nonnegative()`
 */
export function primaryKey(): PrimaryKey<Serial>;
/**
 * A helper function used to declare a primary key.
 *
 * @param type - The type of zod type used as key
 * @returns A branded `T`
 */
export function primaryKey<T extends z.ZodType>(type: T): PrimaryKey<T>;
export function primaryKey<T extends z.ZodType>(type?: T) {
  return (type ?? z.int().nonnegative()).brand<"PrimaryKey">();
}

export const VALID_LANGUAGES = z.enum(["nl", "en", "fr"]);

export const languageMap = z
  .partialRecord(VALID_LANGUAGES, z.string())
  .refine((map) => Object.keys(map).length >= 1);

export const stringToSerial = z.codec(
  z.string().regex(z.regexes.integer),
  serial(),
  {
    decode: (str) => Number.parseInt(str, 10),
    encode: (num) => num.toString(),
  },
);
export const stringToInt = z.codec(
  z.string().regex(z.regexes.integer),
  z.int(),
  {
    decode: (str) => Number.parseInt(str, 10),
    encode: (num) => num.toString(),
  },
);