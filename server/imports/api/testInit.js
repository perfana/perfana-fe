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
import { TestRuns } from '/imports/collections/testruns';
import safeRegex from 'safe-regex';

export const initTest = function (req, res) {
  try {
    let counter = 1;

    check(req.body, {
      systemUnderTest: String,
      workload: String,
      testEnvironment: String,
    });

    const testRunPattern = new RegExp(
      `^${req.body.systemUnderTest}-${req.body.testEnvironment}-${req.body.workload}-[0-9]+$`,
    );

    if (!safeRegex(testRunPattern)) {
      return res.status(400).send({ message: 'Malicious regex detected!' });
    }

    const testRuns = TestRuns.find(
      {
        $and: [
          { application: req.body.systemUnderTest },
          { testType: req.body.workload },
          { testEnvironment: req.body.testEnvironment },
          { testRunId: { $regex: testRunPattern } },
        ],
      },
      { sort: { testRunId: -1 } },
    ).fetch();

    if (testRuns.length > 0) {
      // split the testRunId and get the last part, then increment it by 1

      const testRunParts = testRuns[0].testRunId.split('-');
      const counterPart = testRunParts[testRunParts.length - 1];
      counter = parseInt(counterPart) + 1;
      // add leading zeros to the counter
      if (counter < 10) {
        counter = '0000' + counter;
      } else if (counter < 100) {
        counter = '000' + counter;
      } else if (counter < 1000) {
        counter = '00' + counter;
      } else if (counter < 10000) {
        counter = '0' + counter;
      }

      res.status(200).json({
        testRunId: `${req.body.systemUnderTest}-${req.body.testEnvironment}-${req.body.workload}-${counter}`,
      });
    } else {
      res.status(200).json({
        testRunId: `${req.body.systemUnderTest}-${req.body.testEnvironment}-${req.body.workload}-00001`,
      });
    }
  } catch (e) {
    res.status(500).send({ message: e.message });
  }
};
