## Dev Environment Setup for Dummies

- First make sure you have node version 24 by running `nvm install --lts`. If your system doesn't have nvm, figure out how to update node yourself.
- Node comes with npm by default but we use pnpm so do this as well: `npm i -g pnpm`
- Once that's done you can download all dependencies by running `pnpm i` in the root repo.
- To run a script you first change to either the `backend`, `frontend` or `shared` dir and run `pnpm run <NAME>` or run them for all at the same time by using `pnpm run <NAME>-all` in the root.

### Setting up .env

- Because we'll be working with secret keys in the future, the `.env` file is ignored by git. I did create a `.env.example` file with some default ports. Later this will also contain placeholders for secret data, with instructions to generate them.

- Before you can start the docker container you first need to run `cp .env.example .env` and follow the instructions to generate the secret data.

## Starting Docker Containers

- First and foremost make sure you have docker engine installed on your laptop. [Install Guide](https://docs.docker.com/engine/install/)

- Check that docker engine is running with `sudo systemctl status docker`.

- If not the case: `sudo systemctl start docker`.

### With VSCode (easy mode)

- Press `F1` to open the VSCode command prompt.
- Search for `Tasks: Run Build Tasks`, the default keyboard shortcut for this is also `F7`.
- VSCode will now open 2 terminal windows: one that starts the docker containers and another that shows the logs of both the backend and frontend in a split view.

- To shut down the containers run the VSCode command `Tasks: Run Tasks` → `docker:cleanup`.

### Via the helper scripts

- In the root directory you'll find 2 scripts: `rundev.sh` (Unix) and `rundev.bat` (Windows). Run the script that matches your OS.

- Once docker is started you can view the output of the backend/frontend by running `docker logs --tail 100 viernulvier-(backend|frontend)`.

- To shut down the containers just run `docker compose down`.

### Migrating the SQL database and inserting mock-up admin

- In order to migrate the SQL database to the docker container for the database, run `docker exec -t viernulvier-backend pnpm run migrate` or `migrate-db.sh`.

- You can add a mock-up admin by running `docker exec -t viernulvier-backend pnpm run create-admin`. The admin has username `admin` and password `password`, you can use it to login and then authorize on the protected endpoints.

(Note: we are planning to add more mock-up data and integrate the scripts into the docker containers)

## Viewing the Endpoints

- The frontend is normally served at <http://localhost:5173>. If you've changed the `FRONTEND_PORT` env variable in the `.env` file you'll need to check that for the correct port.

- The backend can be reached either via the frontend URL with the `/api/v1/` prefix, or at the default URL <http://localhost:3000>. If you've changed the `BACKEND_PORT` env variable in the `.env` file you'll need to check that for the correct port.

## Linting, Testing, and so on

- To check that your code meets the standard that will be verified by our GitHub Actions, you can run the pnpm scripts in the root repo yourself: `pnpm run check-(backend|frontend|shared|all)` — these will in turn run both the linter and the tests for your code.

- If you only want to check whether the linter passes in a given package (frontend/backend/shared), you can run `pnpm run lint` in that directory.

- If you only want to check whether the tests pass in a given package (frontend/backend), you can run `pnpm run test` in that directory.

### VSCode users only

- I recommend using the ESLint extension. It will automatically find the `eslint.config.js` files and constantly run the linter in the background, giving you more direct feedback.

## Common Problems

- If after running the docker startup you get a permission denied error, run `sudo usermod -aG docker $USER` to ensure your user has access to the docker group.
- If you're trying to use docker on WSL, it's important that you run docker engine via Docker Desktop running on your Windows. In the settings you can go to `Resources → WSL Integration` to also give the engine access to your WSL distros.
- If you try to migrate the SQL database and you get the error `MD5 checksum failed for migration`, remove the docker containers using `docker compose down -v` and start them back up.