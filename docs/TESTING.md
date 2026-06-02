# Developpement
For developpement, you have to do modifications on the develop branch if it's in the src folder. Then create pull requests to push the modifications on the main branch.
On the other side, if it's not in the src file, you can directly push on the main branch.

# Testing
When you edit files in the develop branch, it automatically push the modifications in the test folder (by a github action) and you can access to the website an api which use this folder by adding /test at the begin of the subpath for the website and the api. The webiste automatically use the test api at all requests.