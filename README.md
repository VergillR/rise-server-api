# rise-server-api

This module implements the functionality of the RISE API to the server which allows users to interact with the RISE network via HTTP(S) GET requests.

## Installation
Using npm:

`npm i rise-server-api`

Express is required to run as server, so if Express was not installed yet, also run:

`npm i express`

## Standard setup
If the server hosts a web site (i.e. serves static content, support routes and middleware), you can use the standard setup which will add the RISE interface on top of the existing routes and paths of the web site.
In Node.js, the standard way to enhance the Express app looks like:
```javascript
const RISE = require('rise-server-api')
const rise = new RISE()
app = rise.getExpressAppWithRiseAPI(app)
```

A complete implementation could look like this:

```javascript
const express = require('express')
const path = require('path')
const publicPath = path.join(__dirname, 'public')
const port = process.env.PORT || 3000

let app = express()
app.use(express.static(publicPath))

// Now add the RISE API functions to the Express app
const RISE = require('rise-server-api')
const rise = new RISE()
app = rise.getExpressAppWithRiseAPI(app)

// Now add the normal routes and functions to the Express app
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'))
})

app.get('*', (req, res) => {
  res.redirect('/')
})

app.listen(port, () => {
  console.log(`Started`)
})
```

## Minimal setup
If the server is only used as an interface to the RISE network, you can skip the standard implementation and write the entire application with just 2 lines of code:

```javascript
const { app } = new (require('rise-server-api'))({ expressApp: require('express')() })

app.listen(process.env.PORT || 3000)
```

## Testing
In case you do not have a run script ready, add inside *package.json* the following (assuming *index.js* is your entry point):
```json
"scripts": {
    "start": "node index.js"
  }
```

Run your server with

`npm run start`

Then use a browser or use curl GET from the terminal and visit the following link (replace *localhost:3000* if needed):

`localhost:3000/transactions/getUnconfirmedTransactions`

You are effectively calling from the RISE API library **transactions** the function **getUnconfirmedTransactions** via the server and the default RISE node.
The server should now send a request to the default RISE node, which responds with a JSON object (with the property **success** set to **true**) that should then be served to you. If you get an error or redirection, something went wrong.

## Using the RISE API
By default, most functions from the RISE API libraries **accounts, blocks, delegates** and **transactions** are available.
Depending on whether the function needs no arguments, single arguments (params) or a query object, HTTP(S) GET requests should be in the form:
  ```
 directory/apilibrary/function
 
 directory/apilibrary/function/params?param=100
 
 directory/apilibrary/function/query?prop1=abc&prop2=10000&prop3=99999
 ```
 
 For example:
 ```
 localhost:3000/transactions/getUnconfirmedTransactions
 
 localhost:3000/accounts/getBalance/params?address=7889374079483640385R
 
 localhost:3000/transactions/getList/query?limit=50&senderId=7889374079483640385R&and:fromHeight=1318634&and:toHeight=1318834
 ```

## Basic customization
Basic customization is done by providing the constructor an object with certain settings. Here are the settings with their default values:
```javascript
const settings = {
  // if one has a custom RISE API object (which is unlikely), it can be set here
  r = rise,  
  // set the RISE node's address here
  node = 'https://wallet.rise.vision',
  // set which API libraries should be available to the outside world
  apiLibraries = [ 'accounts', 'blocks', 'delegates', 'transactions' ],
  // set which functions from the RISE API should NOT be available; typically, functions that do not provide information should be excluded
  excludeFunctions = [ 'enable', 'toggleForging', 'put', 'get' ],
  // if set to an Express app, it will enhance that app with the RISE API functionality; primarily used for minimal setups
  expressApp = null
}
```

and then giving this object to the constructor:
```javascript
// inside a standard setup
const rise = new RISE(settings)
```
```javascript
// inside a minimal setup
const { app } = new (require('rise-server-api'))({ ...settings, expressApp: require('express')() })
```

## Advanced customization
Because the constructor returns all functionalities of the module, the module can be customized by changing a property, just like with any other object.
For example, the validation rules for the query properties and params are quite loose. One can change a validation function like:
```javascript
// inside the module's object validateQuery, lives the validation rule for the limit property of a query
// (NOTE: all queries and params entered via HTTP(S) GET requests come in as strings)
validateQuery: {
  limit: (nr) => typeof nr === 'string' && nr.match(numbersRegex) !== null
}
```
```javascript
// to change the 'limit' validation rule after importing it (for a standard setup):
const rise = new RISE()
rise.validateQuery['limit'] = (nr) => { 
  return parseInt(nr, 10) && nr.match(/^\d*$/) !== null && parseInt(nr, 10) > 0 && parseInt(nr, 10) <= 500
}
```
```javascript
// to change the 'limit' validation rule for a minimal setup:
const { app, validateQuery } = new (require('rise-server-api'))({ expressApp: require('express')() })
validateQuery['limit'] = (nr) => { 
  return parseInt(nr, 10) && nr.match(/^\d*$/) !== null && parseInt(nr, 10) > 0 && parseInt(nr, 10) <= 500
}
```
