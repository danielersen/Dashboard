# The environnement variable/secret
At first you have to know how yo edit, add or delete the environnement variable/secret.
Don't do the modifications on the Cloudflare dashboard because it's temporary on the actual build, and the modifications are deleted on the next build.
The environnement variable are manageable in the wrangler.toml file at root of the main branch.
The environnement secrets are manageable on your local terminal, that's the simplest way. Install node and then use wrangler to connect your terminal to your Cloudflare Worker. Then do the modifications by using the wrangler commands.
All the enveionnement variables and secrets are getting in src/index.js file.

# How to deploy this repository ?
(If you don't know things, ask AI to do ut properly.)

## 1) Create the worker
To create the worker, you have to go on the Cloudflare dahsboard, go in the worker part, and create a new one. You can now link your github repository, keep the deploy command "npx wrangler deploy", no command is necessary for the build, and finally keep the variable part empty for the moment.

## 2) Add the other services
### - Workers AI
### - Vectorize
### - Google drive
### - Ntfy

## 3) Set up the securities
### - Domain security (if you have one)
### - Account
### - Cloudflare's securities

## 4) Final check
 - Go in src/index.js and check if all the envieonnement variables and secrets taked are in the Cloudflare dashboard (in the worker's sertings).
 - Go on the Cloudflare dashboard, in the build history, and check if the latest deploy failed or not.
 - Go on the website, in the settings, and execute an API test.