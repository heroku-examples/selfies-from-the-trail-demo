# Pure Heroku Demo Attendee App

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/andyet/pure-heroku-demo-attendee)

## Local Development

In order to speed up local development, env vars can be written to a `.env` file instead of being requested each time the server process starts. These values are also used to build the app locally.

A helper file is included to write the necessary values to the `.env` file:

```sh
./bin/write-env $SERVER_APP_NAME
```

Then you should be able to run the server locally:

```sh
npm run dev
# or if you have nodemon installed and want to restart the server on every change
npm run nodemon
```

## Production

When starting the app in production mode, the file `src/dotenv.js` will run one synchronous request to get all the config vars from `process.env.SERVER_APP_NAME` (using `process.env.HEROKU_TOKEN` as the token) and write them all to `process.env`.

## Deploying

In order to speed up deploys, the client files are built locally by running `npm run build` and then committed to the repo. Subsequent deploys will use these committed files. This also speeds up the deploy process by allowing only the server dependencies to be specified in `dependencies` in `package.json`.

```sh
npm run build
git add dist
git commit -m "Build dist"
git push
```
