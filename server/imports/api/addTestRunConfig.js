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

import { check } from 'meteor/check';
import { TestRunConfigs } from '/imports/collections/testrunConfigs';
import { log } from '/both/logger';
import _ from 'lodash';
import safeRegex from 'safe-regex';

export const addTestRunConfig = function (req, res) {
  try {
    check(req.body, {
      application: String,
      testEnvironment: String,
      testType: String,
      testRunId: String,
      tags: [String],
      key: String,
      value: String,
    });

    TestRunConfigs.insert(req.body);

    res.status(200).send({ message: 'Test run config key value pair added' });
  } catch (e) {
    const message = 'Failed to add test run config json, ' + e;
    log.error(message);

    res.status(500).send({ message: message });
  }
};

export const addTestRunConfigs = function (req, res) {
  try {
    check(req.body, {
      application: String,
      testEnvironment: String,
      testType: String,
      testRunId: String,
      tags: [String],
      configItems: [Object],
    });

    const testRunConfigBase = {
      application: req.body.application,
      testEnvironment: req.body.testEnvironment,
      testType: req.body.testType,
      testRunId: req.body.testRunId,
      tags: req.body.tags,
    };

    req.body.configItems.forEach((configItem) => {
      TestRunConfigs.insert(
        _.extend(testRunConfigBase, {
          key: configItem.key,
          value: configItem.value,
        }),
      );
    });

    res.status(200).send({ message: 'Test run config key value pairs added' });
  } catch (e) {
    const message = 'Failed to add test run config json, ' + e;
    log.error(message);

    res.status(500).send({ message: message });
  }
};

export const addTestRunConfigJson = function (req, res) {
  try {
    check(req.body, {
      application: String,
      testEnvironment: String,
      testType: String,
      testRunId: String,
      tags: [String],
      includes: [String],
      excludes: [String],
      json: Object,
    });

    const includes = req.body.includes;

    // check for malicious regex

    includes.forEach((include) => {
      if (!safeRegex(include)) {
        throw new Error('Malicious regex detected!');
      }
    });

    const excludes = req.body.excludes;

    excludes.forEach((exclude) => {
      if (!safeRegex(exclude)) {
        throw new Error('Malicious regex detected!');
      }
    });

    const flatJSON = flattenJSON(req.body.json);

    const keyValuePairs = [];

    Object.keys(flatJSON).forEach((key) => {
      if (keyValuePairs.length > 0) {
        const keyValuePairIndex = keyValuePairs.findIndex((keyValuePair) => {
          if (keyValuePair.key.includes('.')) {
            return (
              keyValuePair.key.replace(/\//g, '.').split('.')[
                keyValuePair.key.replace(/\//g, '.').split('.').length - 1
              ] === 'name' &&
              key.replace(/\//g, '.').split('.')[
                key.replace(/\//g, '.').split('.').length - 1
              ] === 'value' &&
              keyValuePair.key
                .replace(/\//g, '.')
                .split('.')
                .slice(0, keyValuePair.key.split('.').length - 1)
                .join('.') ===
                key
                  .replace(/\//g, '.')
                  .split('.')
                  .slice(0, key.split('.').length - 1)
                  .join('.')
            );
          } else {
            return false;
          }
        });
        let mergedKeyValuePair;
        if (keyValuePairIndex !== -1) {
          mergedKeyValuePair = {
            key:
              keyValuePairs[keyValuePairIndex].key
                .replace(/\//g, '.')
                .split('.')
                .slice(
                  0,
                  keyValuePairs[keyValuePairIndex].key.split('.').length - 1,
                )
                .join('.') +
              '.' +
              keyValuePairs[keyValuePairIndex].value,
            value: flatJSON[key],
          };
          keyValuePairs[keyValuePairIndex] = mergedKeyValuePair;
        } else {
          keyValuePairs.push({ key: key, value: flatJSON[key] });
        }
      } else {
        keyValuePairs.push({ key: key, value: flatJSON[key] });
      }
    });

    keyValuePairs.forEach((keyValuePair) => {
      if (
        includes.some((whitelistMatch) =>
          keyValuePair.key.match(_.escapeRegExp(whitelistMatch)),
        )
      ) {
        // noinspection JSCheckFunctionSignatures
        if (
          !excludes.some((blacklistMatch) =>
            keyValuePair.key.match(_.escapeRegExp(blacklistMatch)),
          )
        ) {
          _.extend(req.body, keyValuePair);
          TestRunConfigs.insert(req.body);
        }
      }
    });
    res.status(200).send({ message: 'Test run config json added' });
  } catch (e) {
    const message = 'Failed to add test run config json, ' + e;
    log.error(message);

    res.status(500).send({ message: message });
  }
};

const flattenJSON = (obj = {}, res = {}, extraKey = '') => {
  // eslint-disable-next-line no-undef
  for (const key in obj) {
    if (typeof obj[key] !== 'object') {
      res[extraKey + key] = obj[key];
    } else {
      flattenJSON(obj[key], res, `${extraKey}${key}.`);
    }
  }
  return res;
};
