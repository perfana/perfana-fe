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

import { TestRuns } from '/imports/collections/testruns';
import { log } from '/both/logger';
import {
  getFixedBaselineTestRun,
  getPreviousTestRun,
} from '/imports/helpers/utils';
import _ from 'lodash';

export const getTestRun = function (req, res) {
  try {
    const testRun = TestRuns.findOne({
      $and: [
        { application: req.params.systemUnderTest },
        { testRunId: req.params.testRunId },
      ],
    });

    if (testRun) {
      const baselineTestRunId = getFixedBaselineTestRun(testRun);
      const previousTestRunId = getPreviousTestRun(testRun, true);

      if (previousTestRunId)
        _.extend(testRun, { previousTestRunId: previousTestRunId });
      if (baselineTestRunId)
        _.extend(testRun, { baselineTestRunId: baselineTestRunId });

      res.status(200).json(testRun);
    } else {
      res.status(404).send('Test run not found');
    }
  } catch (e) {
    log.error('get test run call failed, error: ' + e);

    res.status(400).send(e);
  }
};
