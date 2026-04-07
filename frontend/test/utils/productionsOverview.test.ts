import { describe, it, expect } from "vitest";
import type { Event, Hall } from "@viernulvier/shared";
import {
  groupEventsByProductionId,
  summarizeProductionDates,
  distinctHallNames,
} from "@/utils/productionsOverview";

describe("productionsOverview", () => {
  it("groups and sorts events by production", () => {
    const evs = [
      {
        production: 1,
        starts_at: new Date("2010-01-02"),
      },
      {
        production: 1,
        starts_at: new Date("2010-01-01"),
      },
      { production: 2, starts_at: new Date("2009-06-01") },
    ] as Event[];
    const map = groupEventsByProductionId(evs);
    expect(map.get(1)!.map((e) => e.starts_at)).toEqual([
      new Date("2010-01-01"),
      new Date("2010-01-02"),
    ]);
    expect(map.get(2)).toHaveLength(1);
  });

  it("summarizes dates and more count", () => {
    const one = summarizeProductionDates(
      [
        {
          starts_at: new Date("2006-09-06T12:00:00Z"),
        } as Event,
      ],
      "nl",
    );
    expect(one.line).toMatch(/2006/);
    expect(one.moreCount).toBe(0);

    const many = summarizeProductionDates(
      [
        { starts_at: new Date("2006-09-06T12:00:00Z") } as Event,
        { starts_at: new Date("2006-09-07T12:00:00Z") } as Event,
      ],
      "nl",
    );
    expect(many.moreCount).toBe(1);
  });

  it("lists distinct hall names in order of first appearance", () => {
    const halls = new Map<number, Hall>([
      [
        10,
        {
          id: 10,
          name: { nl: "Zaal A", en: "Hall A" },
        } as Hall,
      ],
      [20, { id: 20, name: { nl: "Zaal B" } } as Hall],
    ]);
    const names = distinctHallNames(
      [
        { hall: 20 } as Event,
        { hall: 10 } as Event,
        { hall: 20 } as Event,
      ],
      halls,
      "nl",
    );
    expect(names).toEqual(["Zaal B", "Zaal A"]);
  });
});
