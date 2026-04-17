import type { ProductionWithBackwardsRefs } from "@viernulvier/shared";

export interface CmsEventGridRow {
  id: number;
  date: string;
  time: string;
  location: string;
  price: string;
  startsAt: string;
  endsAt: string;
  doorsAt: string;
  hallId: number;
  infoNl: string;
}

export interface CmsCreateLinkedEventForm {
  startsAt: string;
  endsAt: string;
  doorsAt: string;
  hallId: number;
  infoNl: string;
}

export interface CmsProductionGridRow {
  id: number;
  source: ProductionWithBackwardsRefs;
  performer: string;
  title: string;
  producer: string;
  teaser: string;
  genres: string;
  tags: string;
  descriptionOne: string;
  descriptionTwo: string;
  media: string;
  events: number[];
}
