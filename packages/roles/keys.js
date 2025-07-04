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

Roles.keys = {};

/**
 * Initialize the collection
 */
Roles.keys.collection = new Meteor.Collection("nicolaslopezj_roles_keys");

/**
 * Set the permissions
 * Users can request keys just for them
 */
Roles.keys.collection.allow({
  insert: function (userId, doc) {
    return userId === doc.userId;
  },
  remove: function (userId, doc) {
    return userId === doc.userId;
  },
});

/**
 * Requests a new key
 * @param  {String} userId    Id of the userId
 * @param  {Date}   expiresAt Date of expiration
 * @return {String}           Id of the key
 */
Roles.keys.request = function (userId, expiresAt) {
  check(userId, String);
  var doc = {
    userId: userId,
    createdAt: new Date(),
  };
  if (expiresAt) {
    check(expiresAt, Date);
    doc.expiresAt = expiresAt;
  }
  return this.collection.insert(doc);
};

/**
 * Returns the userId of the specified key and deletes the key from the database
 * @param  {String}  key
 * @param  {Boolean} dontDelete True to leave the key in the database
 * @return {String}             Id of the user
 */
Roles.keys.getUserId = function (key, dontDelete) {
  check(key, String);
  check(dontDelete, Match.Optional(Boolean));

  var doc = this.collection.findOne({
    _id: key,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gte: new Date() } },
    ],
  });
  if (!doc) return;

  if (!dontDelete) {
    if (!doc.expiresAt) {
      console.log("borrando por no tener expire at");
      this.collection.remove({ _id: key });
    } else {
      if (moment(doc.expiresAt).isBefore(moment())) {
        console.log("borrando por expire at ya pasó");
        this.collection.remove({ _id: key });
      }
    }
  }

  return doc.userId;
};
