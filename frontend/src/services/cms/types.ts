import type { Admin, ProductionWithBackwardsRefs, Tag } from "@viernulvier/shared";
import type { SupportedLang } from "@/i18n";

/** Shared timing/location fields for CMS linked-event forms and rows. */
export interface CmsEventTimingFields {
  startsAt: string;
  endsAt: string;
  doorsAt: string;
  hallId: number;
  infoNl: string;
}

/** Editable event row model used in the CMS events drawer. */
export interface CmsEventGridRow extends CmsEventTimingFields {
  id: number;
  date: string;
  time: string;
  location: string;
  price: string;
}

/** Form model used by the "create linked event" modal. */
export interface CmsCreateLinkedEventForm extends CmsEventTimingFields {}

/** AG Grid row model for the CMS production table. */
export interface CmsProductionGridRow {
  id: number;
  source: ProductionWithBackwardsRefs;
  performer: string;
  title: string;
  producer: string;
  teaser: string;
  /** Primary tag id (genre). `0` means no primary tag. */
  genres: number | string;
  tags: string;
  descriptionOne: string;
  descriptionTwo: string;
  media: string;
  events: number[];
}

/** Inline-editable short text columns in AG Grid. */
export type InlineEditableField = "performer" | "title" | "producer" | "teaser";

/** Long-form fields edited via side panel. */
export interface CmsAdminGridRow {
  id: number;
  source: Admin;
  username: string;
  // profilePicture: string | null;
  super: boolean;
}

export interface CmsTagGridRow {
  id: number;
  source: Tag;
  name: string;
  tagTypeId: number;
  tagType: string;
  public: boolean;
  productionCount: number;
}

export type TagInlineEditableField = "name" | "tagType" | "public";

export interface CreateTagFormState {
  name: Record<SupportedLang, string>;
  tagTypeId: number | null;
  public: boolean;
}

export type LongField = "teaser" | "description" | "description_2";

export type CreateFieldKey =
  | "title"
  | "artist"
  | "tagline"
  | "teaser"
  | "supertitle"
  | "description"
  | "description_2";

/** Individual media item in create-production form (image or video). */
export interface CreateFormMediaItem {
  /** Unique client-side ID for tracking. */
  id: string;
  /** "image" or "video" - determines how URL is interpreted. */
  type: "image" | "video";
  /** Data URL or external URL for the media. */
  url: string;
  /** If true, media has been uploaded to the server and image ID is set. */
  isUploaded: boolean;
  /** Server-side image ID (only set after upload). */
  imageId?: number;
}

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
  /** List of media items (images and videos). */
  media: CreateFormMediaItem[];
}

export interface CreateAdminFormState {
  username: string;
  password: string;
  super: boolean;
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
