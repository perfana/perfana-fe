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

import '../imports/api/apiKeys';
import '../imports/api/abortAlertTags';
import '../imports/api/applicationDashboards';
import '../imports/api/applications.js';
import '../imports/api/autoConfigGrafanaDashboards';
import '../imports/api/benchmarks.js';
import '../imports/api/checkResults';
import '../imports/api/comments.js';
import '../imports/api/compareResults.js';
import '../imports/api/configuration';
import '../imports/api/dataScience.js';
import '../imports/api/deepLinks.js';
import '../imports/api/dynatrace.js';
import '../imports/api/dynatraceDql.js';
import '../imports/api/export';
import '../imports/api/genericChecks.js';
import '../imports/api/genericDeepLinks.js';
import '../imports/api/genericReportPanels.js';
import '../imports/api/grafanaDashboards.js';
import '../imports/api/grafanas.js';
import '../imports/api/notifications';
import '../imports/api/notificationsChannels';
import '../imports/api/omitAlertTags';
import '../imports/api/organisations';
import '../imports/api/profiles';
import '../imports/api/reportPanels.js';
import '../imports/api/reportRequirements.js';
import '../imports/api/snapshots';
import '../imports/api/teams.js';
import '../imports/api/testruns.js';
import '../imports/api/testRunConfigs';
import '../imports/api/trends';
import '../imports/api/users';
import '../imports/api/versions';
import './imports/helpers/snapshot-queues.js';
import { log } from '/both/logger';
import '../imports/startup/server/accounts-config.js';
import { Meteor } from 'meteor/meteor';
import { setupApi } from './imports/api'; // import our API
import { setupCollectionHooks } from './imports/collectionHooks'; // import our API
import { bootstrapConfiguration } from './imports/configuration/bootstrapConfiguration';
// import {writeCheckResultPoint} from "./imports/helpers/influx";
import helmet from 'helmet';
import { helmetOptions } from './imports/configuration/helmetOptions';

const path = Npm.require('path');
Meteor.rootPath = path.resolve('.');

Meteor.startup(() => {
  //this is so that our makeAsync function works
  // Future = Npm.require('fibers/future');

  bootstrapConfiguration();
  setupApi(); // instantiate Express app for API
  setupCollectionHooks();

  // noinspection JSCheckFunctionSignatures
  log.info('Finished bootstrapping Perfana');

  // console.log(`helmet config: ` + JSON.stringify(helmetOptions()))
  WebApp.connectHandlers.use(helmet(helmetOptions()));
  WebApp.connectHandlers.use(helmet.xssFilter());
  WebApp.connectHandlers.use(helmet.noSniff());
  WebApp.connectHandlers.use(helmet.ieNoOpen());
  WebApp.connectHandlers.use(helmet.hidePoweredBy());
});

const bound = Meteor.bindEnvironment((callback) => callback());

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  bound(() => {
    try {
      // Include any custom properties from the error
      const errorDetails = {
        ...err,
        code: err.code,
        details: err.details,
      };

      // Capture additional context
      const errorContext = {
        error: {
          name: err.name,
          message: err.message,
          stack: err.stack,
          ...errorDetails,
        },

        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      };

      // Log to both logger and console synchronously
      log.error(
        '[SERVER] [FATAL] Uncaught Exception:',
        JSON.stringify(errorContext, null, 2),
      );
      log.fatal('Uncaught Exception', errorContext);

      // Force flush any pending logs
      if (typeof log.force === 'function') {
        log.force();
      }
    } catch (loggingError) {
      // If logging fails, at least try to log to console
      log.error('Error while logging uncaught exception:', loggingError);
      log.error('Original error:', err);
    }

    // Ensure process exits after a delay to allow logs to be written
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  bound(() => {
    try {
      // Get process context
      const processContext = {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        resourceUsage: process.resourceUsage(),
        env: {
          NODE_ENV: process.env.NODE_ENV,
          ROOT_URL: process.env.ROOT_URL,
          MONGO_URL: process.env.MONGO_URL?.replace(
            /\/\/[^:]+:[^@]+@/,
            '//***:***@',
          ), // Redact credentials
        },
      };

      // Get Meteor context
      const meteorContext = {
        release: Meteor.release,
        isProduction: Meteor.isProduction,
        isDevelopment: Meteor.isDevelopment,
        settings:
          Meteor.settings ?
            JSON.parse(JSON.stringify(Meteor.settings))
          : undefined,
      };

      // Log synchronously to console first in case logging fails
      log.error('[SERVER] [FATAL] Unhandled Promise Rejection:', {
        error: reason,
        errorStack: reason?.stack,
        processContext,
        meteorContext,
        timestamp: new Date().toISOString(),
      });

      // Log through our logging system
      // noinspection JSCheckFunctionSignatures
      log.fatal('Unhandled Promise Rejection', {
        error: {
          ...reason,
          message: reason?.message || String(reason),
          stack: reason?.stack,
          name: reason?.name,
        },
        processContext,
        meteorContext,
        timestamp: new Date().toISOString(),
      });
    } catch (loggingError) {
      // If logging fails, ensure we at least get basic error info to console
      log.error(
        '[SERVER] [FATAL] Error in unhandledRejection handler:',
        loggingError,
      );
      log.error('Original unhandled rejection:', reason);
    }

    // Ensure process exits after a delay to allow logs to be written
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
});

// Handle SIGTERM for graceful shutdown
process.on('SIGTERM', () => {
  bound(() => {
    // noinspection JSCheckFunctionSignatures
    log.info('Received SIGTERM signal', {
      timestamp: new Date().toISOString(),
      pid: process.pid,
    });

    // Perform cleanup
    Meteor.setTimeout(() => {
      process.exit(0);
    }, 1000);
  });
});
