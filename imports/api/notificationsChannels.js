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

import { NotificationsChannels } from '../collections/notificationChannels';
import { userHasPermission } from '../helpers/checkPermission';
import { Applications } from '../collections/applications';
import { Teams } from '../collections/teams';

if (Meteor.isServer) {
  Meteor.publish('notificationsChannels', () => NotificationsChannels.find());
}

// noinspection JSUnusedGlobalSymbols
Meteor.methods({
  getNotificationsChannels: (query) => {
    check(query, Object);

    if (!Meteor.userId()) {
      throw new Meteor.Error(
        'get.notifications-channels.unauthorized',
        'The user is not authorized to get notifications channels',
      );
    }

    const wrap = Meteor.makeAsync(getNotificationsChannelsFn);
    return wrap(query);
  },
  insertNotificationsChannel: (notificationsChannel) => {
    check(notificationsChannel, Object);

    if (!userHasPermission(Meteor.userId(), notificationsChannel.application)) {
      throw new Meteor.Error(
        'insert.notifications-channel.unauthorized',
        'The user is not authorized to add a notifications channel for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(insertNotificationsChannelFn);
    return wrap(notificationsChannel);
  },
  updateNotificationsChannel: (
    notificationsChannel,
    notificationsChannelId,
  ) => {
    check(notificationsChannel, Object);
    check(notificationsChannelId, String);

    if (
      !userHasPermission(Meteor.userId(), notificationsChannel.$set.application)
    ) {
      throw new Meteor.Error(
        'update.notifications-channel.unauthorized',
        'The user is not authorized to update a notifications channel for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(updateNotificationsChannelFn);
    return wrap(notificationsChannel, notificationsChannelId);
  },
  deleteNotificationsChannel: (notificationsChannel) => {
    check(notificationsChannel, Object);

    if (!userHasPermission(Meteor.userId(), notificationsChannel.application)) {
      throw new Meteor.Error(
        'delete.notifications-channel.unauthorized',
        'The user is not authorized to delete a notifications channel for this system under test',
      );
    }
    NotificationsChannels.remove(notificationsChannel._id);
  },
});

const getNotificationsChannelsFn = (query, callback) => {
  try {
    const notificationsChannels = NotificationsChannels.find(query, {
      sort: { type: 1 },
    }).fetch();

    notificationsChannels.forEach(
      (notificationsChannel, notificationsChannelIndex) => {
        notificationsChannel.includeUserMentions =
          notificationsChannel.includeUserMentions
            ? notificationsChannel.includeUserMentions
            : [];
        if (notificationsChannel.includeUserMentions.length > 0) {
          for (
            let i = notificationsChannel.includeUserMentions.length - 1;
            i >= 0;
            i--
          ) {
            if (notificationsChannel.includeUserMentions[i] !== null) {
              const user = Meteor.users.findOne({
                _id: notificationsChannel.includeUserMentions[i].id,
              });
              if (user) {
                delete notificationsChannels[notificationsChannelIndex]
                  .includeUserMentions[i]._id;
                notificationsChannels[
                  notificationsChannelIndex
                ].includeUserMentions[i].name = user.profile.name;
              }
            } else {
              notificationsChannels[
                notificationsChannelIndex
              ].includeUserMentions.splice(i, 1);
            }
          }
        }
        if (notificationsChannel.teamChannel === true) {
          const application = Applications.findOne({
            name: notificationsChannel.application,
          });

          if (application) {
            const team = Teams.findOne({ _id: application.team });

            if (team) {
              notificationsChannels[notificationsChannelIndex].team = team.name;
            }
          }
        }
        if (notificationsChannel.sendWhenAnyTeamMemberIsMentioned === true) {
          const application = Applications.findOne({
            name: notificationsChannel.application,
          });

          const team = Teams.findOne({ _id: application.team });

          if (team) {
            const teamMembers = Meteor.users
              .find(
                { 'profile.memberOf.teams': team._id },
                { fields: { 'profile.name': 1 } },
              )
              .fetch();

            // if(notificationsChannels[notificationsChannelIndex].includeUserMentions.length === 0) {
            teamMembers.forEach((teamMember) => {
              if (
                notificationsChannels[
                  notificationsChannelIndex
                ].includeUserMentions
                  .map((user) => user.name)
                  .indexOf(teamMember.profile.name) === -1
              )
                notificationsChannels[
                  notificationsChannelIndex
                ].includeUserMentions.push({
                  name: teamMember.profile.name,
                  id: teamMember._id,
                });
            });
            // }
          }
        }
      },
    );

    callback(null, notificationsChannels);
  } catch (err) {
    callback(err, null);
  }
};
const insertNotificationsChannelFn = (notificationsChannel, callback) => {
  NotificationsChannels.insert(notificationsChannel, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const updateNotificationsChannelFn = (
  notificationsChannel,
  notificationsChannelId,
  callback,
) => {
  const modifier = {};
  if (notificationsChannel.$set) modifier.$set = notificationsChannel.$set;
  if (notificationsChannel.$unset)
    modifier.$unset = notificationsChannel.$unset;

  NotificationsChannels.update(
    {
      _id: notificationsChannelId,
    },
    modifier,
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    },
  );
};
