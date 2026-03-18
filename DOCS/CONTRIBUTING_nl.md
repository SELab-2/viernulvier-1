## Dev Omgeving Opzetten voor Dummies

- Zorg er eerst voor dat je Node versie 24 hebt door `nvm install --lts` uit te voeren. Als je systeem geen nvm heeft, zoek dan zelf uit hoe je Node kunt updaten.
- Node komt standaard met npm, maar wij gebruiken pnpm, dus doe ook dit: `npm i -g pnpm`
- Daarna kun je alle dependencies downloaden door `pnpm i` uit te voeren in de root van de repo.
- Om een script uit te voeren ga je eerst naar de map `backend`, `frontend` of `shared` en voer je `pnpm run <NAAM>` uit, of je draait ze allemaal tegelijk met `pnpm run <NAAM>-all` vanuit de root.

### .env instellen

- Omdat we in de toekomst met geheime sleutels zullen werken, wordt het `.env`-bestand genegeerd door git. Er is wel een `.env.example`-bestand aangemaakt met een aantal standaardpoorten. Later zal dit ook tijdelijke aanduidingen voor geheime gegevens bevatten, met instructies om deze te genereren.

- Voordat je de Docker-container kunt starten, moet je eerst `cp .env.example .env` uitvoeren en de instructies volgen om de geheime gegevens te genereren.

## Docker Containers Starten

- Zorg er allereerst voor dat Docker Engine op je laptop is geïnstalleerd. [Installatiegids](https://docs.docker.com/engine/install/)

- Controleer of Docker Engine actief is met `sudo systemctl status docker`.

- Als dat niet het geval is: `sudo systemctl start docker`.

### Met VSCode (makkelijke modus)

- Druk op `F1` om de VSCode-opdrachtprompt te openen.
- Zoek naar `Tasks: Run Build Tasks`, de standaard sneltoets hiervoor is ook `F7`.
- VSCode opent nu 2 terminalvensters: één dat de Docker-containers start en een ander dat de logs van zowel de backend als de frontend in een gesplitste weergave toont.

- Om de containers af te sluiten voer je de VSCode-opdracht `Tasks: Run Tasks` → `docker:cleanup` uit.

### Via de hulpscripts

- In de root-map vind je 2 scripts: `rundev.sh` (Unix) en `rundev.bat` (Windows). Voer het script uit dat bij jouw besturingssysteem past.

- Zodra Docker is gestart, kun je de uitvoer van de backend/frontend bekijken met `docker logs --tail 100 viernulvier-(backend|frontend)`.

- Om de containers af te sluiten voer je gewoon `docker compose down` uit.

### SQL-database migreren en nep-beheerder aanmaken

- Om de SQL-database naar de Docker-container te migreren, voer je `docker exec -t viernulvier-backend pnpm run migrate` uit, of gebruik je `migrate-db.sh`.

- Je kunt een nep-beheerder toevoegen door `docker exec -t viernulvier-backend pnpm run create-admin` uit te voeren. De beheerder heeft gebruikersnaam `admin` en wachtwoord `password`; je kunt hiermee inloggen en vervolgens autoriseren op de beveiligde endpoints.

*(Opmerking: we zijn van plan om meer nepdata toe te voegen en de scripts te integreren in de Docker-containers)*

## Endpoints Bekijken

- De frontend is normaal beschikbaar op <http://localhost:5173>. Als je de omgevingsvariabele `FRONTEND_PORT` in het `.env`-bestand hebt gewijzigd, controleer dan daar de juiste poort.

- De backend is bereikbaar via de frontend-URL met het voorvoegsel `/api/v1/`, of op de standaard-URL <http://localhost:3000>. Als je de omgevingsvariabele `BACKEND_PORT` in het `.env`-bestand hebt gewijzigd, controleer dan daar de juiste poort.

## Linting, Testen, enzovoort

- Om te controleren of je code voldoet aan de standaard die wordt geverifieerd door onze GitHub Actions, kun je de pnpm-scripts in de root van de repo zelf uitvoeren: `pnpm run check-(backend|frontend|shared|all)` — deze voeren op hun beurt zowel de linter als de tests uit voor je code.

- Als je alleen wilt controleren of de linter slaagt in een bepaald pakket (frontend/backend/shared), kun je `pnpm run lint` uitvoeren in die map.

- Als je alleen wilt controleren of de tests slagen in een bepaald pakket (frontend/backend), kun je `pnpm run test` uitvoeren in die map.

### Alleen voor VSCode-gebruikers

- Ik raad aan de ESLint-extensie te gebruiken. Deze vindt automatisch de `eslint.config.js`-bestanden en voert de linter continu op de achtergrond uit, waardoor je directere feedback krijgt.

## Veelvoorkomende Problemen

- Als je na het starten van Docker een foutmelding krijgt over geweigerde toegang, voer dan `sudo usermod -aG docker $USER` uit om ervoor te zorgen dat je gebruiker toegang heeft tot de Docker-groep.
- Als je Docker probeert te gebruiken op WSL, is het belangrijk dat je Docker Engine uitvoert via Docker Desktop op je Windows. In de instellingen kun je naar `Resources → WSL Integration` gaan om de engine ook toegang te geven tot je WSL-distributies.
- Als je de SQL-database probeert te migreren en de foutmelding `MD5 checksum failed for migration` krijgt, verwijder dan de Docker-containers met `docker compose down -v` en start ze opnieuw op.