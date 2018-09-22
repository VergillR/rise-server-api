const express = require('express')
const rise = require('risejs').rise
const riseRegex = /^\d{15,30}R$/i
const numbersRegex = /^\d*$/

module.exports = class {
  /**
   * @constructor
   * @param {{ r: object, node: string, apiLibraries: string[], excludeFunctions: string[], basePathName: string, alwaysSendQuery: boolean, expressApp: object } settings Setup the connection and set which part of the RISE API should interact with HTTP(S) GET
   */
  constructor ({ r = rise, node = 'https://wallet.rise.vision', apiLibraries = [ 'accounts', 'blocks', 'delegates', 'transactions' ], excludeFunctions = [ 'enable', 'toggleForging', 'put', 'get' ], basePathName = '', alwaysSendQuery = true, expressApp = null } = {}) {
    this.r = r
    this.node = node
    this.r.nodeAddress = this.node
    this.riseAPI = apiLibraries
    // incoming path query properties are always strings, the check if the prop is a string is thus to exclude undefined props; if the prop is supposed to represent a number, use the numbersRegex
    this.validateQuery = {
      'blockId': (numbersAsString) => typeof numbersAsString === 'string' && numbersAsString.match(numbersRegex) !== null,
      'and:blockId': (numbersAsString) => typeof numbersAsString === 'string' && numbersAsString.match(numbersRegex) !== null,
      'type': (nr) => typeof nr === 'string' && nr.match(numbersRegex) !== null,
      'and:type,': (nr) => typeof nr === 'string' && nr.match(numbersRegex) !== null,
      'senderId': (address) => typeof address === 'string' && address.match(riseRegex) !== null,
      'and:senderId': (address) => typeof address === 'string' && address.match(riseRegex) !== null,
      'recipientId': (address) => typeof address === 'string' && address.match(riseRegex) !== null,
      'and:recipientId': (address) => typeof address === 'string' && address.match(riseRegex) !== null,
      'fromHeight': (nr) => typeof nr === 'string' && nr.match(numbersRegex) !== null,
      'and:fromHeight': (nr) => typeof nr === 'string' && nr.match(numbersRegex) !== null,
      'toHeight': (nr) => typeof nr === 'string' && nr.match(numbersRegex) !== null,
      'and:toHeight': (nr) => typeof nr === 'string' && nr.match(numbersRegex) !== null,
      'fromUnixTime': (nr) => typeof nr === 'string' && nr.match(numbersRegex) !== null,
      'and:fromUnixTime': (nr) => typeof nr === 'string' && nr.match(numbersRegex) !== null,
      'toUnixTime': (nr) => typeof nr === 'string' && nr.match(numbersRegex) !== null,
      'and:toUnixTime': (nr) => typeof nr === 'string' && nr.match(numbersRegex) !== null,
      'limit': (nr) => typeof nr === 'string' && nr.match(numbersRegex) !== null,
      'offset': (nr) => typeof nr === 'string' && nr.match(numbersRegex) !== null,
      'orderBy': (text) => typeof text === 'string'
    }
    // incoming path params are always strings, the check if the param is a string is thus to exclude undefined params; if the param is supposed to represent a number, use the numbersRegex
    this.validateParams = {
      'id': (numbersAsString) => typeof numbersAsString === 'string' && numbersAsString.match(numbersRegex) !== null,
      'address': (address) => address.match(riseRegex) !== null,
      'publicKey': (publicKey) => typeof publicKey === 'string',
      'username': (name) => typeof name === 'string',
      'limit': (nr) => typeof nr === 'string' && nr.match(numbersRegex) !== null,
      'param': (publicKey) => typeof publicKey === 'string',
      'key': (key) => typeof key === 'string',
      'value': (val) => typeof val === 'string'
    }
    const fns = this.excludeUnwantedFunctionsFromAPI(apiLibraries, excludeFunctions)
    this.riseFullAPI = apiLibraries.map((val, index) => [apiLibraries[index], fns[index]])
    this.basePathName = basePathName
    this.alwaysSendQuery = alwaysSendQuery
    this.app = (expressApp && typeof expressApp === 'function') ? this.getExpressAppWithRiseAPI(expressApp) : undefined
    this.getExpressAppWithRiseAPI = this.getExpressAppWithRiseAPI
    this.excludeUnwantedFunctionsFromAPI = this.excludeUnwantedFunctionsFromAPI
    return this
  }

  /**
   * Exclude certain functions from the Rise API Libraries so they cannot be called by the outside world
   * @param {string[]} apiLibraries Rise API Libraries needed by the user
   * @param {string[]} excludeFunctions Functions that should not be accessible to the outside world
   */
  excludeUnwantedFunctionsFromAPI (apiLibraries, excludeFunctions) {
    return apiLibraries.map((name, index) => {
      let obj = {}
      for (let [fname, definition] of Object.entries(rise[name])) {
        if (excludeFunctions.indexOf(fname) === -1) obj[fname] = definition
      }
      return obj
    })
  }

  /**
   * Returns an Express app that has access to the RISE API and allows handling queries by HTTP GET; You can change the basePathName if a path should precede the RISE function paths (i.e. you do not want the RISE paths to be attached directly to the main directory); if no Express app is given, a new one is created and returned
   * @param {function} app Express app
   * @param {string} [basePathName=''] Base path name prefixed to the paths used by the RISE API; this should only be set if you want to change the directory reserved by the RISE API
   * @param {object} RISE Object that was created by this module (or has the exact same signature) that is used to map the functionality of the RISE API to the server
   */
  getExpressAppWithRiseAPI (app = express(), basePathName = this.basePathName, { riseAPI = this.riseAPI, riseFullAPI = this.riseFullAPI, validateQuery = this.validateQuery, validateParams = this.validateParams, alwaysSendQuery = this.alwaysSendQuery } = {}) {
    return app.get(basePathName === '' ? '*' : basePathName + '/*', (req, res, next) => {
      const lengthModifier = basePathName ? String(basePathName).split('/').length - 1 : 0
      const lowerPathLength = lengthModifier + 3
      const upperPathLength = lengthModifier + 4
      const arr = String(req.path).split('/')
      if (arr.length >= lowerPathLength && arr.length <= upperPathLength) {
        const allowedQueryProps = Object.keys(validateQuery)
        const allowedParams = Object.keys(validateParams)
        // arr[0 + lengthModifier] is irrelevant
        const api = arr[1 + lengthModifier]
        const fn = arr[2 + lengthModifier]
        const input = arr[3 + lengthModifier]
        let arg1, arg2
        const index = riseAPI.indexOf(api)
        if (index !== -1 && riseFullAPI[index][1][fn] !== undefined) {
          if (input === 'query') {
            const userQueryProps = Object.keys(req.query)
            if (userQueryProps.length > 0) {
              arg1 = {}
              let allValid = true
              userQueryProps.map((prop, index) => {
                if (allowedQueryProps.indexOf(prop) !== -1 && validateQuery[prop](req.query[prop])) {
                  arg1[prop] = req.query[prop]
                } else {
                  allValid = false
                }
              })
              if (!alwaysSendQuery && !allValid) res.send()
            }
          } else if (input === 'params') {
            // only accept up to 2 params
            const userQueryProps = [ Object.keys(req.query)[0], Object.keys(req.query)[1] ]
            if (userQueryProps[0] && allowedParams.indexOf(userQueryProps[0]) !== -1) {
              arg1 = validateParams[userQueryProps[0]](req.query[userQueryProps[0]]) ? req.query[userQueryProps[0]] : undefined
              if (userQueryProps[1] && allowedParams.indexOf(userQueryProps[1]) !== -1) {
                arg2 = validateParams[userQueryProps[1]](req.query[userQueryProps[1]]) ? req.query[userQueryProps[1]] : undefined
              }
            }
            if (!alwaysSendQuery) {
              if (arg1 === undefined || (userQueryProps[1] && arg2 === undefined)) res.send()
            }
          }
          try {
            ((arg2 === undefined) ? riseFullAPI[index][1][fn](arg1) : riseFullAPI[index][1][fn](arg1, arg2)).then((response) => {
              res.send(response)
            }).catch((err) => {
              console.error(err)
              res.send()
            })
          } catch (err) {
            console.error(err)
            res.send()
          }
        } else {
          // The user has not requested the RISE api or function (or has requested a non-existing or excluded function); Routing now goes through the other paths in the Express app
          next()
        }
      } else {
        // Routing now goes through the other paths in the Express app
        next()
      }
    })
  }
}
