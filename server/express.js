import express from 'express'
import morgan from 'morgan'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import flash from 'connect-flash'
import methodOverride from 'method-override'
import logger from './logger'
import Responder from './expressResponder'
import compression from 'compression'
import helmet from 'helmet'
import routesInitiator from '../routes'
import passport from 'passport'
import registerInternalAuthStrategy from '../app/authStrategies/internalAuth'
import localSignupStrategy from '../app/authStrategies/localSignup'
import localSigninStrategy from '../app/authStrategies/localSignin'
import BadRequestError from '../app/errors/badRequestError'
import db from './../app/db/models'
import path from 'path'
import expressSession from 'cookie-session'

// Initialize express app
const app = express()

function initMiddleware () {
  // Helmet is a collection of 12 middleware to help set some security headers.
  app.use(helmet())

  app.use(cookieParser()) // read cookies (needed for auth)

  registerInternalAuthStrategy()
  // Showing stack errors
  app.set('showStackError', true)

  // Enable jsonp
  app.enable('jsonp callback')

  app.use(function (req, res, next) {
    req.logger = logger
    next()
  })

  // Enable logger (morgan)
  app.use(morgan('combined', { stream: logger.stream }))

  // Environment dependent middleware
  if (process.env.NODE_ENV === 'development') {
    // Disable views cache
    app.set('view cache', false)
  } else if (process.env.NODE_ENV === 'production') {
    app.locals.cache = 'memory'
  }

  // Request body parsing middleware should be above methodOverride
  app.use(bodyParser.urlencoded({
    extended: true
  }))

  app.use(bodyParser.json({ limit: '1000mb' }))

  app.use(expressSession({
    name: 'session',
    keys: ['ekoAdminserviceSessionSecret'],
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }))

  app.use(passport.initialize())
  app.use(passport.session()) // persistent login sessions
  app.use(flash()) // use connect-flash for flash messages stored in session

  app.use(methodOverride())

  app.use(compression())

  localSignupStrategy(passport)
  localSigninStrategy(passport)

  // view engine setup
  app.set('view engine', 'ejs')
  app.set('views', path.join(__dirname, '../app/views'))

  app.use(express.static(path.join(__dirname, '../public')))
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '..', '..', 'node_modules')))
  } else {
    app.use(express.static(path.join(__dirname, '..', 'node_modules')))
  }
}

function initErrorRoutes () {
  app.use(function errorHandler (err, req, res, next) {
    if (res.headersSent) {
      return next(err)
    }
    logger.error(err)
    Responder.operationFailed(res, new BadRequestError('Something went wrong!'))
  })
}

function databaseConnection (db) {
  db.sequelize
    .sync()
    .then(() => {
      console.log('Database Connection has been established successfully.')
    })
    .catch(err => {
      console.error('Unable to connect to the database:', err)
    })
}

export function init () {
  databaseConnection(db)

  // Initialize Express middleware
  initMiddleware()

  // Initialize modules server routes
  routesInitiator(app, passport)

  // Initialize error routes
  initErrorRoutes()

  return app
}
