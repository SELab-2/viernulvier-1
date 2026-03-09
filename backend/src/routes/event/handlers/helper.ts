export function normalizeEventDates(value: unknown): unknown {
    if (!value || typeof value !== "object") return value;

    const payload = value as Record<string, unknown>;
    return {
        ...payload,
        starts_at: payload["starts_at"] instanceof Date ? payload["starts_at"] : new Date(String(payload["starts_at"])),
        ends_at: payload["ends_at"] instanceof Date ? payload["ends_at"] : new Date(String(payload["ends_at"])),
        doors_at: payload["doors_at"] instanceof Date ? payload["doors_at"] : new Date(String(payload["doors_at"])),
    };
}

export function normalizePartialEventDates(value: unknown): unknown {
    if (!value || typeof value !== "object") return value;

    const payload = value as Record<string, unknown>;
    return {
        ...payload,
        starts_at: payload["starts_at"] === undefined
            ? undefined
            : payload["starts_at"] instanceof Date
                ? payload["starts_at"]
                : new Date(String(payload["starts_at"])),
        ends_at: payload["ends_at"] === undefined
            ? undefined
            : payload["ends_at"] instanceof Date
                ? payload["ends_at"]
                : new Date(String(payload["ends_at"])),
        doors_at: payload["doors_at"] === undefined
            ? undefined
            : payload["doors_at"] instanceof Date
                ? payload["doors_at"]
                : new Date(String(payload["doors_at"])),
    };
}