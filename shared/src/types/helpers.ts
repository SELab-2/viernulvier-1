import z from "zod";

export type Serial = z.ZodInt;

export type PrimaryKey<T extends z.ZodType> = T & z.$brand<"PrimaryKey">;

export type ForeignKey<T extends z.ZodType, O extends z.ZodObject<any>> = T & {
  references: O;
} & z.$brand<"ForeignKey">;

/**
 * Helper function used to declare foreign keys.
 *
 * @template O - The type of the schema to which this key references
 * @param {() => O} schema - A callback that returns the schema which this key references
 * @return {ForeignKey<Serial, O>} A branded `z.int().nonnegative()` which has a property `.references` which
 * returns the schema to which the key points to.
 */
export function foreignKey<O extends z.ZodObject<any>>(
  schema: () => O,
): ForeignKey<Serial, O>;
/**
 * Helper function used to declare foreign keys.
 *
 * @template T - The type of zod type used as key
 * @template O - The type of the schema to which this key references
 * @param {T} type - The zod type to be used as a key
 * @param {() => O} schema - A callback that returns the schema which this key references
 * @return {ForeignKey<Serial, O>} A branded `T` which has a property `.references` which returns the schema
 * to which the key points to.
 */
export function foreignKey<T extends z.ZodType, O extends z.ZodObject<any>>(
  type: T,
  schema: () => O,
): ForeignKey<T, O>;
export function foreignKey<T extends z.ZodType, O extends z.ZodObject<any>>(
  typeOrObj: (() => O) | T,
  obj?: () => O,
) {
  const base = (
    obj ? (typeOrObj as T) : z.int().nonnegative()
  ).brand<"ForeignKey">();
  const target = (obj ?? (typeOrObj as () => O))();
  return Object.defineProperty(base, "references", {
    value: target,
    enumerable: false,
    writable: false,
  }) as ForeignKey<T, O>;
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
