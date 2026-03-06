# VierNulVier Archive — Domain Model

## Overview

This document describes the **domain model of the VierNulVier Archive**.

The archive is a digital platform that documents cultural productions and events in Ghent. Users can browse the archive and view information about performances, artists, and events.

Administrators can manage productions and events through an admin interface.

The domain model describes the **main concepts and relationships** within this system.

---

# Main Domain Concepts

## Production

A **cultural performance or artistic production**.

Examples:
- theatre play
- dance performance
- concert
- film screening

**Main properties**

- title
- description
- teaser
- tags
- media
- additional information

**Relationships**

- a production can have multiple **events**
- a production can have multiple **tags**
- a production can have multiple **images**
- a production can contain multiple **custom fields**

---

## Event

A **specific occurrence of a production at a particular time**.

A production can take place multiple times.

**Properties**

- start date
- end date
- doors open time
- status

**Relationships**

- belongs to **one production**
- takes place at **one location**
- can have multiple **prices**

---

## Location

A physical place where events take place.

Examples:

- NTGent
- Vooruit
- concert hall

**Properties**

- name
- address
- venue information

**Relationships**

- a location can host multiple **events**

---

## EventPrice

Price information for an event.

**Properties**

- price
- available number of tickets
- expiration date

**Relationships**

- belongs to **one event**

---

## Tag

Tags are used to classify productions.

Examples:

- theatre
- classical
- dance
- festival

**Relationships**

- a tag can be linked to multiple **productions**

---

## Image

Image associated with a production.

**Relationships**

- belongs to **one production**
- can have multiple **crops**

---

## Crop

A cropped version of an image.

**Properties**

- url

**Relationships**

- belongs to **one image**

---

## CustomProductionField

An additional field that can be added to a production.

This allows flexible metadata to be added.

**Relationships**

- belongs to **one production**
- uses a **field definition**

---

## User

Visitor of the website.

Users can browse the archive.

**Capabilities**

- view productions
- view events
- search the archive

---

## Administrator (Admin)

Administrator of the archive.

**Capabilities**

- manage productions
- manage events
- manage media
- manage blogs

---

## Blog

News or articles on the website.

**Relationships**

- contains multiple **blog posts**

---

## BlogPost

Article within a blog.

**Relationships**

- belongs to **one blog**

---

# Main Relationships

| Entity | Relationship | Entity | Cardinality |
|------|------|------|------|
| Production | has | Event | 1 → 0..* |
| Event | takes place in | Location | * → 1 |
| Event | has | EventPrice | 1 → 0..* |
| Production | has | Image | 1 → 0..* |
| Image | has | Crop | 1 → 0..* |
| Production | has | Tag | * ↔ * |
| Production | has | CustomField | 1 → 0..* |
| Blog | contains | BlogPost | 1 → 0..* |
| User | views | Production | 0..* |
| User | views | Event | 0..* |
| Admin | manages | Production | 0..* |
| Admin | manages | Event | 0..* |

---

# Domain Model (Mermaid Diagram)

```mermaid
classDiagram

class Production
class Event
class Location
class EventPrice
class Tag
class Image
class Crop
class CustomProductionField
class User
class Admin
class Blog
class BlogPost

Production "1" --> "0..*" Event
Event "*" --> "1" Location
Event "1" --> "0..*" EventPrice

Production "1" --> "0..*" Image
Image "1" --> "0..*" Crop

Production "*" --> "*" Tag
Production "1" --> "0..*" CustomProductionField

Blog "1" --> "0..*" BlogPost

User --> Production : views
User --> Event : views

Admin --> Production : manages
Admin --> Event : manages
```
