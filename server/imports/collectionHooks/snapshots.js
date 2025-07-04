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

import { Snapshots } from '/imports/collections/snapshots';
import { TestRuns } from '/imports/collections/testruns';

import { log } from '/both/logger';

export function setupSnapshotsHook() {
  const snapshotCursor = Snapshots.find({});

  // noinspection JSUnusedLocalSymbols
  const handle = snapshotCursor.observeChanges({
    changed(id, fields) {
      const snapshot = Snapshots.findOne({ _id: id });

      log.debug(
        `Snapshot change detected, id: ${id}` +
          ', field: ' +
          JSON.stringify(fields),
      );

      if (fields.expires !== undefined) {
        TestRuns.update(
          {
            $and: [
              { application: snapshot.application },
              { testEnvironment: snapshot.testEnvironment },
              { testType: snapshot.testType },
              { testRunId: snapshot.testRunId },
            ],
          },
          {
            $set: {
              expires:
                snapshot.expires === 0 ?
                  0
                : new Date().setSeconds(
                    new Date().getSeconds() + snapshot.expires,
                  ),
            },
          },
        );
      }
    },
  });
}
