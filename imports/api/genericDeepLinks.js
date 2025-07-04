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

import { GenericDeepLinks } from '../collections/genericDeeplinks';

if (Meteor.isServer) {
  Meteor.publish('genericDeepLinks', () => GenericDeepLinks.find());
}

// noinspection JSUnusedGlobalSymbols
Meteor.methods({
  insertGenericDeepLink: (genericDeepLink) => {
    check(genericDeepLink, Object);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'insert.generic-deep-link.unauthorized',
        'The user is not authorized to create a generic deep link',
      );
    }

    const wrap = Meteor.makeAsync(insertGenericDeepLinkFn);
    return wrap(genericDeepLink);
  },
  updateGenericDeepLink: (genericDeepLink, genericDeepLinkId) => {
    check(genericDeepLink, Object);
    check(genericDeepLinkId, String);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'update.generic-deep-link.unauthorized',
        'The user is not authorized to update a generic deep link',
      );
    }

    const wrap = Meteor.makeAsync(updateGenericDeepLinkFn);
    return wrap(genericDeepLink, genericDeepLinkId);
  },
  deleteGenericDeepLink: (genericDeepLink) => {
    check(genericDeepLink, Object);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'delete.generic-deep-link.unauthorized',
        'The user is not authorized to delete a generic deep link',
      );
    }

    GenericDeepLinks.remove({ _id: genericDeepLink._id });
  },
});

const insertGenericDeepLinkFn = (genericDeepLink, callback) => {
  GenericDeepLinks.insert(genericDeepLink, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const updateGenericDeepLinkFn = (
  genericDeepLink,
  genericDeepLinkId,
  callback,
) => {
  GenericDeepLinks.update(
    {
      _id: genericDeepLinkId,
    },
    {
      $set: genericDeepLink.$set,
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
