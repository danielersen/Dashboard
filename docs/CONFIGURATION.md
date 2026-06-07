# The environnement variable/secret
At first you have to know how yo edit, add or delete the environnement variable/secret.
Don't do the modifications on the Cloudflare dashboard because it's temporary on the actual build, and the modifications are deleted on the next build.
The environnement variable are manageable in the wrangler.toml file at root of the main branch.
The environnement secrets are manageable on your local terminal, that's the simplest way. Install node and then use wrangler to connect your terminal to your Cloudflare Worker. Then do the modifications by using the wrangler commands.

# How to deploy this repository ?
(If you don't know things, ask AI to do ut properly.)

## 1) Create the worker
To create the worker, you have to go on the Cloudflare dahsboard, go in the worker part, and create a new one. You can now link your github repository, keep the deploy command "npx wrangler deploy", no command is necessary for the build, and finally keep the variable part empty for the moment.

## 2) Add the other services
### - Workers AI
No manually add needed anymore, the project and Cloudflare will automatically link Workers AI.
### - AI Gateway
No manually add needed too.
### - Cloudflare workflow
No manually add needed too !
### - Google drive
### - Ntfy
Create a name for your topic ntfy, an hard name. Then install ntfy on your phone, create a new topic, and write the name. After that create an environnement secret named NYFY_URL and tap the same name.

## 3) Set up the securities
### - Domain security (if you have a domain)
### - Account
### - Cloudflare's securities

## 4) Final check
 - Go on the Cloudflare dashboard, in the build history, and check if the latest deploy failed or not.
 - Go on Cloudflare, in the workflows, and execute the API test.