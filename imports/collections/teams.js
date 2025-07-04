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

import { Organisations } from './organisations';

export const Teams = new Mongo.Collection('teams');

const TeamSchema = new SimpleSchema({
  organisation: {
    type: String,
    autoform: {
      type: 'universe-select',
      create: true,
      createOnBlur: true,
      options: [],
      optionsMethod: 'getOrganisations',
      defaultValue: function () {
        return getDefaultOrganisation();
      },
    },
  },

  name: {
    type: String,
    regEx: /^[a-zA-Z0-9\s]+$/,
  },
  description: {
    type: String,
    optional: true,
    autoform: {
      translate: false,
    },
  },
});

Teams.attachSchema(TeamSchema);

SimpleSchema.messages({
  'regEx name': 'Only alphanumeric characters and spaces allowed in team name',
});

if (Meteor.isClient) {
  Meteor.subscribe('organisations');
  window.Teams = Teams;
  window.TeamSchema = TeamSchema;
}

export const getDefaultOrganisation = () => {
  const organisation = Organisations.findOne({});

  if (organisation) {
    return organisation.name;
  } else {
    return 'Perfana';
  }
};
