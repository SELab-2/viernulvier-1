import z from "zod";
export type Serial = z.ZodInt;
export declare const serial: (params?: string | z.z.core.$ZodCheckGreaterThanParams) => z.ZodInt;
export type PrimaryKey<T extends z.ZodType> = T & z.$brand<"PrimaryKey">;
type RecursionHelper<O extends z.ZodType> = z.ZodType<{
    [Key in keyof z.output<O>]: z.output<O>[Key] extends ForeignKey<any, any> ? ForeignKey<any, any> : z.output<O>[Key];
}>;
export declare class ForeignKey<O extends z.ZodType, T extends z.ZodType = Serial> extends z.ZodType {
    private _foreignKeyRef;
    constructor(type: T, target: () => O);
    get references(): z.ZodType<RecursionHelper<O>>;
}
/**
 * Helper function used to declare foreign keys.
 *
 * @typeParam O - The type of the schema to which this key references
 * @param schema - A callback that returns the schema which this key references
 * @returns A branded `z.int().nonnegative()` which has a property `.references` which
 * returns the schema to which the key points to.
 */
export declare function foreignKey<O extends z.ZodObject>(schema: () => O): ForeignKey<O>;
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
export declare function foreignKey<T extends z.ZodType, O extends z.ZodObject>(type: T, schema: () => O): ForeignKey<O, T>;
/**
 * A helper function used to declare a primary key.
 *
 * @returns A branded `z.int().nonnegative()`
 */
export declare function primaryKey(): PrimaryKey<Serial>;
/**
 * A helper function used to declare a primary key.
 *
 * @param type - The type of zod type used as key
 * @returns A branded `T`
 */
export declare function primaryKey<T extends z.ZodType>(type: T): PrimaryKey<T>;
export declare const VALID_LANGUAGES: z.ZodEnum<{
    nl: "nl";
    en: "en";
    fr: "fr";
}>;
export declare const languageMap: z.ZodRecord<z.ZodEnum<{
    nl: "nl";
    en: "en";
    fr: "fr";
}> & z.z.core.$partial, z.ZodString>;
export declare const stringToSerial: z.ZodCodec<z.ZodString, z.ZodInt>;
export declare const stringToInt: z.ZodCodec<z.ZodString, z.ZodInt>;
export {};
//# sourceMappingURL=helpers.d.ts.map