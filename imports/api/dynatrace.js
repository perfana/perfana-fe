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
import { dynatraceApiGet } from '../helpers/dynatrace-api';
import { Dynatrace } from '../collections/dynatrace';
import { userHasPermission } from '../helpers/checkPermission';
import { check } from 'meteor/check';
import { log } from '/both/logger';

if (Meteor.isServer) {
  Meteor.publish('dynatrace', () => Dynatrace.find());
}

Meteor.methods({
  isDynatraceConfigured: () => {
    return !!(Meteor.settings.dynatraceApiToken && Meteor.settings.dynatraceUrl);
  },
  getDynatraceEntities: (application) => {
    check(application, String);

    if (!userHasPermission(Meteor.userId(), application)) {
      throw new Meteor.Error(
        'get.dynatrace-entity-id.unauthorized',
        'The user is not authorized to get Dynatrace entity ids for system under test',
      );
    }
    const wrap = Meteor.makeAsync(getDynatraceEntitiesFn);

    return wrap();
  },
  getDynatraceProblems: (testRun, entityId) => {
    check(testRun, Object);
    check(entityId, String);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'get.dynatrace-problems.unauthorized',
        'The user is not authorized to get Dynatrace problems for system under test',
      );
    }

    const wrap = Meteor.wrapAsync(getDynatraceProblemsFn);

    return wrap(testRun, entityId);
  },
});

const getDynatraceEntitiesFn = (callback) => {
  if (Meteor.settings.dynatraceApiToken) {
    dynatraceApiGet(
      '/api/v2/entities?pageSize=1500&entitySelector=type%28%22SERVICE%22%29',
    )
      .then((result) => {
        const entityValues = result.entities.map((entity) => ({
          label: entity.displayName,
          value: entity.entityId,
        }));

        callback(null, entityValues);
      })
      .catch((err) => {
        callback(err, null);
      });
  } else {
    callback(null, []);
  }
};

const getDynatraceProblemsFn = (testRun, entityId, callback) => {
  const start = new Date(testRun.start).getTime();
  const end = new Date(testRun.end).getTime();

  dynatraceApiGet(
    `/api/v1/problem/feed?startTimestamp=${start}&endTimestamp=${end}`,
  )
    .then((response) => {
      const applicationProblems = response.result.problems.filter((problem) => {
        return problem.rankedImpacts
          .map((impactItem) => {
            return impactItem && impactItem.entityId;
          })
          .indexOf(entityId);
      });

      callback(null, applicationProblems);
    })
    .catch((err) => {
      log.error(JSON.stringify(err));
      callback(err, null);
    });
};
