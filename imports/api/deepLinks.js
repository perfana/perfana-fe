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

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import moment from 'moment';

import { DeepLinks } from '../collections/deeplinks';
import { userHasPermission } from '../helpers/checkPermission';
import { getFixedBaselineTestRun, getPreviousTestRun } from '../helpers/utils';
import { TestRunConfigs } from '../collections/testrunConfigs';

if (Meteor.isServer) {
  Meteor.publish('deepLinks', () => DeepLinks.find());
}

Meteor.methods({
  getDeepLinks: (application, testEnvironment, testType, testRun) => {
    check(application, String);
    check(testEnvironment, String);
    check(testType, String);
    check(testRun, Object);

    // if (!userHasPermission(Meteor.userId(), application)) {
    //   throw new Meteor.Error('get.deep-link.unauthorized',
    //       'The user is not authorized to get deep links for this system under test');
    // }

    const wrap = Meteor.makeAsync(getDeepLinksFn);
    return wrap(application, testEnvironment, testType, testRun);
  },
  insertDeepLink: (deepLink) => {
    check(deepLink, Object);

    if (!userHasPermission(Meteor.userId(), deepLink.application)) {
      throw new Meteor.Error(
        'insert.deep-link.unauthorized',
        'The user is not authorized to add deep links for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(insertDeepLinkFn);
    return wrap(deepLink);
  },

  updateDeepLink: (deepLink, deepLinkId) => {
    check(deepLink, Object);
    check(deepLinkId, String);

    if (!userHasPermission(Meteor.userId(), deepLink.application)) {
      throw new Meteor.Error(
        'update.deep-link.unauthorized',
        'The user is not authorized to update a dashboard for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(updateDeepLinkFn);
    return wrap(deepLink, deepLinkId);
  },

  deleteDeepLink: (deepLink) => {
    check(deepLink, Object);

    if (!userHasPermission(Meteor.userId(), deepLink.application)) {
      throw new Meteor.Error(
        'delete.deep-link.unauthorized',
        'The user is not authorized to delete deeplinks  for this system under test',
      );
    }
    DeepLinks.remove(deepLink._id);
  },
});

const insertDeepLinkFn = (deepLink, callback) => {
  DeepLinks.insert(deepLink, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};
const getDeepLinksFn = (
  application,
  testEnvironment,
  testType,
  testRun,
  callback,
) => {
  try {
    const deepLinks = DeepLinks.find({
      $and: [
        { application: application },
        { testEnvironment: testEnvironment },
        { testType: testType },
      ],
    }).fetch();

    deepLinks.forEach((deeplink) => {
      deeplink.url = replaceVariables(deeplink.url, testRun);
    });

    callback(null, deepLinks);
  } catch (error) {
    callback(error, null);
  }
};

const replaceVariables = (url, testRun) => {
  const previousTestRunId = getPreviousTestRun(testRun, true);
  const baselineTestRunId = getFixedBaselineTestRun(testRun);

  const applicationPlaceholder = new RegExp(`{perfana-system-under-test}`, 'g');
  url = url.replace(applicationPlaceholder, testRun.application);
  const testEnvironmentPlaceholder = new RegExp(
    `{perfana-test-environment}`,
    'g',
  );
  url = url.replace(testEnvironmentPlaceholder, testRun.testEnvironment);
  const workloadPlaceholder = new RegExp(`{perfana-workload}`, 'g');
  url = url.replace(workloadPlaceholder, testRun.testType);
  const perfanaStartEpochMillisecondsPlaceholder = new RegExp(
    `{perfana-start-epoch-milliseconds}`,
    'g',
  );
  url = url.replace(
    perfanaStartEpochMillisecondsPlaceholder,
    new Date(testRun.start).getTime(),
  );
  const perfanaEndEpochMillisecondsPlaceholder = new RegExp(
    `{perfana-end-epoch-milliseconds}`,
    'g',
  );
  url = url.replace(
    perfanaEndEpochMillisecondsPlaceholder,
    new Date(testRun.end).getTime(),
  );
  const perfanaStartEpochSecondsPlaceholder = new RegExp(
    `{perfana-start-epoch-seconds}`,
    'g',
  );
  url = url.replace(
    perfanaStartEpochSecondsPlaceholder,
    Math.round(new Date(testRun.start).getTime() / 1000),
  );
  const perfanaEndEpochSecondsPlaceholder = new RegExp(
    `{perfana-end-epoch-seconds}`,
    'g',
  );
  url = url.replace(
    perfanaEndEpochSecondsPlaceholder,
    Math.round(new Date(testRun.end).getTime() / 1000),
  );
  const perfanaStartDynatracePlaceholder = new RegExp(
    `{perfana-start-dynatrace}`,
    'g',
  );
  url = url.replace(
    perfanaStartDynatracePlaceholder,
    moment(new Date(testRun.start)).format(),
  );
  const perfanaEndDynatracePlaceholder = new RegExp(
    `{perfana-end-dynatrace}`,
    'g',
  );
  url = url.replace(
    perfanaEndDynatracePlaceholder,
    moment(new Date(testRun.end)).format(),
  );
  const perfanaStartElasticPlaceholder = new RegExp(
    `{perfana-start-elasticsearch}`,
    'g',
  );
  url = url.replace(
    perfanaStartElasticPlaceholder,
    moment(new Date(testRun.start)).utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
  );
  const perfanaEndElasticPlaceholder = new RegExp(
    `{perfana-end-elasticsearch}`,
    'g',
  );
  url = url.replace(
    perfanaEndElasticPlaceholder,
    moment(new Date(testRun.end)).utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
  );
  if (testRun.testRunId) {
    const testRunIdPlaceholder = new RegExp(`{perfana-test-run-id}`, 'g');
    url = url.replace(testRunIdPlaceholder, testRun.testRunId);
  }
  if (testRun.CIBuildResultsUrl) {
    const CIBuildResultsUrlPlaceholder = new RegExp(
      `{perfana-build-result-url}`,
      'g',
    );
    url = url.replace(CIBuildResultsUrlPlaceholder, testRun.CIBuildResultsUrl);
  }
  if (previousTestRunId) {
    const previousTestRunIdPlaceholder = new RegExp(
      `{perfana-previous-test-run-id}`,
      'g',
    );
    url = url.replace(previousTestRunIdPlaceholder, previousTestRunId);
  }
  if (baselineTestRunId) {
    const baselineTestRunIdPlaceholder = new RegExp(
      `{perfana-baseline-test-run-id}`,
      'g',
    );
    url = url.replace(baselineTestRunIdPlaceholder, baselineTestRunId);
  }

  const testRunConfigItems = TestRunConfigs.find({
    $and: [
      { application: testRun.application },
      { testType: testRun.testType },
      { testEnvironment: testRun.testEnvironment },
      { testRunId: testRun.testRunId },
    ],
  });

  testRunConfigItems.forEach((configItem) => {
    const key = new RegExp(`{${configItem.key}}`, 'g');
    url = url.replace(key, configItem.value);
  });

  return url;
};
const updateDeepLinkFn = (deepLink, deepLinkId, callback) => {
  DeepLinks.update(
    {
      _id: deepLinkId,
    },
    {
      $set: deepLink,
    },
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    },
  );
};
