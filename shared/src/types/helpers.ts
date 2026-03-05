import z from "zod";

export type Serial = z.ZodInt;

export type PrimaryKey<T extends z.ZodType> = T & z.$brand<"PrimaryKey">;

export type ForeignKey<T extends z.ZodType, O extends z.ZodObject<any>> = T & {
  references: O;
} & z.$brand<"ForeignKey">;

export function foreignKey<T extends z.ZodInt, O extends z.ZodObject<any>>(
  obj: () => O,
): ForeignKey<z.ZodInt, O>;
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
  const target = obj ?? (typeOrObj as () => O);
  return Object.defineProperty(base, "references", {
    value: target,
    enumerable: false,
    writable: false,
  }) as ForeignKey<T, O>;
}

export function primaryKey(): PrimaryKey<Serial>;
export function primaryKey<T extends z.ZodType>(type: T): PrimaryKey<T>;
export function primaryKey<T extends z.ZodType>(type?: T) {
  return (type ?? z.int().nonnegative()).brand<"PrimaryKey">();
}
