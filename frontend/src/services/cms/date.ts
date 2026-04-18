export function toLocalDateTimeInput(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function toIsoStringFromLocalInput(value: string): string {
  return new Date(value).toISOString();
}
