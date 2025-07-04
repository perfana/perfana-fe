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

import { Comments } from '/imports/collections/comments';
import { TestRuns } from '../collections/testruns';
import { NotificationsChannels } from '../collections/notificationChannels';
import { sendCommentsNotifications } from '/server/imports/helpers/sendNotifications';
import { Applications } from '../collections/applications';
import { Teams } from '../collections/teams';
import _ from 'lodash';

if (Meteor.isServer) {
  Meteor.publish('comments', () => Comments.find());
}

Meteor.methods({
  insertComment: (comment, notificationsChannels) => {
    check(comment, Object);
    check(notificationsChannels, Match.OneOf(undefined, null, [String]));

    const wrap = Meteor.makeAsync(insertCommentFn);

    return wrap(comment, notificationsChannels);
  },
  updateComment: (comment) => {
    check(comment, Object);

    const wrap = Meteor.makeAsync(updateCommentFn);

    return wrap(comment);
  },
  deleteComment: (id) => {
    check(id, String);
    const wrap = Meteor.makeAsync(deleteCommentFn);

    return wrap(id);
  },
  updateCommentViewers: (comment, userId) => {
    check(comment, Object);
    check(userId, String);

    const wrap = Meteor.makeAsync(updateCommentViewersFn);

    return wrap(comment, userId);
  },
});

const insertCommentFn = (comment, notificationsChannelIds, callback) => {
  const notificationsChannelIdsArray = notificationsChannelIds
    ? notificationsChannelIds
    : [];

  const testRun = TestRuns.findOne({
    $and: [
      { application: comment.application },
      { testRunId: comment.testRunId },
    ],
  });

  // noinspection RegExpRedundantEscape
  const mentionUsersRegex = new RegExp('\\@([^:]+):', 'gm');

  const mentionUsers = comment.content.match(mentionUsersRegex);

  const mentionUserIds = [];

  if (mentionUsers) {
    mentionUsers.forEach((mentionUser) => {
      const user = Meteor.users.findOne({
        'profile.name': mentionUser.replace('@', '').replace(':', ''),
      });
      if (user) mentionUserIds.push(user._id);
    });
  }

  const teamMemberIds = [];

  const application = Applications.findOne({
    name: comment.application,
  });

  const team = Teams.findOne({ _id: application.team });

  if (team) {
    const teamMembers = Meteor.users
      .find({ 'profile.memberOf.teams': team._id }, { fields: { _id: 1 } })
      .fetch();

    teamMembers.forEach((teamMember) => {
      if (teamMemberIds.indexOf(teamMember._id) === -1)
        teamMemberIds.push(teamMember._id);
    });
  }

  let query;

  if (_.intersection(teamMemberIds, mentionUserIds).length > 0) {
    // if mention users contain team members

    query = {
      $or: [
        { _id: { $in: notificationsChannelIdsArray } },
        { 'includeUserMentions.id': { $in: mentionUserIds } },
        {
          $and: [
            { application: comment.application },
            { sendWhenAnyTeamMemberIsMentioned: true },
          ],
        },
      ],
    };
  } else {
    query = {
      $or: [
        { _id: { $in: notificationsChannelIdsArray } },
        { 'includeUserMentions.id': { $in: mentionUserIds } },
      ],
    };
  }

  const notificationsChannels = NotificationsChannels.find(query).fetch();

  comment.notificationChannelIds = notificationsChannels.map(
    (notificationsChannel) => {
      return notificationsChannel._id;
    },
  );

  const insertedComment = Comments.insert(comment);

  sendCommentsNotifications(testRun, comment, notificationsChannels, (err) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, insertedComment);
    }
  });
};
const updateCommentFn = (comment, callback) => {
  try {
    const updatedComment = Comments.update(
      { _id: comment._id },
      { $set: comment },
    );
    if (
      comment.notificationChannelIds &&
      comment.notificationChannelIds.length > 0
    ) {
      const testRun = TestRuns.findOne({
        $and: [
          { application: comment.application },
          { testRunId: comment.testRunId },
        ],
      });

      const notificationsChannels = NotificationsChannels.find({
        _id: { $in: comment.notificationChannelIds },
      }).fetch();

      sendCommentsNotifications(
        testRun,
        comment,
        notificationsChannels,
        (err) => {
          if (err) {
            callback(err, null);
          } else {
            callback(null, updatedComment);
          }
        },
      );
    } else {
      callback(null, updatedComment);
    }
  } catch (e) {
    callback(e, null);
  }
};
const deleteCommentFn = (id, callback) => {
  try {
    const comment = Comments.findOne({ _id: id });

    if (
      comment.createdBy === Meteor.userId() ||
      Roles.userHasRole(Meteor.userId(), 'admin')
    ) {
      const deletedComment = Comments.remove({ _id: id });
      callback(null, deletedComment);
    } else {
      callback('User not allowed to delete this comment', null);
    }
  } catch (e) {
    callback(e, null);
  }
};

const updateCommentViewersFn = (comment, userId, callback) => {
  try {
    Comments.update(
      {
        _id: comment._id,
      },
      {
        $push: {
          viewedBy: userId,
        },
      },
    );

    callback(null, true);
  } catch (e) {
    callback(e, null);
  }
};
