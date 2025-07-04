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

/* eslint-disable meteor/no-session */
import { Session } from 'meteor/session';

export const GenericDeepLinks = new Mongo.Collection('genericDeepLinks');

const GenericDeepLinksSchema = new SimpleSchema({
  profile: {
    type: String,
    autoform: {
      defaultValue: () => {
        return Session.get('profileName') ? Session.get('profileName') : '';
      },
      readonly: () => {
        return Session.get('profileReadOnly') === true;
      },
      custom: () => {
        if (Session.get('profileReadOnly') === true) {
          setTimeout(() => {
            $('select[name="profile"]').prop('disabled', true);
            $('input[name="profile"]').attr(
              'title',
              'This cannot be changed for default Perfana profiles',
            );
            $('input[name="profile"]').attr('style', 'color: grey !important;');
          }, 500);
        }
      },
    },
  },
  name: {
    type: String,
  },
  url: {
    type: String,
  },
});

GenericDeepLinks.attachSchema(GenericDeepLinksSchema);

if (Meteor.isClient) {
  window.GenericDeepLinks = GenericDeepLinks;
  window.GenericDeepLinksSchema = GenericDeepLinksSchema;
}
