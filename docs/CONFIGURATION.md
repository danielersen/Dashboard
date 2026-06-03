# How use this repository ?
(If you don't know things, ask AI to do ut properly.)
<br>
## The environnement variable/secret
At first you have to know how yo edit, add or delete the environnement variable/secret.
Don't do the modifications on the Cloudflare dashboard because it's temporary on the actual build, and the modifications are deleted on the next build.
The environnement variable are manageable in the wrangler.toml file at root of the main branch.
The environnement secrets are manageable on your local terminal, that's the simplest way. Install node and then use wrangler to connect your terminal to your Cloudflare Worker. Then do the modifications by using the wrangler commands.
<br>