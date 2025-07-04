/**
 * Copyright 2025 Perfana Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// noinspection JSCheckFunctionSignatures

import { Meteor } from 'meteor/meteor';
import express from 'express';
import { updateRunningTest } from './updateRunningTest';
import {
  testRunAlertGrafana,
  testRunAlertKapacitor,
  testRunAlertPrometheus,
} from './testRunAlerts';
import { sendEvent } from './sendEvent';
import { getTestRunBenchmarkResults } from './getTestRunBenchmarkResults';
import { getReleaseResults } from './getReleaseResults';
import { getTestRun } from './getTestRun';
import {
  addTestRunConfig,
  addTestRunConfigJson,
  addTestRunConfigs,
} from './addTestRunConfig';
import passport from 'passport';
import { BasicStrategy } from 'passport-http';
import BearerStrategy from 'passport-http-bearer';
import { compareApiKey, createApiKey } from '../helpers/apiKey';
import bodyParser from 'body-parser';
import {
  genericCheckResults,
  profileRequirementLabels,
  profileRequirementSuts,
  profileRequirementTeams,
  profiles,
} from './genericCheckResults';
import { log } from '/both/logger';
import { initTest } from './testInit';

const bound = Meteor.bindEnvironment((callback) => {
  callback();
});

export function setupApi() {
  log.info('Setting up API ...');
  const app = express();
  const router = express.Router();
  const apiRouter = express.Router();

  const contextPath =
    Meteor.settings.perfanaApiContextRoot ?
      Meteor.settings.perfanaApiContextRoot
    : undefined;

  // Setup middleware
  app.use(bodyParser.json({ extended: true }));
  app.use(passport.initialize());

  // Configure passport strategies
  passport.use(
    new BearerStrategy((token, done) => {
      bound(() => {
        compareApiKey(token, (err, result) => {
          if (err) {
            log.error('Authentication error', { error: err, stack: err.stack });
            return done(null, false, { message: err.message });
          }
          if (result === true) {
            return done(null, token, { scope: 'organization' });
          }
          log.error('Invalid API key attempt', {
            token: token.substring(0, 8) + '...',
          });
          return done(null, false, { message: 'Invalid API key' });
        });
      });
    }),
  );

  const perfanaApiUser =
    Meteor.settings.perfanaApiUser ?
      Meteor.settings.perfanaApiUser
    : Meteor.settings.adminUser;
  const perfanaApiPassword =
    Meteor.settings.perfanaApiPassword ?
      Meteor.settings.perfanaApiPassword
    : Meteor.settings.adminPassword;

  passport.use(
    new BasicStrategy(function (userid, password, done) {
      if (userid === perfanaApiUser && password === perfanaApiPassword) {
        return done(null, userid);
      } else {
        log.error('Authentication failed', {
          user: userid,
          reason: 'Invalid credentials',
        });
        return done(null, false, { message: 'Invalid credentials' });
      }
    }),
  );

  // Custom authentication middleware for multiple strategies that includes logging
  const authenticateMultipleWithJson = (req, res, next) => {
    log.debug(`Auth attempt [${req.method} ${req.path}]`, {
      method: req.method,
      path: req.path,
      hasAuth: !!req.headers.authorization,
    });

    passport.authenticate(
      ['bearer', 'basic'],
      { session: false },
      (err, user, info) => {
        if (err) {
          log.error(`Auth error [${req.method} ${req.path}]`, {
            error: err.message,
            stack: err.stack,
            authHeader: req.headers.authorization,
          });
          return res.status(500).json({ error: err.message });
        }

        if (!user) {
          log.error(`Auth failed [${req.method} ${req.path}]`, {
            message: info?.message,
            authType: req.headers.authorization?.split(' ')[0] || 'none',
            strategies: ['bearer', 'basic'],
          });
          return res
            .status(401)
            .json({ error: info?.message || 'Unauthorized' });
        }

        log.debug(`Auth success [${req.method} ${req.path}]`, {
          user: user,
        });

        req.user = user;
        next();
      },
    )(req, res, next);
  };

  // Non-authenticated endpoint first
  apiRouter.get('/status', (req, res) => {
    res.send('OK');
  });

  // Apply authentication middleware to all routes after this point
  apiRouter.use(authenticateMultipleWithJson);

  // Move all API routes to apiRouter
  apiRouter.post('/init', Meteor.bindEnvironment(initTest));
  apiRouter.post('/test', Meteor.bindEnvironment(updateRunningTest));
  apiRouter.post('/config/key', Meteor.bindEnvironment(addTestRunConfig));
  apiRouter.post('/config/keys', Meteor.bindEnvironment(addTestRunConfigs));
  apiRouter.post('/config/json', Meteor.bindEnvironment(addTestRunConfigJson));
  apiRouter.get(
    '/test-run/:systemUnderTest/:testRunId',
    Meteor.bindEnvironment(getTestRun),
  );
  apiRouter.post(
    '/grafana-alerts',
    Meteor.bindEnvironment(testRunAlertGrafana),
  );
  apiRouter.post(
    '/kapacitor-alerts',
    Meteor.bindEnvironment(testRunAlertKapacitor),
  );
  apiRouter.post(
    '/prometheus-alerts',
    Meteor.bindEnvironment(testRunAlertPrometheus),
  );
  apiRouter.get(
    '/benchmark-results/:systemUnderTest/:testRunId',
    Meteor.bindEnvironment(getTestRunBenchmarkResults),
  );
  apiRouter.get(
    '/release-results/:systemUnderTest/:version',
    Meteor.bindEnvironment(getReleaseResults),
  );
  apiRouter.post('/events', Meteor.bindEnvironment(sendEvent));
  apiRouter.get(
    '/generic-check-results',
    Meteor.bindEnvironment(genericCheckResults),
  );
  apiRouter.get('/profiles', Meteor.bindEnvironment(profiles));
  apiRouter.get(
    '/profile-requirement-labels',
    Meteor.bindEnvironment(profileRequirementLabels),
  );
  apiRouter.get(
    '/profile-requirement-suts',
    Meteor.bindEnvironment(profileRequirementSuts),
  );
  apiRouter.get(
    '/profile-requirement-teams',
    Meteor.bindEnvironment(profileRequirementTeams),
  );

  app.get('/api/status', (req, res) => {
    res.send('OK');
  });

  app.post(
    '/api/key',
    passport.authenticate(['bearer', 'basic'], { session: false }),
    Meteor.bindEnvironment(async (req, res) => {
      try {
        const description = req.body.description || 'API generated key';
        const validFor = req.body.validFor || '90d';

        const wrap = Meteor.makeAsync(createApiKey);
        const result = await wrap(description, validFor);

        res.json({ key: result });
      } catch (error) {
        log.error('Error creating API key:', error);
        res.status(500).json({ error: 'Failed to create API key' });
      }
    }),
  );

  if (contextPath) {
    app.use(contextPath, router);
  }

  // Mount the API router under /api
  app.use('/api', apiRouter);

  WebApp.connectHandlers.use(app);
}

// /server/imports/api/index.js
