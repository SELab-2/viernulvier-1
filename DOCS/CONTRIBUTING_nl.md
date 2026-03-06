## Dev omgeving opstarten voor dummies.

- Zorg eerst dat je node versie 24 hebt door `nvm install --lts` uit te voeren. Als u systeem geen nvm heeft zoek zelf uit hoe node te updaten.
- Node komt standaard met npm maar wij gebruiken pnpm dus doe hierna ook. `npm i -g pnpm`
- Eens dit gedaan is kan je alle dependencies downloaden met door `pnpm i` in de hoofd repo uit te voeren.
- Om een scriptje te runnen verander je eerst daar ofwel `backend` of `frontend` dir en voer je `pnpm run <NAAM>` uit.

### .env opstellen

- Omdat we in de toekomst met geheime sleutels zullen werken wordt de `.env` file ge ignored door git. Ik heb wel een `.env.example` file aangemaakt met wat standaard poorten. Een later zal dit ook `<REPLACE ME>` placeholder bevatten voor geheime data.

- Voor dat je docker container kan opstarten moet je eerst dus `cp .env.example .env` uitvoeren en de missende velden invullen.

## Docker containers opstarten.

- Zorg eerst en vooral dat je docker engine op u laptop ge geïnstalleerd hebt. [Install Guide](https://docs.docker.com/engine/install/)

- Check dat docker engine aant runnen is met, `sudo systemctl status docker`.

- Indien niet het geval `sudo systemctl start docker`.

### Met vsc (easy mode)

- Druk `F1` om de command prompt van vsc open te doen.
- Zoek `Tasks: Run Build Tasks`, de standaard keyboard shortcut voor dit is ook `F7`.
- Nu zal vsc 2 terminal windows open doen 1 met die de docker containers opstart en een ander die de logs toont van zowel de backend als de frontend in een split view.

- Om de containers af te sluiten voer je het vscode commando `Tasks: Run Tasks` `docker:cleanup` uit.

### Via de helper scriptjes

- In de root directory vind je 2 scriptjes `rundev.sh`(Unix) en `rundev.bat`(Windows). Voer het scriptje uit dat bij u OS past.

- Eens docker is opgestart kan je de output van de backend/frontend zien door `docker logs --tail 100 viernulvier-(backend|frontend)` uit te voeren.

- Om de containers af te sluiten voer je gwn `docker compose down` uit.

## Het bekijken van de endpoints

- De frontend wordt normaal gezien op <http:://localhost:5173> geserveerd. Als je de env variable `FRONTEND_PORT` aangepast hebt in de `.env` file moet je die raadplegen om de juiste poort te vinden.

- De backend kan ofwel bereikt worden door het frontent url met `/api` er achter ofwel op het default url <http:://localhost:3000>. Idem dito over het veranderen van de env variable `BACKEND_PORT`.

## Linting testing en zo voort

- Om te checken dat u code de juiste standaard behaald dat zal worden gecheckt door onze github actions kan je op u eigen de pnpm scriptjes uitvoeren in de root repo. `pnpm run check-(backend|frontend|all)` deze zullen op hun beurt zowel de linter als de tests uitvoeren voor u code.

- Als je wenst enkel te checken of de linter slaagt in een gegeven package (frontend/backend) kan je in die directory `pnpm run lint` uitvoeren.

- Als je wenst enkel te checken of de testen slagen in een gegeven package (frontend/backend) kan je in die directory `pnpm run test` uitvoeren.

### Enkel voor vsc gebruikers

- Ik raad aan de eslint extension te gebruiken. die zal vanzelf de eslint.config files vinden en constant de linter in de background runnen, om u meer directe info te geven.

## Veel voorkomende problemen

- Als na het runnen van de docker startup je het probleem van permission denied krijgt voer dan `sudo usermod -aG docker $USER` uit om te zorgen dat u user toegang heeft to de docker groep.
- Als ge docker probeert te gebruiken op wsl, dan is het belangrijk dat je docker engine via docker desktop die op je windows draait. In de settings kan je dan naar `Resources -> WSL Integration` gaan om de engine ook toegang te geven tot u WSL distro's.
