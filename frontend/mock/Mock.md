# VierNulVier Archief – Website Documentatie

## Overzicht

Het VierNulVier Archief is een digitale website die culturele producties en evenementen in Gent documenteert. De website bevat informatie over theater, dans, film, muziek en andere culturele activiteiten die doorheen de jaren plaatsvonden.

Het doel van de website is:
- Cultureel erfgoed digitaal archiveren
- Gebruikers toelaten om producties en evenementen te doorzoeken
- Informatie over artiesten, locaties en reeksen toegankelijk maken
- Administrators de mogelijkheid geven om nieuwe producties en evenementen toe te voegen of te bewerken

De website bestaat uit verschillende hoofdonderdelen:

- Homepagina
- Archief overzicht
- Productie detailpagina
- Reeks (festival/serie) detailpagina
- Zoek- en filterinterface
- Admin interface

## Mockup Links

Voor een beter begrip van de interface en de gebruikersflow van de website kan je onderstaande Figma links bekijken.

### Interactieve Demo
De interactieve demo laat toe om door de mockup te navigeren alsof het een echte website is. Dit helpt om de navigatie, pagina-overgangen en algemene gebruikerservaring te begrijpen.

**Link:**  
https://www.figma.com/proto/hEaVRZNy64S4fkTYIwgFzR/Archive-site-mockup--Visual-board-?node-id=0-1&t=lVJVFJV7LQ5pnXwc-1

### Overzicht van de Mockup
Deze link toont het volledige designbestand met alle schermen en componenten van de mockup. Hier kan je het volledige ontwerp en de structuur van de website bekijken.

**Link:**  
https://www.figma.com/design/hEaVRZNy64S4fkTYIwgFzR/Archive-site-mockup--Visual-board-?node-id=0-1&t=lVJVFJV7LQ5pnXwc-1



---



# 1. Homepagina

## Doel
De homepagina introduceert het archief en geeft gebruikers toegang tot het browsen van het archief.

## Inhoud

De pagina bevat:
- Introductietekst over het VierNulVier archief
- Algemene statistieken over het archief
- Navigatie naar het archief

Voorbeeld statistieken:
- aantal producties
- aantal jaren
- aantal reeksen

## Mogelijke acties

Gebruikers kunnen:

- Doorklikken naar het archief
- Meer informatie lezen over het archief
- Statistieken bekijken over de inhoud van de database

---

# 2. Archief Overzicht (Browse Archive)

## Doel
De archiefpagina toont een overzicht van alle producties in de database.

Elke productie wordt weergegeven als een kaart met:

- Titel
- Artiest of gezelschap
- Korte beschrijving
- Tags (genre, soort, festival)
- Locatie
- Datum of periode

## Zoekfunctionaliteit

Gebruikers kunnen zoeken via een zoekbalk.

Zoekopdrachten kunnen matchen op:
- productietitel
- artiest
- locatie
- tags

## Sorteren

De lijst kan gesorteerd worden op verschillende velden:

- titel
- artiest
- datum
- genre
- festival

Sortering kan oplopend of aflopend zijn.

## Filters

Gebruikers kunnen de resultaten filteren op:

### Festival / Reeks
Filter producties die onderdeel zijn van een bepaalde reeks.

### Locatie
Filter producties die op een specifieke locatie plaatsvinden.

### Artiest
Filter producties van een bepaalde artiest of groep.

### Genre
Filter op type voorstelling zoals:
- theater
- dans
- muziek
- film

### Datum
Filter op een specifieke datum of periode.

Dit kan via:
- jaarselectie
- kalender
- datumrange

## Mogelijke acties

Gebruikers kunnen:

- Producties bekijken
- Filters toepassen
- Zoekopdrachten uitvoeren
- Resultaten sorteren
- Doorklikken naar een productiepagina

---

# 3. Productie Detailpagina

## Doel
De detailpagina toont uitgebreide informatie over een specifieke productie.

## Inhoud

De pagina bevat:

### Basisinformatie
- titel
- artiest of gezelschap
- beschrijving
- genre
- soort
- locatie
- tags

### Evenementen
Een productie kan meerdere evenementen bevatten.

Voor elk evenement wordt getoond:

- datum
- tijd
- locatie
- prijs

Voorbeeld:
- 15/07/2024 – 20:00 – NTGent hoofdzaal – €17
- 16/07/2024 – 20:00 – NTGent hoofdzaal – €17


### Reeks informatie
Indien de productie deel uitmaakt van een reeks (bijvoorbeeld een festival), wordt deze hier vermeld.

Bijvoorbeeld:
- Gentse Feesten 2024

## Mogelijke acties

Gebruikers kunnen:

- Details van een productie bekijken
- Evenementdata bekijken
- Doorklikken naar de bijhorende reeks

---

# 4. Reeks Detailpagina

## Doel
Toont informatie over een specifieke reeks of festival.

Bijvoorbeeld:
- Gentse Feesten 2024

## Inhoud

De pagina bevat:

### Basisinformatie
- naam van de reeks
- jaar
- beschrijving

### Producties in de reeks

Een lijst met alle producties die onderdeel zijn van deze reeks.

Voor elke productie wordt getoond:

- titel
- artiest
- genre
- aantal evenementen

## Mogelijke acties

Gebruikers kunnen:

- Producties binnen de reeks bekijken
- Doorklikken naar individuele producties

---

# 5. Admin Interface

De admin interface is bedoeld voor beheerders van het archief.

Hier kunnen zij producties en evenementen beheren.

## Productie overzicht

In de adminpagina wordt een tabel getoond met alle producties.

Deze tabel werkt vergelijkbaar met een spreadsheet.

Velden kunnen rechtstreeks aangepast worden.

Voorbeelden van kolommen:

- producent
- productie
- uitvoerders
- genres
- tags
- beschrijving
- media

## Bewerken

Administrators kunnen:

- een cel aanklikken
- waarde wijzigen
- bevestigen met Enter
- navigeren met pijltjestoetsen

Wijzigingen moeten opgeslagen worden.

---

# 6. Productie Aanmaken

Administrators kunnen nieuwe producties toevoegen.

## Basisinformatie

Verplichte velden:

- titel
- artiest
- beschrijving
- tags

## Evenementen

Bij het aanmaken van een productie kunnen één of meerdere evenementen toegevoegd worden.

Voor elk evenement:

- datum
- tijd
- locatie
- prijs

Er kan een extra evenement toegevoegd worden via een knop.

---

# 7. Evenementen Beheer

Binnen de admin interface kunnen evenementen per productie beheerd worden.

Mogelijke acties:

- bestaande evenementen bekijken
- evenementen aanpassen
- nieuwe evenementen toevoegen
- evenementen verwijderen

Een evenement bevat minimaal:

- datum
- tijd
- locatie
- prijs

---

# 8. Navigatie

De website bevat een eenvoudige navigatiestructuur.

Belangrijke navigatiepunten:

- Home
- Archief
- Admin (alleen zichtbaar voor beheerders)

---

# Samenvatting

De VierNulVier archiefwebsite biedt:

- een publiek archief van culturele producties
- uitgebreide zoek- en filtermogelijkheden
- detailpagina’s voor producties en reeksen
- een admininterface voor het beheren van data

Hierdoor kunnen zowel bezoekers als beheerders efficiënt met het culturele archief werken.
