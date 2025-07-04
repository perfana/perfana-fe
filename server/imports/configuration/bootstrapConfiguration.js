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

/* eslint-disable camelcase */
// noinspection JSCheckFunctionSignatures

import { Applications } from '/imports/collections/applications';
import { TestRuns } from '/imports/collections/testruns';
import { GrafanaDashboards } from '/imports/collections/grafanaDashboards';
import { Snapshots } from '/imports/collections/snapshots';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import { AutoConfigGrafanaDashboards } from '/imports/collections/autoConfigGrafanaDashboards';
import { Grafanas } from '/imports/collections/grafanas';
import { Alerts } from '/imports/collections/alerts';
import { OmitAlertTags } from '/imports/collections/omitAlertTags';
import { AbortAlertTags } from '/imports/collections/abortAlertTags';
import { GenericChecks } from '/imports/collections/genericChecks';
import { GenericReportPanels } from '/imports/collections/genericReportPanels';
import { Benchmarks } from '/imports/collections/benchmarks';
import { ReportPanels } from '/imports/collections/reportPanels';
import { GrafanaDashboardsTemplatingValues } from '/imports/collections/grafanaDashboardTemplatingValues';
import { Teams } from '/imports/collections/teams';
import { Organisations } from '/imports/collections/organisations';
import { Profiles } from '/imports/collections/profiles';
import { Comments } from '/imports/collections/comments';
import { Notifications } from '/imports/collections/notifications';
import { CheckResults } from '/imports/collections/checkResults';
import { Configuration } from '/imports/collections/configuration';
import { Dynatrace } from '/imports/collections/dynatrace';
import { NotificationsChannels } from '/imports/collections/notificationChannels';
import { Versions } from '/imports/collections/versions';
import path from 'path';
import { Meteor } from 'meteor/meteor';
import { dynatraceApiGet } from '/imports/helpers/dynatrace-api';
import { Accounts } from 'meteor/accounts-base';
import { log } from '/both/logger';
import {
  grafanaApiGetBasicAuth,
  grafanaApiPatchBasicAuth,
  grafanaApiPostBasicAuth,
} from '/imports/helpers/grafana/grafana-api-basic-auth';
import { v4 as uuidv4 } from 'uuid';
import { GoldenPathMetricClassification } from '/imports/collections/goldePathMetricClassification';
import yaml from 'js-yaml';
import { DsCompareConfig } from '/imports/collections/dsCompareConfig';
import fs from 'fs';

