# The places of developpement
For developpement, you have to do modifications on the develop branch if it's in the src folder. On the other side, if it's not in the src file, you can directly push on the main branch.

# The place of tests
When you do modifications on develop branch, it automatically pushes the modifications in the test folder (by a github action) and you can access to the website an api which use this folder by adding /test at the begin of the subpath for the website and the api. The webiste automatically use the test api at all requests.
To test the API you can execute the workflow configured earlier.

# The ways to push to production
When your'e satisfied of your modifications, and you want to pushes the modifications on production, create a pull requests from develop branch to main branch. With the wrangler.toml and the modifications detected by Cloudflare, it automatically rebuild all the project neatly. It's optional, but it's better to create a github tag to have a clear project.