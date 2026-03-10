
# VierNulVier Archive – Website Documentation

## Overview

The VierNulVier Archive is a  website that shows the collection of past cultural events organised by VIERNULVIER.

The purpose of the website is to:

- Digitally archive cultural heritage
- Allow users to search productions and events
- Provide access to information about artists, locations, and series
- Allow administrators to add or edit productions and events

The website consists of several main sections:

- Homepage
- Archive overview
- Production detail page
- Series (festival/collection) detail page
- Search and filtering interface
- Admin interface

---

## Mockup Links

To better understand the interface and user flow of the website, the following Figma links can be used.

### Interactive Demo

The interactive demo allows navigation through the mockup as if it were a real website. This helps to understand the navigation, page transitions, and overall user experience.

**Link:**  
https://www.figma.com/proto/hEaVRZNy64S4fkTYIwgFzR/Archive-site-mockup--Visual-board-?node-id=0-1&t=lVJVFJV7LQ5pnXwc-1

### Mockup Overview

This link shows the full design file with all screens and components of the mockup. It allows viewing the complete design and structure of the website.

**Link:**  
https://www.figma.com/design/hEaVRZNy64S4fkTYIwgFzR/Archive-site-mockup--Visual-board-?node-id=0-1&t=lVJVFJV7LQ5pnXwc-1

---

# 1. Homepage

## Purpose

The homepage introduces the archive and provides users access to browse the archive.

## Content

The page contains:

- Introductory text about the VierNulVier archive
- General statistics about the archive
- Navigation to the archive

Example statistics:

- number of productions
- number of years
- number of series

## Possible actions

Users can:

- Navigate to the archive
- Read more information about the archive
- View statistics about the contents of the database

---

# 2. Archive Overview (Browse Archive)

## Purpose

The archive page displays an overview of all productions in the database.

Each production is shown as a card containing:

- Title
- Artist or group
- Short description
- Tags (genres, types, festivals ...)
- Location
- Date or period

## Search functionality

Users can search using a search bar.

Search queries can match:

- production title
- artist
- location
- tags

## Sorting

The list can be sorted by different fields:

- title
- artist
- date
- location
- tag categories (genre, festival,...)

Sorting can be ascending or descending.

## Filters

Users can filter results by:

### Tags of Productions

Filter productions that belong to a specific **series or festival**.

Filtering in the archive is based on **tags and tag categories**.  
The mockups currently show examples such as **genre, type, and festival**, but the system is not limited to these categories.

An administrators can create **new tag categories and tags**, and users will be able to filter productions using any of those categories.

### Location
Filter productions that take place at a specific location.

### Artist
Filter productions by a specific artist or group.

### Date
Filter by a specific date or period.

This can be done through:

- year selection
- calendar
- date range

## Possible actions

Users can:

- View productions
- Apply filters
- Perform search queries
- Sort results
- Navigate to a production page

---

# 3. Production Detail Page

## Purpose

The detail page shows detailed information about a specific production.

## Content

The page contains:

### Basic information

- title
- artist or group
- description
- genre
- type
- location
- tags

### Events

A production can contain multiple events.

For each event the following is shown:

- date
- time
- location
- price

### Series information

If the production is part of a series (for example a festival), this is shown here.

Example:

- Gentse Feesten 2024

## Possible actions

Users can:

- View details of a production
- View event dates
- Navigate to the related series

---

# 4. Series Tag

## Purpose

In the database structure, festivals or series are represented as **tags** within a tag category (for example the "festival" category).

A series is therefore essentially a **collection of productions that share a specific tag**.

Because tags do not currently contain additional metadata such as descriptions, the series page can be interpreted as a **filtered archive view** showing productions associated with that tag.

Example:

- Gentse Feesten 2024


## Possible actions

Users can:

- Filter productions on series

---

# 5. Admin Interface

The admin interface is intended for archive administrators.

Here they can manage productions and events.

## Production overview

The admin page displays a table containing all productions.

This table works similarly to a spreadsheet.

Fields can be edited directly.

Example columns:

- producer
- production
- performers
- genres
- tags
- description
- media

## Editing

Administrators can:

- click a cell
- modify the value
- confirm with Enter
- navigate with arrow keys

Changes must be saved.

---

# 6. Creating a Production

Administrators can add new productions.

## Basic information

Required fields:

- title
- artist
- description
- tags

## Events

When creating a production, one or more events can be added.

For each event:

- date
- time
- location
- price

Additional events can be added using a button.

---

# 7. Event Management

Within the admin interface, events can be managed per production.

Possible actions:

- view existing events
- edit events
- add new events
- delete events

An event contains at minimum:

- date
- time
- location
- price

---

## 8. Tag and Category Management

Administrators can also manage the tagging system used throughout the archive.

This includes the ability to:

- create new **tags**
- create new **tag categories**
- edit or remove existing tags
- assign tags to productions

---

## 9. Bulk Editing

The admin interface supports **bulk editing**, allowing administrators to edit multiple productionsefficiently from a grid interface.

This grid behaves similarly to a spreadsheet (such as Excel):

- each production is displayed as a row
- fields such as producer, performers, genres, tags and descriptions appear as columns
- administrators can click a cell to edit its value directly
- changes can be confirmed using **Enter**
- navigation between cells is possible using the **arrow keys**

Because edits are made directly inside the table, administrators can quickly update multiple productions in sequence without opening separate edit pages.

For each production, administrators can also open and manage the associated **events**, where they can:

- view existing events
- edit event information
- add new events
- delete events

All modifications must be **saved** once editing is complete.



---

# 10. Navigation

The website contains a simple navigation structure.

Important navigation elements:

- Home
- Archive
- Admin (visible only to administrators)

---

# Summary

The VierNulVier archive website provides:

- a public archive of cultural productions
- extensive search and filtering options
- detailed pages for productions and series
- an admin interface for managing data

This allows both visitors and administrators to efficiently work with the cultural archive.
