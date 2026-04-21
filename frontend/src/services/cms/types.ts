import type { ProductionWithBackwardsRefs, Tag } from "@viernulvier/shared";
import type { SupportedLang } from "@/i18n";

/** Editable event row model used in the CMS events drawer. */
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

/** Form model used by the "create linked event" modal. */
export interface CmsCreateLinkedEventForm {
  startsAt: string;
  endsAt: string;
  doorsAt: string;
  hallId: number;
  infoNl: string;
}

/** AG Grid row model for the CMS production table. */
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

/** Inline-editable short text columns in AG Grid. */
export type InlineEditableField = "performer" | "title" | "producer" | "teaser";

/** Long-form fields edited via side panel. */
export interface CmsTagGridRow {
  id: number;
  source: Tag;
  name: string;
  tagTypeId: number;
  tagType: string;
  public: boolean;
  productionCount: number;
}

export type InlineEditableField = "performer" | "title" | "producer" | "teaser";

export type TagInlineEditableField = "name" | "tagType" | "public";

export interface CreateTagFormState {
  name: Record<SupportedLang, string>;
  tagTypeId: number | null;
  public: boolean;
}

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

/** Create-production modal form state. */
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

/** Side panel editor state for long-form multilingual content. */
export interface EditorPanelState {
  rowId: number;
  apiField: LongField;
  label: string;
  values: Record<SupportedLang, string>;
}

/** Declarative config for rendering create modal field blocks. */
export interface CmsCreateFieldConfig {
  key: CreateFieldKey;
  labelKey: string;
  required: boolean;
  multiline: boolean;
}
