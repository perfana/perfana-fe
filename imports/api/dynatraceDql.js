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
import { DynatraceDql } from '../collections/dynatraceDql';
import { userHasPermission } from '../helpers/checkPermission';
import { check } from 'meteor/check';

if (Meteor.isServer) {
  Meteor.publish('dynatraceDql', function () {
    if (!this.userId) {
      return this.ready();
    }

    return DynatraceDql.find();
  });
}

Meteor.methods({
  'dynatraceDql.insert': function (doc) {
    check(doc, Object);

    if (!userHasPermission(Meteor.userId(), doc.application)) {
      throw new Meteor.Error(
        'dynatrace-dql.insert.unauthorized',
        'The user is not authorized to insert DQL queries for this application',
      );
    }

    return DynatraceDql.insert(doc);
  },

  'dynatraceDql.update': function (modifier, id) {
    check(modifier, Object);
    check(id, String);

    const existingDoc = DynatraceDql.findOne(id);
    if (!existingDoc) {
      throw new Meteor.Error('dynatrace-dql.not-found', 'DQL query not found');
    }

    // Check permission using either the existing doc or the modifier data
    const applicationToCheck =
      modifier.$set?.application || existingDoc.application;
    if (!userHasPermission(Meteor.userId(), applicationToCheck)) {
      throw new Meteor.Error(
        'dynatrace-dql.update.unauthorized',
        'The user is not authorized to update DQL queries for this application',
      );
    }

    return DynatraceDql.update(id, modifier);
  },

  'dynatraceDql.remove': function (id) {
    check(id, String);

    const existingDoc = DynatraceDql.findOne(id);
    if (!existingDoc) {
      throw new Meteor.Error('dynatrace-dql.not-found', 'DQL query not found');
    }

    if (!userHasPermission(Meteor.userId(), existingDoc.application)) {
      throw new Meteor.Error(
        'dynatrace-dql.remove.unauthorized',
        'The user is not authorized to remove DQL queries for this application',
      );
    }

    return DynatraceDql.remove(id);
  },
});
