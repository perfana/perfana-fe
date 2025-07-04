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

export const getReleaseResults = function (req, res) {
  const testRuns = TestRuns.find(
    {
      $and: [
        { application: req.params.systemUnderTest },
        { applicationRelease: req.params.version },
      ],
    },
    { sort: { end: -1 } },
  ).fetch();

  let releaseResults = { releaseResults: false };

  if (testRuns.length > 0) {
    if (
      testRuns[0].consolidatedResult &&
      testRuns[0].consolidatedResult.overall !== undefined
    ) {
      releaseResults = {
        releaseResults: testRuns[0].consolidatedResult.overall,
        testRun: testRuns[0],
      };
    } else {
      /* if no consolidated results are found, assume no checks have been configured and the release results are OK */

      releaseResults = {
        releaseResults: true,
        testRun: testRuns[0],
      };
    }
  }

  res.status(200).json(releaseResults);
};
