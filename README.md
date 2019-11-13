# Selfies from the Trail Demo app

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/heroku-examples/selfies-from-the-trail-demo)

## Local Development

In order to speed up local development, env vars can be written to a `.env` file instead of being requested each time the server process starts.

A helper file is included to write the necessary values to the `.env` file:

```sh
./bin/write-env selfies-from-the-trail-staging
```

Then you should be able to run the server locally:

```sh
# This will start the server and webpack for the client
# which will rebuild the client on every change
npm run dev
# If you have nodemon installed and want to
# restart the server on every change as well
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

## Share Domain

The resulting images and html file (used for the Twitter Card) are uploaded and served via S3 and are publically readable.

An environment variable of `SHARE_DOMAIN` can be set to any domain name including protocol (eg `https://share.domain.net`) which will be used as the public source for all user readable images and files.

If using a custom `SHARE_DOMAIN`, that domain will have to be setup to serve files from S3 with the following structure:

`http://${BUCKET_NAME}.s3.amazonaws.com/public/${FILE_NAME}` --> `${SHARE_DOMAIN}/${FILE_NAME}`

## Client Config

The client config values are located as part of the server config values in `config/` to make it easier to edit and share values across the client/server. To ensure that no sensitive values are written to the client, the client config values are whitelisted inside `webpack.config.js`.
