import z from "zod";
export const serial = z.int().nonnegative;
export class ForeignKey extends z.ZodType {
    _foreignKeyRef;
    constructor(type, target) {
        super(type.brand().def);
        this._foreignKeyRef = z.lazy(target);
    }
    get references() {
        return this._foreignKeyRef;
    }
}
export function foreignKey(typeOrObj, obj) {
    const base = obj ? typeOrObj : z.int().nonnegative();
    const target = obj ?? typeOrObj;
    return new ForeignKey(base, target);
}
export function primaryKey(type) {
    return (type ?? z.int().nonnegative()).brand();
}
export const VALID_LANGUAGES = z.enum(["nl", "en", "fr"]);
export const languageMap = z
    .partialRecord(VALID_LANGUAGES, z.string())
    .refine((map) => Object.keys(map).length >= 1);
export const stringToSerial = z.codec(z.string().regex(z.regexes.integer), serial(), {
    decode: (str) => Number.parseInt(str, 10),
    encode: (num) => num.toString(),
});
export const stringToInt = z.codec(z.string().regex(z.regexes.integer), z.int(), {
    decode: (str) => Number.parseInt(str, 10),
    encode: (num) => num.toString(),
});
//# sourceMappingURL=helpers.js.map