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

import { AbortAlertTags } from '../collections/abortAlertTags';
import { userHasPermission } from '../helpers/checkPermission';

if (Meteor.isServer) {
  Meteor.publish('abortAlertTags', () => AbortAlertTags.find());
}

// noinspection JSUnusedGlobalSymbols
Meteor.methods({
  insertAbortAlertTag: (abortAlertTag) => {
    check(abortAlertTag, Object);

    if (!userHasPermission(Meteor.userId(), abortAlertTag.application)) {
      throw new Meteor.Error(
        'insert.abort-alert-tag.unauthorized',
        'The user is not authorized to add abort alert tags for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(insertAbortAlertTagFn);
    return wrap(abortAlertTag);
  },

  updateAbortAlertTag: (abortAlertTag, abortAlertTagId) => {
    check(abortAlertTag, Object);
    check(abortAlertTagId, String);

    if (!userHasPermission(Meteor.userId(), abortAlertTag.$set.application)) {
      throw new Meteor.Error(
        'update.application-dashboard.unauthorized',
        'The user is not authorized to update a dashboard for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(updateAbortAlertTagFn);
    return wrap(abortAlertTag, abortAlertTagId);
  },

  deleteAbortAlertTag: (abortAlertTag) => {
    check(abortAlertTag, Object);

    if (!userHasPermission(Meteor.userId(), abortAlertTag.application)) {
      throw new Meteor.Error(
        'insert.application-dashboard.unauthorized',
        'The user is not authorized to delete abort alert tags for this system under test',
      );
    }
    AbortAlertTags.remove(abortAlertTag._id);
  },
});

const insertAbortAlertTagFn = (abortAlertTag, callback) => {
  AbortAlertTags.insert(abortAlertTag, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const updateAbortAlertTagFn = (abortAlertTag, abortAlertTagId, callback) => {
  AbortAlertTags.update(
    {
      _id: abortAlertTagId,
    },
    {
      $set: abortAlertTag.$set,
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
