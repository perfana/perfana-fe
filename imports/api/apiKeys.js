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

import { ApiKeys } from '../collections/apiKeys';
import { createApiKey } from '/server/imports/helpers/apiKey';

Meteor.methods({
  insertApiKey: (description, ttl) => {
    check(description, String);
    check(ttl, String);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'insert.api-key.unauthorized',
        'The user is not authorized to create api keys',
      );
    }

    const wrap = Meteor.makeAsync(createApiKey);
    return wrap(description, ttl);
  },
  getApiKeys: () => {
    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'insert.api-key.unauthorized',
        'The user is not authorized to get api keys',
      );
    }

    const wrap = Meteor.makeAsync(getApiKeysFn);
    return wrap();
  },

  deleteApiKey: (description) => {
    check(description, String);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'insert.api-key.unauthorized',
        'The user is not authorized to create api keys',
      );
    }
    ApiKeys.remove({ description: description });
  },
});

const getApiKeysFn = (callback) => {
  try {
    const apiKeys = ApiKeys.find().fetch();

    if (apiKeys.length > 0) {
      const strippedApiKeys = apiKeys.map((apiKey) => {
        return {
          description: apiKey.description,
          validUntil: apiKey.validUntil,
        };
      });

      callback(null, strippedApiKeys);
    } else {
      callback(null, []);
    }
  } catch (err) {
    callback(err, null);
  }
};
