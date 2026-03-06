
# VierNulVier Archief — Domeinmodel

## Overzicht

Dit document beschrijft het **domeinmodel van het VierNulVier Archief**.

Het archief is een digitaal platform dat culturele producties en evenementen in Gent documenteert. Gebruikers kunnen het archief doorzoeken en informatie bekijken over voorstellingen, artiesten en evenementen. :contentReference[oaicite:2]{index=2}

Beheerders kunnen via een adminomgeving producties en evenementen beheren.

Het domeinmodel beschrijft de **belangrijkste concepten en relaties** binnen dit systeem.

---

# Belangrijkste Domeinconcepten

## Productie

Een **culturele voorstelling of artistieke productie**.

Voorbeelden:
- theaterstuk
- dansvoorstelling
- concert
- filmvertoning

**Belangrijkste eigenschappen**

- titel
- beschrijving
- teaser
- tags
- media
- extra informatie

**Relaties**

- een productie kan meerdere **evenementen** hebben
- een productie kan meerdere **tags** hebben
- een productie kan meerdere **afbeeldingen** hebben
- een productie kan meerdere **custom velden** bevatten

---

## Evenement

Een **specifieke uitvoering van een productie op een bepaald moment**.

Een productie kan meerdere keren plaatsvinden.

**Eigenschappen**

- startdatum
- einddatum
- deuren open tijd
- status

**Relaties**

- hoort bij **één productie**
- vindt plaats op **één locatie**
- kan meerdere **prijzen** hebben

---

## Locatie

Een fysieke plaats waar evenementen plaatsvinden.

Voorbeelden:

- NTGent
- Vooruit
- concertzaal

**Eigenschappen**

- naam
- adres
- zaal informatie

**Relaties**

- een locatie kan meerdere **evenementen** hosten

---

## EventPrijs

Prijsinformatie voor een evenement.

**Eigenschappen**

- prijs
- beschikbaar aantal tickets
- vervaldatum

**Relaties**

- hoort bij **één evenement**

---

## Tag

Tags worden gebruikt om producties te classificeren.

Voorbeelden:

- theater
- klassiek
- dans
- festival

**Relaties**

- een tag kan gekoppeld zijn aan meerdere **producties**

---

## Afbeelding

Afbeelding die bij een productie hoort.

**Relaties**

- hoort bij **één productie**
- kan meerdere **crops** hebben

---

## Crop

Uitsnede van een afbeelding.

**Eigenschappen**

- url

**Relaties**

- hoort bij **één afbeelding**

---

## CustomProductieVeld

Extra veld dat aan een productie kan worden toegevoegd.

Dit laat toe om flexibel metadata toe te voegen.

**Relaties**

- hoort bij **één productie**
- gebruikt een **velddefinitie**

---

## Gebruiker

Bezoeker van de website.

Gebruikers kunnen het archief raadplegen.

**Mogelijkheden**

- producties bekijken
- evenementen bekijken
- zoeken in het archief

---

## Beheerder (Admin)

Beheerder van het archief.

**Mogelijkheden**

- producties beheren
- evenementen beheren
- media beheren
- blogs beheren

---

## Blog

Nieuws of artikels op de website.

**Relaties**

- bevat meerdere **blogposts**

---

## BlogPost

Artikel binnen een blog.

**Relaties**

- hoort bij **één blog**

---

# Belangrijkste Relaties

| Entiteit | Relatie | Entiteit | Cardinaliteit |
|--------|--------|--------|--------|
| Productie | heeft | Evenement | 1 → 0..* |
| Evenement | vindt plaats in | Locatie | * → 1 |
| Evenement | heeft | EventPrijs | 1 → 0..* |
| Productie | heeft | Afbeelding | 1 → 0..* |
| Afbeelding | heeft | Crop | 1 → 0..* |
| Productie | heeft | Tag | * ↔ * |
| Productie | heeft | CustomVeld | 1 → 0..* |
| Blog | bevat | BlogPost | 1 → 0..* |
| Gebruiker | bekijkt | Productie | 0..* |
| Gebruiker | bekijkt | Evenement | 0..* |
| Admin | beheert | Productie | 0..* |
| Admin | beheert | Evenement | 0..* |

---

# Domeinmodel (Mermaid Diagram)

```mermaid
classDiagram

class Productie
class Evenement
class Locatie
class EventPrijs
class Tag
class Afbeelding
class Crop
class CustomProductieVeld
class Gebruiker
class Admin
class Blog
class BlogPost

Productie "1" --> "0..*" Evenement
Evenement "*" --> "1" Locatie
Evenement "1" --> "0..*" EventPrijs

Productie "1" --> "0..*" Afbeelding
Afbeelding "1" --> "0..*" Crop

Productie "*" --> "*" Tag
Productie "1" --> "0..*" CustomProductieVeld

Blog "1" --> "0..*" BlogPost

Gebruiker --> Productie : bekijkt
Gebruiker --> Evenement : bekijkt

Admin --> Productie : beheert
Admin --> Evenement : beheert
