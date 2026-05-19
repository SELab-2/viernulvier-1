## Dev Environment Setup for Dummies

- First make sure you have node version 24 by running `nvm install --lts`. If your system doesn't have nvm, figure out how to update node yourself.
- Node comes with npm by default but we use pnpm so do this as well: `npm i -g pnpm`
- Once that's done you can download all dependencies by running `pnpm i` in the root repo.
- To run a script you first change to either the `backend`, `frontend` or `shared` dir and run `pnpm run <NAME>` or run them for all at the same time by using `pnpm run <NAME>-all` in the root (not all scripts are supported this way).

### Setting up .env

- Before you can start the docker container you first need to run `cp .env.example .env` and follow the instructions in `.env` to generate the secret data.

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

### Migrating the SQL database and inserting some data

- In order to migrate the SQL database to the docker container for the database, run `docker exec -t viernulvier-backend pnpm run migrate` or `./migrate-db.sh`.

- You can add a first superadmin by running `docker exec -t viernulvier-backend pnpm run create-admin` or `./create-admin.sh`. This can then be used to login and start working in the CMS.

- The blogposts need a default blog, create this by running `docker exec -t viernulvier-backend pnpm run create-default-blog` or `create-default-blog.sh`. We were planning on categorizing blogposts by blogs, but haven't been able to implement this.

- You can add productions and events with the [legacy importer](../data/imports/README.md) or [scraper](SCRAPER.md). The legacy importer is used to import old CSV files, the scraper for importing from the database.

## Viewing the Endpoints

- The frontend is normally served at <http://localhost:5173>. If you've changed the `FRONTEND_PORT` env variable in the `.env` file you'll need to check that for the correct port.

- The backend can be reached either via the frontend URL with the `/api/v1/` prefix, or at the default URL <http://localhost:3000>. If you've changed the `BACKEND_PORT` env variable in the `.env` file you'll need to check that for the correct port.

## Linting, Testing, and so on

- To check that your code meets the standard that will be verified by our GitHub Actions, you can run the pnpm scripts in the root repo yourself: `pnpm run check-(backend|frontend|shared|all)` — these will in turn run both the linter and the tests for your code.

- If you only want to check whether the linter passes in a given package (frontend/backend/shared), you can run `pnpm run lint` in that directory.

- If you only want to check whether the tests pass and coverage threshold is reached in a given package (frontend/backend), you can run `pnpm run coverage` in that directory.

### VSCode users only

- I recommend using the ESLint extension. It will automatically find the `eslint.config.js` files and constantly run the linter in the background, giving you more direct feedback.

## Common Problems

- If after running the docker startup you get a permission denied error, run `sudo usermod -aG docker $USER` to ensure your user has access to the docker group.
- If you're trying to use docker on WSL, it's important that you run docker engine via Docker Desktop running on your Windows. In the settings you can go to `Resources → WSL Integration` to also give the engine access to your WSL distros.