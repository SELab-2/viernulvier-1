import type { Admin, ProductionWithBackwardsRefs } from "@viernulvier/shared";
import type { SupportedLang } from "@/i18n";

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

export interface CmsAdminGridRow {
  id: number;
  source: Admin;
  username: string;
  // profilePicture: string | null;
  super: boolean;
}

export type InlineEditableField = "performer" | "title" | "producer" | "teaser";

export type LongField = "teaser" | "description" | "description_2" | "video_1";

export type CreateFieldKey =
  | "title"
  | "artist"
  | "tagline"
  | "teaser"
  | "supertitle"
  | "description"
  | "description_2"
  | "video_1"
  | "video_2";

export interface CreateFormState {
  finalized: boolean;
  title: Record<SupportedLang, string>;
  artist: Record<SupportedLang, string>;
  tagline: Record<SupportedLang, string>;
  teaser: Record<SupportedLang, string>;
  supertitle: Record<SupportedLang, string>;
  description: Record<SupportedLang, string>;
  description_2: Record<SupportedLang, string>;
  video_1: Record<SupportedLang, string>;
  video_2: Record<SupportedLang, string>;
}

export interface CreateAdminFormState {
  username: string;
  password: string;
  super: boolean;
}

export interface EditorPanelState {
  rowId: number;
  apiField: LongField;
  label: string;
  values: Record<SupportedLang, string>;
}

export interface CmsCreateFieldConfig {
  key: CreateFieldKey;
  labelKey: string;
  required: boolean;
  multiline: boolean;
}
