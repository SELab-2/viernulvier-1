## Database Schema (EER)

##### (Disclaimer: er zijn een aantal kleine inconsistenties tussen EER en API — de API is finaal)

Bekijk het schema visueel op https://dbdiagram.io/d/viernulvier-699b2e45bd82f5fce26f02d4 of download de svg: ![Database Schema](./database-schema.svg)
De DBML code vindt je hieronder terug.

### Uitleg

#### Production-Event-Hall
De database volgt een parent-child model. Een `production` bevat de vaste informatie over een voorstelling (titel, beschrijving, artiest, media). Een `event` is een specifieke instantie van die voorstelling op een bepaald tijdstip in een bepaalde `hall` (zaal). Eén productie kan meerdere events hebben, bv. een theatervoorstelling die drie avonden speelt.

#### Meertaligheid via JSON
Alle inhoudelijke tekstvelden (titel, beschrijvingen, info, ...) zijn JSON-kolommen die meertalige waarden bevatten: `{nl: "...", en: "..."}`. Historische data uit de CSV-import (2006–2018) zal vaak enkel een NL-waarde bevatten.

#### Metadata partial
Elke tabel bevat `created_by`, `created_at` en `updated_at` via een herbruikbaar `TablePartial`. Zo is op elk record traceerbaar wie het heeft aangemaakt en wanneer het laatst is aangepast.

#### Tagging en reeksen
Tags categoriseren producties en bundelen ze tot reeksen. Elke tag hoort bij een `tag_type` (bv. "genre", "festival", "reeks") zodat de frontend onderscheid kan maken tussen verschillende soorten tags. De relatie tussen producties en tags is veel-op-veel via de tussentabel `production_tag`: één productie kan meerdere tags hebben, en één tag kan bij meerdere producties horen.

#### Deduplicatie via vendor_id
Zowel `production`, `event` als `hall` hebben een `vendor_id` — het unieke ID uit de VIERNULVIER API. Bij de automatische synchronisatie wordt dit veld gebruikt om te controleren of een record al in de databank bestaat, zodat er geen duplicaten ontstaan.

#### Event_price
Prijsinformatie wordt per event opgeslagen in een aparte tabel, met velden zoals bedrag, beschikbaarheid en vervaldatum.

#### Image en Crop
Media-opslag is opgesplitst in twee tabellen. `Image` is het originele beeld gekoppeld aan een productie. `Crop` is een specifieke bijgesneden versie van dat beeld (bv. `hd_ready`, `FE3_header`) met een URL. Zo kunnen meerdere crops per afbeelding bestaan zonder duplicatie van metadata.

#### Custom_production_field
Een systeem voor dynamische extra velden op producties. Elk custom field heeft een type (`bool`, `number`, `string`, `json`) en de bijhorende waarde. Dit biedt flexibiliteit om later nieuwe velden toe te voegen zonder het schema aan te passen.

#### Admin
Een tabel voor CMS-gebruikers met inloggegevens. Het wachtwoord wordt gehashed opgeslagen. De `created_by` verwijzing in de metadata-partial koppelt elke wijziging in de databank aan de admin die ze uitvoerde.

#### Blog en Blogpost
De blogfunctionaliteit (nice to have) bestaat uit een `blog` als container en individuele `blogpost`s met JSON-content, koppelbaar aan producties en events uit het archief.


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
