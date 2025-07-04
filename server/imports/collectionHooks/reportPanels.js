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

import { ReportPanels } from '/imports/collections/reportPanels';

export function setupReportPanelsHook() {
  ReportPanels.after.insert(function (userId, doc) {
    const reportPanels = ReportPanels.find(
      {
        $and: [
          { application: doc.application },
          { testEnvironment: doc.testEnvironment },
          { testType: doc.testType },
        ],
      },
      { sort: { index: 1 } },
    ).fetch();

    reportPanels.forEach((storedReportPanel, index) => {
      ReportPanels.update(
        {
          _id: storedReportPanel._id,
        },
        {
          $set: {
            index: index,
          },
        },
      );
    });
  });
}
