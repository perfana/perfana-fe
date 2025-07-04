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
import { Applications } from './applications';
import { Meteor } from 'meteor/meteor';
import _ from 'lodash';

export const NotificationsChannels = new Mongo.Collection(
  'notificationsChannels',
);

const NotificationsChannelsSchema = new SimpleSchema({
  application: {
    type: String,
    index: 1,
    optional: true,
    label: 'System under test',
    autoform: {
      defaultValue: function () {
        return Session.get('application') ? Session.get('application') : '';
      },
      readOnly: function () {
        return Session.get('application') !== null;
      },
      type: 'hidden',
    },
  },

  type: {
    label: 'Channel type',
    type: String,
    autoform: {
      defaultValue: 'slack',
      options: [
        { label: 'Google Chat', value: 'google' },
        { label: 'Slack', value: 'slack' },
        { label: 'Teams', value: 'teams' },
      ],
    },
  },
  name: {
    label: 'Channel name, e.g. #support',
    type: String,
  },
  // description: {
  //     label: 'Channel description',
  //     type: String,
  //     autoform: {
  //         defaultValue: function () {
  //             if (AutoForm.getFieldValue(this.name.replace('description', 'name'))){
  //                 return AutoForm.getFieldValue(this.name.replace('description', 'name'))
  //             }
  //         },
  //     }
  // },
  webHookUrl: {
    type: String,
  },
  notifyWhenTestRunFinished: {
    label: 'Send notification when a test run has finished',
    type: Boolean,
    optional: true,
    autoform: {
      defaultValue: false,
      type: function () {
        if (Session.get('application') !== undefined) {
          return '';
        } else {
          return 'hidden';
        }
      },
    },
  },
  notifyWhenTestRunFailed: {
    label: 'Send notification for failed test runs only',
    type: Boolean,
    optional: true,
    autoform: {
      defaultValue: true,
      type: function () {
        if (
          AutoForm.getFieldValue('notifyWhenTestRunFinished') === true &&
          Session.get('application') !== undefined
        ) {
          return '';
        } else {
          return 'hidden';
        }
      },
    },
  },
  sendWhenAnyTeamMemberIsMentioned: {
    label:
      'Send notification to this channel if any of the team members are mentioned in comments',
    type: Boolean,
    optional: true,
    autoform: {
      defaultValue: false,
      type: function () {
        if (applicationLinkedToTeam()) {
          return '';
        } else {
          return 'hidden';
        }
      },
    },
  },
  includeUserMentions: {
    type: [Object],
    optional: true,
  },
  'includeUserMentions.$.id': {
    label: 'Name',
    type: String,
    optional: true,
    autoform: {
      type: 'universe-select',
      create: true,
      createOnBlur: true,
      options: [],
      optionsMethod: 'getMentionUsersForNotificationsChannel',
      // optionsMethodParams: function () {
      //     if (AutoForm.getFieldValue(this.name.replace(/variables\.[0-9]+\.name/, 'grafana')) && AutoForm.getFieldValue(this.name.replace(/variables\.[0-9]+\.name/, 'dashboardName')))
      //         return { filter: true,  grafanaLabel: AutoForm.getFieldValue(this.name.replace(/variables\.[0-9]+\.name/, 'grafana')), dashboardName: AutoForm.getFieldValue(this.name.replace(/variables\.[0-9]+\.name/, 'dashboardName'))};
      //
      // },
      uniPlaceholder: 'Type or select from list',
    },
  },
  teamChannel: {
    label:
      'Use as team notifications channel (for all systems under test for this team)',
    // label: function (){
    //     return createLabel();
    // },
    type: Boolean,
    optional: true,
    autoform: {
      defaultValue: false,
      type: function () {
        if (applicationLinkedToTeam()) {
          return '';
        } else {
          return 'hidden';
        }
      },
    },
  },
  team: {
    type: String,
    optional: true,
    label: 'team',
    autoform: {
      type: 'hidden',
    },
  },
});

NotificationsChannels.attachSchema(NotificationsChannelsSchema);

const applicationLinkedToTeam = () => {
  const application = Applications.findOne({
    name: Session.get('application'),
  });

  return _.has(application, 'team');
};

if (Meteor.isClient) {
  // Meteor.subscribe('reportPanels');
  window.NotificationsChannels = NotificationsChannels;
  window.NotificationsChannelsSchema = NotificationsChannelsSchema;
  Meteor.subscribe('applications');
  Meteor.subscribe('teams');
}