export const bootstrapConfiguration = () => {
  // @ts-ignore
  log.info('Bootstrapping Perfana ...');

  /* seed admin user */

  const adminAccount = Accounts.findUserByUsername('admin');

  if (!adminAccount) {
    Accounts.createUser({
      profile: {
        name: 'Admin',
        theme: 'light',
      },
      username: 'admin',
      email:
        Meteor.settings.adminUser ?
          Meteor.settings.adminUser
        : 'admin@perfana.io',
      password:
        Meteor.settings.adminPassword ?
          Meteor.settings.adminPassword
        : 'perfana',
    });

    const id = Meteor.users.findOne({ username: 'admin' })._id;
    Roles.addUserToRoles(id, ['admin']);
  }

  /* Store version in database */

  log.info('Storing version in database ...');

  const version =
    Meteor.settings.version ?
      Meteor.settings.version
    : fs.readFileSync(
        path.dirname(process.mainModule.filename) + '/version.txt',
        'utf8',
      );

  const storedVersion = Versions.findOne({
    component: 'perfana-fe',
  });

  if (storedVersion) {
    Versions.update(
      {
        component: 'perfana-fe',
      },
      {
        $set: {
          version: version,
        },
      },
    );
  } else {
    Versions.insert({
      component: 'perfana-fe',
      version: version,
    });
  }

  /* Store Meteor settings in database */

  /* Grafana */

  log.info('Setting up Grafana instance(s) ...');

  if (Meteor.settings.grafanaInstances) {
    Meteor.settings.grafanaInstances.forEach(async (grafanaInstance) => {
      const grafana = Grafanas.findOne({
        label: grafanaInstance.label,
      });

      if (grafanaInstance.apiKey) {
        log.info(
          'Service Account token found in settings, storing it in database.',
        );

        if (grafana !== undefined) {
          Grafanas.update(
            {
              _id: grafana._id,
            },
            {
              $set: {
                label: grafanaInstance.label,
                clientUrl: grafanaInstance.clientUrl,
                serverUrl: grafanaInstance.serverUrl,
                orgId: grafanaInstance.orgId,
                snapshotInstance: grafanaInstance.snapshotInstance,
                trendsInstance: grafanaInstance.trendsInstance,
                apiKey: grafanaInstance.apiKey,
              },
            },
          );
        } else {
          Grafanas.insert({
            label: grafanaInstance.label,
            clientUrl: grafanaInstance.clientUrl,
            serverUrl: grafanaInstance.serverUrl,
            orgId: grafanaInstance.orgId,
            snapshotInstance: grafanaInstance.snapshotInstance,
            trendsInstance: grafanaInstance.trendsInstance,
            apiKey: grafanaInstance.apiKey,
          });
        }
      } else {
        try {
          // Check if perfana service account exists
          const serviceAccounts = await grafanaApiGetBasicAuth(
            grafanaInstance,
            '/api/serviceaccounts/search',
          );
          const perfanaServiceAccount = serviceAccounts.serviceAccounts?.find(
            (sa) => sa.name.toLowerCase() === 'perfana',
          );

          if (!perfanaServiceAccount) {
            log.info(
              'No Perfana service account found in Grafana, creating it...',
            );

            // Create service account
            const createSAData = {
              name: 'Perfana',
              role: 'Admin',
            };
            const saResponse = await grafanaApiPostBasicAuth(
              grafanaInstance,
              '/api/serviceaccounts',
              createSAData,
            );

            // Create service account token
            const tokenData = {
              name: 'PerfanaToken',
              role: 'Admin',
            };
            const tokenResponse = await grafanaApiPostBasicAuth(
              grafanaInstance,
              `/api/serviceaccounts/${saResponse.id}/tokens`,
              tokenData,
            );

            if (grafana) {
              Grafanas.update(
                {
                  _id: grafana._id,
                },
                {
                  $set: {
                    label: grafanaInstance.label,
                    clientUrl: grafanaInstance.clientUrl,
                    serverUrl: grafanaInstance.serverUrl,
                    orgId: grafanaInstance.orgId,
                    snapshotInstance: grafanaInstance.snapshotInstance,
                    trendsInstance: grafanaInstance.trendsInstance,
                    apiKey: tokenResponse.key,
                  },
                },
              );
            } else {
              Grafanas.insert({
                label: grafanaInstance.label,
                clientUrl: grafanaInstance.clientUrl,
                serverUrl: grafanaInstance.serverUrl,
                orgId: grafanaInstance.orgId,
                snapshotInstance: grafanaInstance.snapshotInstance,
                trendsInstance: grafanaInstance.trendsInstance,
                apiKey: tokenResponse.key,
              });
            }
          }

          // Handle snapshot user creation (using async/await for better readability)
          const userResponse = await grafanaApiGetBasicAuth(
            grafanaInstance,
            '/api/users/lookup?loginOrEmail=perfana-snapshot',
          );

          if (userResponse && userResponse.message === 'user not found') {
            log.info('perfana-snapshot user not found, creating it...');
            const pwd = uuidv4();

            const postData = {
              name: 'Perfana snapshot user',
              email: 'perfana-snapshot@perfana.io',
              login: 'perfana-snapshot',
              password: pwd,
              OrgId: 1,
            };

            const snapshotUserResponse = await grafanaApiPostBasicAuth(
              grafanaInstance,
              '/api/admin/users',
              postData,
            );

            // Set user permissions
            await grafanaApiPatchBasicAuth(
              grafanaInstance,
              `/api/orgs/${grafanaInstance.orgId || 1}/users/${snapshotUserResponse.id}`,
              {
                loginOrEmail: 'perfana-snapshot',
                role: 'Editor',
              },
            );

            Grafanas.update(
              {
                label: grafanaInstance.label,
              },
              {
                $set: {
                  username: 'perfana-snapshot',
                  password: pwd,
                },
              },
            );
          }
        } catch (error) {
          log.error('Error setting up Grafana service account:', error);
        }
      }
    });
  }

  /* oauth */

  /* Organisation */
  if (
    !Meteor.settings.organisations ||
    Meteor.settings.organisations.length === 0
  ) {
    log.info('Setting up organisation ...');

    const existingDefaultOrganisation = Organisations.findOne({
      _id: 'Perfana',
    });

    if (existingDefaultOrganisation) {
      Organisations.update(
        {
          _id: 'Perfana',
        },
        {
          $set: {
            name: 'Perfana',
            description: 'Perfana default organisation',
          },
        },
      );
    } else {
      Organisations.insert({
        _id: 'Perfana',
        name: 'Perfana',
        description: 'Perfana default organisation',
      });
    }
  } else {
    Meteor.settings.organisations.forEach((organisation) => {
      const existingOrganisation = Organisations.findOne({
        _id: organisation.name,
      });

      if (existingOrganisation) {
        Organisations.update(
          {
            _id: organisation.name,
          },
          {
            $set: {
              name: organisation.name,
              description: organisation.description,
            },
          },
        );
      } else {
        Organisations.insert({
          _id: organisation.name,
          name: organisation.name,
          description: organisation.description,
        });
      }
    });
  }

  log.info('Setting up Grafana retention ...');
  /* Grafana */

  const snapshotExpiresConfig = Configuration.findOne({
    $and: [{ type: 'datasource' }, { key: 'grafanaRetention' }],
  });

  if (snapshotExpiresConfig) {
    Configuration.update(
      {
        $and: [{ type: 'datasource' }, { key: 'grafanaRetention' }],
      },
      {
        $set: {
          type: 'datasource',
          key: 'grafanaRetention',
          value:
            Meteor.settings.snapshotExpires ?
              Meteor.settings.snapshotExpires
            : 7776000,
        },
      },
    );
  } else {
    Configuration.insert({
      type: 'datasource',
      key: 'grafanaRetention',
      value:
        Meteor.settings.snapshotExpires ?
          Meteor.settings.snapshotExpires
        : 7776000,
    });
  }

  /* Prometheus */

  if (Meteor.settings.prometheusRetention) {
    log.info('Setting up Prometheus retention ...');

    const prometheusRetentionConfig = Configuration.findOne({
      $and: [{ type: 'datasource' }, { key: 'prometheusRetention' }],
    });

    if (prometheusRetentionConfig) {
      Configuration.update(
        {
          $and: [{ type: 'datasource' }, { key: 'prometheusRetention' }],
        },
        {
          $set: {
            type: 'datasource',
            key: 'prometheusRetention',
            value:
              Meteor.settings.prometheusRetention ?
                Meteor.settings.prometheusRetention
              : 2592000,
          },
        },
      );
    } else {
      Configuration.insert({
        type: 'datasource',
        key: 'prometheusRetention',
        value:
          Meteor.settings.prometheusRetention ?
            Meteor.settings.prometheusRetention
          : 2592000,
      });
    }
  } else {
    Configuration.remove({
      type: 'datasource',
      key: 'prometheusRetention',
    });
  }

  /* InfluxDb */

  if (Meteor.settings.influxDbRetention) {
    log.info('Setting up Influx retention ...');

    const influxDbRetentionConfig = Configuration.findOne({
      $and: [{ type: 'datasource' }, { key: 'influxDbRetention' }],
    });

    if (influxDbRetentionConfig) {
      Configuration.update(
        {
          $and: [{ type: 'datasource' }, { key: 'influxDbRetention' }],
        },
        {
          $set: {
            type: 'datasource',
            key: 'influxDbRetention',
            value:
              Meteor.settings.influxDbRetention ?
                Meteor.settings.influxDbRetention
              : 2592000,
          },
        },
      );
    } else {
      Configuration.insert({
        type: 'datasource',
        key: 'influxDbRetention',
        value:
          Meteor.settings.influxDbRetention ?
            Meteor.settings.influxDbRetention
          : 2592000,
      });
    }
  } else {
    Configuration.remove({
      type: 'datasource',
      key: 'influxDbRetention',
    });
  }
  /* Graphite */

  if (Meteor.settings.graphiteRetention) {
    log.info('Setting up Graphite retention ...');

    const graphiteRetentionConfig = Configuration.findOne({
      $and: [{ type: 'datasource' }, { key: 'graphiteRetention' }],
    });

    if (graphiteRetentionConfig) {
      Configuration.update(
        {
          $and: [{ type: 'datasource' }, { key: 'graphiteRetention' }],
        },
        {
          $set: {
            type: 'datasource',
            key: 'graphiteRetention',
            value:
              Meteor.settings.graphiteRetention ?
                Meteor.settings.graphiteRetention
              : 2592000,
          },
        },
      );
    } else {
      Configuration.insert({
        type: 'datasource',
        key: 'graphiteRetention',
        value:
          Meteor.settings.graphiteRetention ?
            Meteor.settings.graphiteRetention
          : 2592000,
      });
    }
  } else {
    Configuration.remove({
      type: 'datasource',
      key: 'graphiteRetention',
    });
  }
  /* Elasticsearch */

  if (Meteor.settings.elasticSearchRetention) {
    log.info('Setting up Elastic retention ...');

    const elasticSearchRetentionConfig = Configuration.findOne({
      $and: [{ type: 'datasource' }, { key: 'elasticSearchRetention' }],
    });

    if (elasticSearchRetentionConfig) {
      Configuration.update(
        {
          $and: [{ type: 'datasource' }, { key: 'elasticSearchRetention' }],
        },
        {
          $set: {
            type: 'datasource',
            key: 'elasticSearchRetention',
            value:
              Meteor.settings.elasticSearchRetention ?
                Meteor.settings.elasticSearchRetention
              : 2592000,
          },
        },
      );
    } else {
      Configuration.insert({
        type: 'datasource',
        key: 'elasticSearchRetention',
        value:
          Meteor.settings.elasticSearchRetention ?
            Meteor.settings.elasticSearchRetention
          : 2592000,
      });
    }
  } else {
    Configuration.remove({
      type: 'datasource',
      key: 'elasticSearchRetention',
    });
  }
  /* Cloudwatch */

  if (Meteor.settings.cloudWatchRetention) {
    log.info('Setting up CloudWatch retention ...');

    const cloudWatchRetentionConfig = Configuration.findOne({
      $and: [{ type: 'datasource' }, { key: 'cloudWatchRetention' }],
    });

    if (cloudWatchRetentionConfig) {
      Configuration.update(
        {
          $and: [{ type: 'datasource' }, { key: 'cloudWatchRetention' }],
        },
        {
          $set: {
            type: 'datasource',
            key: 'cloudWatchRetention',
            value:
              Meteor.settings.cloudWatchRetention ?
                Meteor.settings.cloudWatchRetention
              : 1296000,
          },
        },
      );
    } else {
      Configuration.insert({
        type: 'datasource',
        key: 'cloudWatchRetention',
        value:
          Meteor.settings.cloudWatchRetention ?
            Meteor.settings.cloudWatchRetention
          : 1296000, // 15 days defaullt
      });
    }
  } else {
    Configuration.remove({
      type: 'datasource',
      key: 'cloudWatchRetention',
    });
  }
  /* Pyroscope */

  if (Meteor.settings.pyroscopeRetention) {
    log.info('Setting up pyroscope retention ...');

    const pyroscopeRetentionConfig = Configuration.findOne({
      $and: [{ type: 'datasource' }, { key: 'pyroscopeRetention' }],
    });

    if (pyroscopeRetentionConfig) {
      Configuration.update(
        {
          $and: [{ type: 'datasource' }, { key: 'pyroscopeRetention' }],
        },
        {
          $set: {
            type: 'datasource',
            key: 'pyroscopeRetention',
            value:
              Meteor.settings.pyroscopeRetention ?
                Meteor.settings.pyroscopeRetention
              : 1296000,
          },
        },
      );
    } else {
      Configuration.insert({
        type: 'datasource',
        key: 'pyroscopeRetention',
        value:
          Meteor.settings.pyroscopeRetention ?
            Meteor.settings.pyroscopeRetention
          : 1296000, // 15 days defaullt
      });
    }
  } else {
    Configuration.remove({
      type: 'datasource',
      key: 'pyroscopeRetention',
    });
  }
  /* Loki */

  if (Meteor.settings.lokiRetention) {
    log.info('Setting up loki retention ...');

    const lokiRetentionConfig = Configuration.findOne({
      $and: [{ type: 'datasource' }, { key: 'lokiRetention' }],
    });

    if (lokiRetentionConfig) {
      Configuration.update(
        {
          $and: [{ type: 'datasource' }, { key: 'lokiRetention' }],
        },
        {
          $set: {
            type: 'datasource',
            key: 'lokiRetention',
            value:
              Meteor.settings.lokiRetention ?
                Meteor.settings.lokiRetention
              : 1296000,
          },
        },
      );
    } else {
      Configuration.insert({
        type: 'datasource',
        key: 'lokiRetention',
        value:
          Meteor.settings.lokiRetention ?
            Meteor.settings.lokiRetention
          : 1296000, // 15 days defaullt
      });
    }
  } else {
    Configuration.remove({
      type: 'datasource',
      key: 'lokiRetention',
    });
  }
  /* Azure */

  if (Meteor.settings.azureRetention) {
    log.info('Setting up Azure retention ...');

    const azureRetentionConfig = Configuration.findOne({
      $and: [{ type: 'datasource' }, { key: 'azureRetention' }],
    });

    if (azureRetentionConfig) {
      Configuration.update(
        {
          $and: [{ type: 'datasource' }, { key: 'azureRetention' }],
        },
        {
          $set: {
            type: 'datasource',
            key: 'azureRetention',
            value:
              Meteor.settings.azureRetention ?
                Meteor.settings.azureRetention
              : 1296000,
          },
        },
      );
    } else {
      Configuration.insert({
        type: 'datasource',
        key: 'azureRetention',
        value:
          Meteor.settings.azureRetention ?
            Meteor.settings.azureRetention
          : 1296000, // 15 days defaullt
      });
    }
  } else {
    Configuration.remove({
      type: 'datasource',
      key: 'azureRetention',
    });
  }
  /* Custom alert tags */

  if (Meteor.settings.customAlertTags) {
    log.info('Setting up custom alert tags ...');

    Configuration.remove({
      type: 'alert',
    });

    const customAlertTags = Meteor.settings.customAlertTags;

    customAlertTags.forEach((customAlertTag) => {
      Configuration.insert({
        type: 'alert',
        key: customAlertTag.key,
        value: customAlertTag.value,
      });
    });
  }

  /* Omit alert tags */

  if (Meteor.settings.omitAlertTags) {
    log.info('Setting up alert tags to omit ...');

    OmitAlertTags.remove({});

    const omitAlertTags = Meteor.settings.omitAlertTags;

    omitAlertTags.forEach((omitAlertTag) => {
      OmitAlertTags.insert({
        alertSource: omitAlertTag.alertSource,
        tag: omitAlertTag.tag,
      });
    });
  }

  /* Perfana settings */

  /* test run sanity check */

  log.info('Setting up Perfana configuration ...');

  Configuration.remove({
    key: 'minimumTestRunDuration',
  });

  const minimumTestRunDuration =
    Meteor.settings.minimumTestRunDuration ?
      Meteor.settings.minimumTestRunDuration
    : 60;

  log.info(`minimumTestRunDuration: ${minimumTestRunDuration}`);

  Configuration.insert({
    type: 'perfana',
    key: 'minimumTestRunDuration',
    value: minimumTestRunDuration, // 60 seconds
  });

  Configuration.remove({
    type: 'perfana',
    key: 'forbidClientAccountCreation',
  });

  const forbidClientAccountCreation =
    Meteor.settings.public.forbidClientAccountCreation ?
      Meteor.settings.public.forbidClientAccountCreation
    : false;

  log.info(`forbidClientAccountCreation: ${forbidClientAccountCreation}`);

  Configuration.insert({
    type: 'perfana',
    key: 'forbidClientAccountCreation',
    value: forbidClientAccountCreation,
  });

  Configuration.remove({
    type: 'perfana',
    key: 'loginExpirationInDays',
  });

  const loginExpirationInDays =
    Meteor.settings.loginExpirationInDays ?
      Meteor.settings.loginExpirationInDays
    : 1;

  log.info(`loginExpirationInDays: ${loginExpirationInDays}`);

  Configuration.insert({
    type: 'perfana',
    key: 'loginExpirationInDays',
    value: loginExpirationInDays,
  });

  Configuration.remove({
    type: 'perfana',
    key: 'googleSignIn',
  });

  const googleSignIn =
    Meteor.settings.public.googleSignIn ?
      Meteor.settings.public.googleSignIn === true
    : false;

  log.info(`googleSignIn: ${googleSignIn}`);

  Configuration.insert({
    type: 'perfana',
    key: 'googleSignIn',
    value: googleSignIn,
  });

  Configuration.remove({
    type: 'perfana',
    key: 'overrideLoginButtonText',
  });

  const overrideLoginButtonText =
    Meteor.settings.public.overrideLoginButtonText;

  if (overrideLoginButtonText) {
    log.info(`overrideLoginButtonText: ${overrideLoginButtonText}`);

    Configuration.remove({
      type: 'perfana',
      key: 'overrideLoginButtonText',
    });

    Configuration.insert({
      type: 'perfana',
      key: 'overrideLoginButtonText',
      value: overrideLoginButtonText,
    });
  }

  const testRunsSubscriptionLimit = Meteor.settings.testRunsSubscriptionLimit;

  if (testRunsSubscriptionLimit) {
    log.info(`testRunsSubscriptionLimit: ${testRunsSubscriptionLimit}`);

    Configuration.remove({
      type: 'perfana',
      key: 'testRunsSubscriptionLimit',
    });

    Configuration.insert({
      type: 'perfana',
      key: 'testRunsSubscriptionLimit',
      value: testRunsSubscriptionLimit,
    });
  }

  const perfanaUrl =
    Meteor.settings.perfanaUrl ?
      Meteor.settings.perfanaUrl
    : 'http://localhost:4000';

  log.info(`perfanaUrl: ${perfanaUrl}`);

  Configuration.remove({
    type: 'perfana',
    key: 'perfanaUrl',
  });

  Configuration.insert({
    type: 'perfana',
    key: 'perfanaUrl',
    value: perfanaUrl,
  });

  const perfanaCheckUrl =
    Meteor.settings.perfanaCheckUrl ?
      Meteor.settings.perfanaCheckUrl
    : 'http://localhost:9191';

  log.info(`perfanaCheckUrl: ${perfanaCheckUrl}`);

  Configuration.remove({
    type: 'perfana',
    key: 'perfanaCheckUrl',
  });

  Configuration.insert({
    type: 'perfana',
    key: 'perfanaCheckUrl',
    value: perfanaCheckUrl,
  });

  const adminUser =
    Meteor.settings.adminUser ? Meteor.settings.adminUser : 'admin@perfana.io';

  log.info(`adminUser: ${adminUser}`);

  Configuration.remove({
    type: 'perfana',
    key: 'adminUser',
  });

  Configuration.insert({
    type: 'perfana',
    key: 'adminUser',
    value: adminUser,
  });

  const perfanaApiUser =
    Meteor.settings.perfanaApiUser ? Meteor.settings.perfanaApiUser
    : Meteor.settings.adminUser ? Meteor.settings.adminUser
    : 'admin@perfana.io';

  log.info(`perfanaApiUser: ${perfanaApiUser}`);

  Configuration.remove({
    type: 'perfana',
    key: 'perfanaApiUser',
  });

  Configuration.insert({
    type: 'perfana',
    key: 'perfanaApiUser',
    value: perfanaApiUser,
  });

  const autoSetBaselineTestRun =
    Meteor.settings.autoSetBaselineTestRun ?
      Meteor.settings.autoSetBaselineTestRun === true
    : false;

  log.info(`autoSetBaselineTestRun: ${autoSetBaselineTestRun}`);

  Configuration.remove({
    type: 'perfana',
    key: 'autoSetBaselineTestRun',
  });

  Configuration.insert({
    type: 'perfana',
    key: 'autoSetBaselineTestRun',
    value: autoSetBaselineTestRun,
  });

  const autoCompareTestRuns =
    Meteor.settings.autoCompareTestRuns ?
      Meteor.settings.autoCompareTestRuns === true
    : false;

  log.info(`autoCompareTestRuns: ${autoCompareTestRuns}`);

  Configuration.remove({
    type: 'perfana',
    key: 'autoCompareTestRuns',
  });

  Configuration.insert({
    type: 'perfana',
    key: 'autoCompareTestRuns',
    value: autoCompareTestRuns,
  });

  const autoCreateSnapshots =
    Meteor.settings.autoCreateSnapshots ?
      Meteor.settings.autoCreateSnapshots === true
    : false;

  log.info(`autoCreateSnapshots: ${autoCreateSnapshots}`);

  Configuration.remove({
    type: 'perfana',
    key: 'autoCreateSnapshots',
  });

  Configuration.insert({
    type: 'perfana',
    key: 'autoCreateSnapshots',
    value: autoCreateSnapshots,
  });

  Configuration.remove({
    type: 'perfana',
    key: 'helmetFrameSrc',
  });

  if (Meteor.settings.helmet.frameSrc) {
    Configuration.insert({
      type: 'perfana',
      key: 'helmetFrameSrc',
      value: Meteor.settings.helmet.frameSrc.join(', '),
    });
  }

  Configuration.remove({
    type: 'perfana',
    key: 'helmetScriptsSrc',
  });

  if (Meteor.settings.helmet.scriptSrc) {
    Configuration.insert({
      type: 'perfana',
      key: 'helmetScriptsSrc',
      value: Meteor.settings.helmet.scriptSrc.join(', '),
    });
  }

  Configuration.remove({
    type: 'perfana',
    key: 'traceRequestNamePanelDescription',
  });

  if (Meteor.settings.traceRequestNamePanelDescription) {
    Configuration.insert({
      type: 'perfana',
      key: 'traceRequestNamePanelDescription',
      value: Meteor.settings.traceRequestNamePanelDescription,
    });
  }

  /* Group / role mapping */

  const perfanaAdminGroup =
    Meteor.settings.groups && Meteor.settings.groups.perfanaAdminGroup ?
      Meteor.settings.groups.perfanaAdminGroup
    : undefined;

  log.info(`perfanaAdminGroup: ${perfanaAdminGroup}`);

  Configuration.remove({
    type: 'perfana',
    key: 'perfanaAdminGroup',
  });

  if (perfanaAdminGroup) {
    Configuration.insert({
      type: 'perfana',
      key: 'perfanaAdminGroup',
      value: perfanaAdminGroup,
    });
  }

  const perfanaSuperAdminGroup =
    Meteor.settings.groups && Meteor.settings.groups.perfanaSuperAdminGroup ?
      Meteor.settings.groups.perfanaSuperAdminGroup
    : undefined;

  log.info(`perfanaSuperAdminGroup: ${perfanaSuperAdminGroup}`);

  Configuration.remove({
    type: 'perfana',
    key: 'perfanaSuperAdminGroup',
  });

  if (perfanaSuperAdminGroup) {
    Configuration.insert({
      type: 'perfana',
      key: 'perfanaSuperAdminGroup',
      value: perfanaSuperAdminGroup,
    });
  }

  const perfanaTeamGroupPattern =
    Meteor.settings.groups && Meteor.settings.groups.perfanaTeamGroupPattern ?
      Meteor.settings.groups.perfanaTeamGroupPattern
    : undefined;

  log.info(`perfanaTeamGroupPattern: ${perfanaTeamGroupPattern}`);

  Configuration.remove({
    type: 'perfana',
    key: 'perfanaTeamGroupPattern',
  });

  if (perfanaTeamGroupPattern) {
    Configuration.insert({
      type: 'perfana',
      key: 'perfanaTeamGroupPattern',
      value: perfanaTeamGroupPattern,
    });
  }

  /* Tracing */

  /* Remove legacy documents */
  Configuration.remove({
    type: 'jaeger',
    key: 'tracingUrl',
  });

  Configuration.remove({
    type: 'jaeger',
    key: 'tracingLimit',
  });

  /* Remove existing documents */

  Configuration.remove({
    type: 'tracing',
    key: 'tracingUrl',
  });

  Configuration.remove({
    type: 'tracing',
    key: 'tracingUi',
  });

  Configuration.remove({
    type: 'tracing',
    key: 'tracingLimit',
  });

  if (Meteor.settings.public.tracingUrl) {
    const tracingUrl = Meteor.settings.public.tracingUrl;

    log.info(`tracingUrl: ${tracingUrl}`);

    Configuration.insert({
      type: 'tracing',
      key: 'tracingUrl',
      value: tracingUrl,
    });

    Configuration.insert({
      type: 'tracing',
      key: 'tracingLimit',
      value:
        Meteor.settings.public.tracingLimit ?
          Meteor.settings.public.tracingLimit
        : 500,
    });

    Configuration.insert({
      type: 'tracing',
      key: 'tracingUi',
      value:
        Meteor.settings.public.tracingui ?
          Meteor.settings.public.tracingUi
        : 'tempo',
    });
  }

  /* Pyroscope */

  Configuration.remove({
    type: 'pyroscope',
    key: 'pyroscopeUrl',
  });

  if (Meteor.settings.public.pyroscopeUrl) {
    const pyroscopeUrl = Meteor.settings.public.pyroscopeUrl;

    log.info(`pyroscopeUrl: ${pyroscopeUrl}`);

    Configuration.insert({
      type: 'pyroscope',
      key: 'pyroscopeUrl',
      value: pyroscopeUrl,
    });
  }

  /* Bootstrap read only profiles */

  if (
    Meteor.settings.provisionGoldenPathProfiles &&
    Meteor.settings.provisionGoldenPathProfiles === true
  ) {
    // store profile

    // get golden path profile names
    const goldenPathProfilesNames = Profiles.find({
      readOnly: true,
    })
      .fetch()
      .map((profile) => {
        return profile.name;
      });

    // remove golden path profiles
    Profiles.remove({
      readOnly: true,
    });

    let filePath =
      path.dirname(__meteor_bootstrap__.serverDir) +
      '/server/assets/app/provisioning/profiles.yaml';
    if (fs.existsSync(filePath)) {
      log.info(`Provisioning profiles`);
      yaml.load(fs.readFileSync(filePath, 'utf8')).forEach((profile) => {
        Profiles.upsert(
          {
            _id: profile._id,
          },
          { $set: profile },
        );
      });
    } else {
      log.warn(`File does not exist: ${filePath}`);
    }
    // store autoConfigGrafanaDashboards

    // remove golden path autoConfigGrafanaDashboards
    AutoConfigGrafanaDashboards.remove({
      profile: {
        $in: goldenPathProfilesNames,
      },
    });

    filePath =
      path.dirname(__meteor_bootstrap__.serverDir) +
      '/server/assets/app/provisioning/autoConfigGrafanaDashboards.yaml';
    if (fs.existsSync(filePath)) {
      log.info(`Provisioning autoConfigGrafanaDashboards`);
      yaml
        .load(fs.readFileSync(filePath, 'utf8'))
        .forEach((autoConfigGrafanaDashboard) => {
          AutoConfigGrafanaDashboards.upsert(
            {
              _id: autoConfigGrafanaDashboard._id,
            },
            { $set: autoConfigGrafanaDashboard },
          );
        });
    } else {
      log.warn(`File does not exist: ${filePath}`);
    }
    // store genericChecks

    // remove golden path autoConfigGrafanaDashboards
    GenericChecks.remove({
      profile: {
        $in: goldenPathProfilesNames,
      },
    });
    filePath =
      path.dirname(__meteor_bootstrap__.serverDir) +
      '/server/assets/app/provisioning/genericChecks.yaml';
    if (fs.existsSync(filePath)) {
      log.info(`Provisioning genericChecks`);
      yaml.load(fs.readFileSync(filePath, 'utf8')).forEach((genericCheck) => {
        genericCheck.panel.title = `${genericCheck.panel.id}-${genericCheck.panel.title}`;
        genericCheck.checkId = `${genericCheck.profile}-${genericCheck.dashboardUid}-${genericCheck.panel.id}`;
        genericCheck.updateTestRuns = false;

        GenericChecks.upsert(
          {
            _id: genericCheck._id,
          },
          { $set: genericCheck },
        );
      });
    } else {
      log.warn(`File does not exist: ${filePath}`);
    }
    // store golden path metricClassification

    // remove golden path metricClassification
    GoldenPathMetricClassification.remove({});

    filePath =
      path.dirname(__meteor_bootstrap__.serverDir) +
      '/server/assets/app/provisioning/goldenPathMetricClassifications.yaml';
    if (fs.existsSync(filePath)) {
      log.info(`Provisioning goldenPathMetricClassifications`);
      yaml
        .load(fs.readFileSync(filePath, 'utf8'))
        .forEach((goldenPathMetricClassification) => {
          GoldenPathMetricClassification.upsert(
            {
              dashboardUid: goldenPathMetricClassification.dashboardUid,
              panelId: goldenPathMetricClassification.panelId,
            },
            { $set: goldenPathMetricClassification },
          );
        });
    } else {
      log.warn(`File does not exist: ${filePath}`);
    }

    // remove default dsCompareConfig
    DsCompareConfig.remove({
      $and: [
        { application: { $eq: null } },
        { testEnvironment: { $eq: null } },
        { testType: { $eq: null } },
        { panelId: { $eq: null } },
        { metricName: { $eq: null } },
      ],
    });

    filePath =
      path.dirname(__meteor_bootstrap__.serverDir) +
      '/server/assets/app/provisioning/defaultDsCompareConfig.yaml';
    if (fs.existsSync(filePath)) {
      log.info(`Provisioning default dsCompareConfig`);
      yaml
        .load(fs.readFileSync(filePath, 'utf8'))
        .forEach((defaultDsCompareConfig) => {
          DsCompareConfig.insert(defaultDsCompareConfig);
        });
    } else {
      log.warn(`File does not exist: ${filePath}`);
    }
  }

  /* Bootstrap oauth2 service */

  Meteor.absoluteUrl.defaultOptions.rootUrl = Meteor.settings.public.perfanaUrl;

  ServiceConfiguration.configurations.remove({});

  const services = Meteor.settings.authenticationServices;

  if (services) {
    for (const service in services) {
      ServiceConfiguration.configurations.upsert(
        { service: service },
        {
          $set: services[service],
        },
      );
    }
  }

  /* Bootstrap Dynatrace */

  if (Meteor.settings.dynatraceUrl) {
    const dynatraceUrl = Meteor.settings.dynatraceUrl;

    log.info(`dynatraceUrl: ${dynatraceUrl}`);

    dynatraceApiGet('/api/config/v1/service/requestAttributes')
      .then((result) => {
        if (!result.values || result.values.length === 0) {
          log.warn('Dynatrace API returned empty request attributes array');
          return;
        }

        const perfanaTestRunIdAttributeIndex = result.values
          .map((value) => {
            return value.name;
          })
          .indexOf('perfana-test-run-id');
        const perfanaRequestNameAttributeIndex = result.values
          .map((value) => {
            return value.name;
          })
          .indexOf('perfana-request-name');

        if (perfanaTestRunIdAttributeIndex === -1) {
          log.warn('Required Dynatrace request attribute "perfana-test-run-id" not found');
          return;
        }

        if (perfanaRequestNameAttributeIndex === -1) {
          log.warn('Required Dynatrace request attribute "perfana-request-name" not found');
          return;
        }

        const dynatrace = {
          host: dynatraceUrl,
          perfanaTestRunIdAttribute:
            result.values[perfanaTestRunIdAttributeIndex].id,
          perfanaRequestNameAttribute:
            result.values[perfanaRequestNameAttributeIndex].id,
        };

        Dynatrace.upsert(
          {
            host: dynatraceUrl,
          },
          {
            $set: dynatrace,
          },
        );
      })
      .catch((err) => {
        log.error(err);
      });
  }

  /* Deny */

  // Deny all client-side updates on all collections
  Applications.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  TestRuns.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  GrafanaDashboards.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  Snapshots.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  ApplicationDashboards.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  Grafanas.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  Alerts.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  OmitAlertTags.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  AbortAlertTags.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  GenericChecks.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  GenericReportPanels.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  Benchmarks.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  ReportPanels.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  GrafanaDashboardsTemplatingValues.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  Teams.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  Organisations.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  Profiles.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  Comments.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  Notifications.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  CheckResults.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  Configuration.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  Comments.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  NotificationsChannels.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });

  // Deny all client-side updates to user documents
  Meteor.users.deny({
    insert() {
      return true;
    },
    update() {
      return true;
    },
    remove() {
      return true;
    },
  });
};
