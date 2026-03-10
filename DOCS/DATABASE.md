## Database Schema (EER)

##### (Disclaimer: there are a few minor inconsistencies between the EER and API — the API is final)

View the schema visually at https://dbdiagram.io/d/viernulvier-699b2e45bd82f5fce26f02d4 or download the svg: ![Database Schema](./database-schema.svg)
The DBML code can be found below.

### Explanation

#### Production-Event-Hall
The database follows a parent-child model. A production contains the fixed information about a show (title, description, artist, media). An event is a specific instance of that show at a particular time in a particular hall. One production can have multiple events, e.g. a theatre show running three evenings.

#### Multilingual via JSON
All content text fields (title, descriptions, info, ...) are JSON columns containing multilingual values: `{nl: "...", en: "..."}`. Historical data from the CSV import (2006–2018) will often only contain a NL value.

#### Metadata partial
Every table contains `created_by`, `created_at` and `updated_at` via a reusable `TablePartial`. This makes it traceable on every record who created it and when it was last modified.

#### Tagging and series
Tags categorize productions and bundle them into series. Each tag belongs to a `tag_type` (e.g. "genre", "festival", "series") so the frontend can distinguish between different kinds of tags. The relationship between productions and tags is many-to-many via the junction table `production_tag`: one production can have multiple tags, and one tag can belong to multiple productions.

#### Deduplication via vendor_id
`production`, `event` and `hall` all have a `vendor_id` — the unique ID from the VIERNULVIER API. During automatic synchronization this field is used to check whether a record already exists in the database, preventing duplicates.

#### Event_price
Pricing information is stored per event in a separate table, with fields such as amount, availability and expiry date.

#### Image and Crop
Media storage is split into two tables. `Image` is the original image linked to a production. `Crop` is a specific cropped version of that image (e.g. `hd_ready`, `FE3_header`) with a URL. This allows multiple crops per image to exist without duplicating metadata.

#### Custom_production_field
A system for dynamic extra fields on productions. Each custom field has a type (`bool`, `number`, `string`, `json`) and its corresponding value. This provides flexibility to add new fields later without modifying the schema.

#### Admin
A table for CMS users with login credentials. The password is stored hashed. The `created_by` reference in the metadata partial links every change in the database to the admin who made it.

#### Blog and Blogpost
The blog functionality (nice to have) consists of a blog as a container and individual blogposts with JSON content, linkable to productions and events from the archive.


### DBML code
```dbml
// Use DBML to define your database structure
// Docs: https://dbml.dbdiagram.io/docs

TablePartial metadata {

  "created_by" int [ref: > admin.id, null]
  "created_at" date
  "updated_by" int [ref: > admin.id, null]
  "updated_at" date

}

Table production {
  ~metadata
  "id" int [PK]
  "vendor_id" int 
  "box_office_id" int
  "performer_field" varchar(256) [null]
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
  "programma" json
  "info" json
  "description_short" json
  "eticket_info" json
  "custom_data" json
}

Table hall {
  ~metadata
  "id" int [PK]
  "name" varchar(64)
  "address" varchar(256)
  "vendor_id" int
  "box_office_id" int
  "seat_selection" bool // in de API is het een string met waarde "nee" of "ja"
  "open_seating" bool // idem
  "remark" json
  "space" json
}

Table event {
  ~metadata
  "id" int [PK]
  "starts_at" timestamp
  "production_id" int [ref: > production.id]
  "ends_at" timestamp
  "hall_id" int [ref: <> hall.id, not null]
  "intermission_at" timestamp
  "doors_at" varchar(64)
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

  indexes {
    (hall_id, starts_at)
  }
}

Table event_price {
  ~metadata
  "event_id" int [PK, ref: > event.id]
  "amount" varchar(32)
  "box_office_id" int [null]
  "available" int
  "contingent_id" int
  "expires_at" timestamp
  "price" json
  "rank" json
}

Table production_tag {
  ~metadata
  tag_id int [ref: > tag.id]
  production_id int [ref: > production.id]
}

Table tag {
  ~metadata
  "id" int [PK]
  "name" varchar(32) [not null]
  "type" int [ref: > tag_type.id, not null]

  indexes {
    type
  }
}

Table tag_type {
  ~metadata
  "id" int [PK]
  "name" varchar(32)
  "visible" bool // false = only visible in CMS, true = visible in CMS and public front-end
}

Enum field_types {
  "number"
  "string"
  "bool"
  "json"
}

Table image {
  ~metadata
  "id" int [PK]
  "production_id" int [ref: > production.id]
  "res" varchar(16)
}

Table crop {
  ~metadata
  "id" int [PK]
  "image_id" int [ref: > image.id]
  "url" varchar(128)
}

Table custom_production_field_definition {
  ~metadata
  "id" int [PK]
  "name" varchar(32) [unique]
  "field_type" field_types
}

Table production_custom_field {
  ~metadata
  "field_defenition_id" int [PK, ref: > custom_production_field_definition.id]
  "production_id" int [PK, ref: > production.id]
  "value_bool" bool [null]
  "value_number" numeric [null]
  "value_string" varchar(32) [null]
  "value_json" json [null]
}

Table admin {
  ~metadata
  "id" int [PK]
  "username" varchar(32)
  "password" varchar(64)
  "profile_picture" varchar(128) 
}

Table blog {
  ~metadata
  "id" int [PK]
  "name" varchar(32)
}

Table blogpost {
  ~metadata
  "id" int [PK]
  "blog_id" int [ref: > blog.id]
  "content" json
}
  "event" int [PK, ref: > event.id]
  "amount" varchar(32)
  "box_office_id" int [null]
  "available" int
  "contingent_id" int
  "expires_at" timestamp
  "price" json
  "rank" json
}


Table production_tag {
  ~metadata
  tag_id int [ref: > tag.id]
  production_id int [ref: > production.id]
}

Table tag {
  ~metadata
  "id" int [PK]
  "name" varchar(32) [not null]
  "type" int [ref: > tag_type.id, not null]

  indexes {
    type
  }
}

Table tag_type {
  ~metadata
  "id" int [PK]
  "name" varchar(32)
}

Enum field_types {
  "number"
  "string"
  "bool"
  "json"
}

Table image {
  ~metadata
  "id" int [PK]
  "prod_id" int [ref: > production.id]
  "res" varchar(16)
}

Table crop {
  ~metadata
  "id" int [PK]
  "image_id" int [ref: > image.id]
  "url" varchar(128)
}

Table custom_production_field {
  ~metadata
  "id" int [PK]
  "production_id" int [ref: > production.id]
  "field_type" field_types
  "value_bool" bool [null]
  "value_number" numeric [null]
  "value_string" varchar(32) [null]
  "value_json" json [null]
}

Table admin {
  ~metadata
  "id" int [PK]
  "username" varchar(32)
  "password" varchar(64)
  "profile_picture" varchar(128) 
}

Table blog {
  ~metadata
  "id" int [PK]
  "name" varchar(32)
}

Table blogpost {
  ~metadata
  "id" int [PK]
  "blog_id" int [ref: > blog.id]
  "content" json
}
```
