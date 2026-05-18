## Database Schema (EER)

##### (This documentation is generated from the live PostgreSQL schema. Minor inconsistencies between EER and the external VIERNULVIER API may exist — the API is the source of truth for vendor data.)

View the schema visually at https://dbdiagram.io/d/viernulvier-699b2e45bd82f5fce26f02d4 or download the svg: ![Database Schema](./database-schema.svg)
The DBML code can be found below.

### Explanation

#### Production-Event-Hall
The database follows a parent-child model. A `production` contains the fixed information about a show (title, description, artist, media). An `event` is a specific instance of that show at a particular time in a particular `hall`. One production can have multiple events, e.g. a theatre show running three evenings. `event.production` is nullable (an event may exist before being linked to a production), while `event.hall` is required.

#### Multilingual via JSON
All content text fields (title, descriptions, info, names of halls/tags/blogs, ...) are `jsonb` columns containing multilingual values: `{nl: "...", en: "..."}`. Historical data from the CSV import (2006–2018) will often only contain a NL value.

#### Metadata inheritance
Every content table inherits from a shared `metadata` parent table (PostgreSQL `INHERITS`), which provides `created_at`, `updated_at`, `created_by` and `updated_by`. This makes it traceable on every record who created it and when it was last modified. The `crop` table does not inherit from `metadata` — instead it declares the same four columns directly, because crops are managed alongside images at the storage layer rather than through the CMS.

#### Tagging and series
Tags categorize productions and bundle them into series. Each `tag` belongs to a `tag_type` (e.g. "genre", "festival", "series") so the frontend can distinguish between different kinds of tags. Visibility is set per tag via the `public` boolean (`false` = CMS-only, `true` = visible on the public front-end). The relation between productions and tags is many-to-many via the junction table `production_tag`: one production can have multiple tags, and one tag can belong to multiple productions. A tag name is unique within its `tag_type` (`unique_tag_per_type`).

#### Deduplication via vendor_id and old_id
`production`, `event` and `event_price` carry a `vendor_id` — the unique ID from the VIERNULVIER ticketing API — which is used during automatic synchronization to avoid creating duplicates. In addition, `production`, `event`, `event_price`, `hall`, `image`, `crop` and `tag` carry an `old_id` (UNIQUE). `old_id` references the primary key of the same record in the legacy archive system, so that the historical CSV import (2006–2018) can be re-run or reconciled without producing duplicates.

#### Event_price
Pricing information is stored per event in a separate table, with fields such as amount, availability, price (multilingual jsonb) and expiry date. One event can have multiple price rows (e.g. standard / reduced / under-26).

#### Image and Crop
Media storage is split into two tables. `image` is the original image linked to a production. `crop` is a specific cropped version of that image (e.g. `hd_ready`, `FE3_header`) with a URL and a `type` label. The URL must be a path under `/media/crops/` (enforced by the `is_path` CHECK constraint). This allows multiple crops per image without duplicating metadata.

#### Custom production fields
A system for dynamic extra fields on productions:
- `custom_production_field_definition` defines an extra field (name + type) where `type` is one of the enum `field_types` (`number`, `string`, `bool`, `json`). A `UNIQUE (id, type)` constraint allows the type to be referenced from `production_custom_field` as a composite FK.
- `production_custom_field` stores the value for a (definition, production) pair. It has four typed value columns (`value_bool`, `value_number`, `value_string`, `value_json`) and a `check_data_type` CHECK constraint that enforces exactly one of them is set, and that it matches `type`.

This provides flexibility to add new fields later without modifying the schema.

#### Admin
A table for CMS users with login credentials. The password is stored hashed (bcrypt, 72 chars). `profile_picture_url` is validated by the `is_url` CHECK constraint (must match an `http(s)://…` URL). The `super` boolean marks a super admin, which can fetch, create, edit and delete other admins. The `created_by` / `updated_by` references on the inherited `metadata` columns link every change in the database back to the admin who made it (set to NULL when the admin is deleted).

#### Blog, Blogpost and Production_blogpost
The blog functionality consists of a `blog` as a container and individual `blogpost`s with multilingual `title` and `content` (jsonb) and an optional `published_at` timestamp. The junction table `production_blogpost` lets a single blogpost be linked to multiple productions (and vice versa), so an editorial blogpost can reference any production from the archive.

#### Migrations
The `migrations` table is managed by the migration runner (see `backend/migrations/`) and tracks which numbered `.sql` files have been applied. It is not part of the application data model.


### DBML code
```dbml
// Use DBML to define your database structure
// Docs: https://dbml.dbdiagram.io/docs

TablePartial metadata {
  "created_by" int [ref: > admin.id, null]
  "created_at" timestamptz
  "updated_by" int [ref: > admin.id, null]
  "updated_at" timestamptz
}

Enum field_types {
  "number"
  "string"
  "bool"
  "json"
}

Table admin {
  ~metadata
  "id" int [PK]
  "username" varchar(32) [unique, not null]
  "password" varchar(72) [not null]
  "profile_picture_url" varchar(2048) // CHECK: must match http(s) URL pattern
  "super" bool [default: false, not null]
}

Table production {
  ~metadata
  "id" int [PK]
  "vendor_id" int
  "box_office_id" int
  "performer_field" varchar(256)
  "performer_type" varchar(64)
  "attendance_mode" varchar(64)
  "supertitle" json
  "title" json [not null]
  "artist" json
  "meta_title" json
  "meta_description" json
  "tagline" json
  "teaser" json
  "description" json
  "description_extra" json
  "description_2" json
  "video_1" json
  "video_2" json
  "quote" json
  "quote_source" json
  "programme" json
  "info" json
  "description_short" json
  "eticket_info" json
  "custom_data" json
  "old_id" int [unique]
  "finalized" bool [default: false]
}

Table hall {
  ~metadata
  "id" int [PK]
  "name" json [not null]
  "address" varchar(256)
  "old_id" int [unique]
}

Table event {
  ~metadata
  "id" int [PK]
  "production" int [ref: > production.id] // ON DELETE CASCADE
  "hall" int [ref: > hall.id, not null]   // ON DELETE RESTRICT
  "starts_at" timestamptz
  "ends_at" timestamptz
  "intermission_at" timestamptz
  "doors_at" timestamptz
  "box_office_id" int
  "vendor_id" int
  "max_tickets_per_order" int
  "uitdatabank_id" int
  "secure" bool
  "sms_verification" bool
  "status" json
  "info" json
  "eticket_info" json
  "external_order_url" json
  "order_url" varchar(256)
  "old_id" int [unique]

  indexes {
    (hall, starts_at)   // idx_event_hall_starts_at
    (production, id)    // idx_event_production_id
  }
}

Table event_price {
  ~metadata
  "id" int [PK]
  "event" int [ref: > event.id] // ON DELETE CASCADE
  "amount" varchar(32)
  "box_office_id" int
  "available" int
  "contingent_id" int
  "expires_at" timestamptz
  "price" json
  "rank" json
  "old_id" int [unique]
}

Table tag_type {
  ~metadata
  "id" int [PK]
  "name" json [unique, not null]
}

Table tag {
  ~metadata
  "id" int [PK]
  "name" json [not null]
  "public" bool [default: false, not null] // false = CMS-only, true = public front-end
  "tag_type" int [ref: > tag_type.id, not null] // ON DELETE CASCADE
  "old_id" int [unique]

  indexes {
    tag_type                    // idx_tag_tag_type
    (name, tag_type) [unique]   // unique_tag_per_type
  }
}

Table production_tag {
  ~metadata
  "production" int [PK, ref: > production.id] // ON DELETE CASCADE
  "tag"        int [PK, ref: > tag.id]        // ON DELETE CASCADE

  indexes {
    tag   // idx_prod_tag_tag
  }
}

Table image {
  ~metadata
  "id" int [PK]
  "production" int [ref: > production.id, not null] // ON DELETE CASCADE
  "res" varchar(16)
  "old_id" int [unique]

  indexes {
    production   // idx_image_production
  }
}

Table crop {
  // crop does NOT inherit from metadata, but declares the same four columns directly
  "id" int [PK]
  "image" int [ref: > image.id, not null] // ON DELETE CASCADE
  "url" varchar(2048) [not null]           // CHECK: must match ^/media/crops/.+$
  "type" varchar(32) [not null]
  "created_by" int [ref: > admin.id, null]
  "created_at" timestamptz
  "updated_by" int [ref: > admin.id, null]
  "updated_at" timestamptz
  "old_id" int [unique]

  indexes {
    image   // idx_crop_image
  }
}

Table custom_production_field_definition {
  ~metadata
  "id" int [PK]
  "name" varchar(64) [not null]
  "type" field_types [not null]

  indexes {
    (id, type) [unique]   // unique_type_per_id — allows composite FK from production_custom_field
  }
}

Table production_custom_field {
  ~metadata
  "field_definition_id" int [PK]
  "production"          int [PK, ref: > production.id] // ON DELETE CASCADE
  "type" field_types [not null]
  "value_bool"   bool
  "value_number" numeric
  "value_string" text
  "value_json"   json

  // Composite FK: (field_definition_id, type) -> custom_production_field_definition(id, type), ON DELETE CASCADE
  // CHECK check_data_type: exactly one value_* column is non-null, matching `type`.
  indexes {
    production   // idx_pcf_production
  }
}

Table blog {
  ~metadata
  "id" int [PK]
  "name" json [not null, default: `'{}'`]
  "description" json
}

Table blogpost {
  ~metadata
  "id" int [PK]
  "blog" int [ref: > blog.id, not null]  // ON DELETE CASCADE
  "title" json [not null, default: `'{}'`]
  "content" json [not null, default: `'{}'`]
  "published_at" timestamptz

  indexes {
    blog   // idx_blogpost_blog
  }
}

Table production_blogpost {
  ~metadata
  "production" int [PK, ref: > production.id] // ON DELETE CASCADE
  "blogpost"   int [PK, ref: > blogpost.id]   // ON DELETE CASCADE

  indexes {
    blogpost   // idx_production_blogpost_blogpost
  }
}
```
