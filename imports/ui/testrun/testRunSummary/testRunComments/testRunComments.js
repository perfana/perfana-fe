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

// noinspection JSJQueryEfficiency

import { Comments } from '/imports/collections/comments';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import { getTestRun, renderGrafanaPanelSoloUrl } from '/imports/helpers/utils';
import { Meteor } from 'meteor/meteor';
import { NotificationsChannels } from '/imports/collections/notificationChannels';
import './testRunComments.html';
import './testRunComments.less';
import { ApplicationDashboards } from '/imports/collections/applicationDashboards';
import _ from 'lodash';

Template.testRunComments.onCreated(function testRunCommentsOnCreated() {
  this.commentsLoaded = new ReactiveVar(false);

  Meteor.subscribe('comments');
  Meteor.subscribe('grafanas');
  const snapshotQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
      { testRunId: FlowRouter.current().params.testRunId },
    ],
  };
  Meteor.subscribe('snapshots', snapshotQuery, 'testRunComments');

  const applicationDashboardQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
    ],
  };
  Meteor.subscribe('applicationDashboards', applicationDashboardQuery);
  Meteor.subscribe('configuration');
});

Template.testRunComments.helpers({
  commentsLoaded() {
    return Template.instance().commentsLoaded.get();
  },
  comments() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const comments = Comments.find(
        {
          $and: [
            { application: this.testRun.application },
            { testEnvironment: this.testRun.testEnvironment },
            { testType: this.testRun.testType },
            { testRunId: this.testRun.testRunId },
          ],
        },
        { sort: { createdAt: -1 } },
      );

      if (comments) {
        Template.instance().commentsLoaded.set(true);
        return comments;
      }
    }
  },
  selectedCommentId() {
    return Session.get('selectedCommentId');
  },
  commentSelected() {
    return Session.get('selectedCommentId') !== undefined;
  },
  hasComments() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const comments = Comments.find(
        {
          $and: [
            { application: this.testRun.application },
            { testEnvironment: this.testRun.testEnvironment },
            { testType: this.testRun.testType },
            { testRunId: this.testRun.testRunId },
          ],
        },
        { sort: { createdAt: -1 } },
      );

      if (comments) {
        Template.instance().commentsLoaded.set(true);
        return comments.fetch().length > 0;
      }
    }
  },
  testRunExpired() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      return testRun.expired === true;
    }
  },
});

Template.testRunComments.events({
  'click #add-comment'(event) {
    event.preventDefault();
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    const graphModalParams = {
      testRun: testRun,
    };

    Modal.show('commentsModal', graphModalParams);
  },
});

Template.testRunComment.onCreated(function () {
  this.comment = new ReactiveVar();

  this.autorun(() => {
    const comment = Comments.findOne({
      _id: Session.get('selectedCommentId'),
    });

    if (comment) this.comment.set(comment);
  });
});

Template.testRunComment.helpers({
  id() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );
    if (testRun) return testRun._id;
  },
  comment() {
    return Template.instance().comment.get();
  },

  hasGraphUrl() {
    const comment = Template.instance().comment.get();
    return _.has(comment, 'graphUrl');
  },

  commentByCurrentUser() {
    const comment = Template.instance().comment.get();
    return Meteor.userId() === comment.createdBy;
  },
  showReplyBox() {
    const comment = Template.instance().comment.get();
    return (
      Meteor.userId() !== comment.createdBy ||
      (comment.replies && comment.replies.length > 0)
    );
  },
  commentNotByCurrentUser() {
    return Meteor.userId() !== this.createdBy;
  },
  replyByCurrentUser(reply) {
    return Meteor.userId() === reply.createdBy;
  },
  setTheme(graphUrl) {
    const user = Meteor.user();

    if (user && user.profile.theme) {
      return graphUrl.replace(
        /theme=(dark|light)/,
        `theme=${user.profile.theme}`,
      );
    }
  },
  testRunExpired() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      return testRun.expired === true;
    }
  },
  graphUrl(comment) {
    if (comment.panelId && comment.dashboardUid) {
      const testRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      );

      if (testRun) {
        const applicationDashboard = ApplicationDashboards.findOne({
          $and: [
            { application: testRun.application },
            { testEnvironment: testRun.testEnvironment },
            { dashboardUid: comment.dashboardUid },
            { dashboardLabel: comment.dashboardLabel },
          ],
        });

        return renderGrafanaPanelSoloUrl(
          testRun,
          applicationDashboard.dashboardLabel,
          applicationDashboard.grafana,
          applicationDashboard.dashboardUid,
          comment.panelId,
        );
        // let dataRetention = getDataRetention(applicationDashboard);
        // let showSnapShot = new Date().getTime() - new Date(testRun.end).getTime() > (dataRetention * 1000);

        /* get snapshot */

        // const snapshot = Snapshots.findOne({
        //     $and: [
        //         {application: testRun.application},
        //         {testEnvironment: testRun.testEnvironment},
        //         {testType: testRun.testType},
        //         {testRunId: testRun.testRunId},
        //         {dashboardUid: comment.dashboardUid},
        //         {dashboardLabel: comment.dashboardLabel},
        //     ]
        // })
        //
        // if (snapshot) {
        //
        //     let grafana = Grafanas.findOne({label: snapshot.grafana});
        //
        //     let queryParams = `&fullscreen`
        //
        //     return renderGrafanaSnapshotPanelUrl(snapshot.url, comment.panelId, testRun, snapshot, grafana, queryParams)
        //
        // }

        // if (showSnapShot) {

        /* get snapshot */

        //     const snapshot = Snapshots.findOne({
        //         $and: [
        //             {application: testRun.application},
        //             {testEnvironment: testRun.testEnvironment},
        //             {testType: testRun.testType},
        //             {testRunId: testRun.testRunId},
        //             {dashboardUid: comment.dashboardUid},
        //             {dashboardLabel: comment.dashboardLabel},
        //         ]
        //     })
        //
        //     if (snapshot) {
        //
        //         let grafana = Grafanas.findOne({label: snapshot.grafana});
        //
        //         let queryParams = `&fullscreen`
        //
        //         return renderGrafanaSnapshotPanelUrl(snapshot.url, comment.panelId, testRun, snapshot, grafana, queryParams)
        //
        //     }
        //
        // } else {
        //
        //     return renderGrafanaPanelSoloUrl(testRun, applicationDashboard.dashboardLabel, applicationDashboard.grafana, applicationDashboard.dashboardUid, comment.panelId );
        // }
      }
    } else {
      // legacy comments

      const user = Meteor.user();

      if (user && user.profile.theme) {
        return comment.graphUrl.replace(
          /theme=(dark|light)/,
          `theme=${user.profile.theme}`,
        );
      }
    }
  },
});

Template.testRunComment.events({
  'click button#delete-comment'() {
    swal({
      title: 'Delete comment',
      text: 'Are you sure?',
      icon: 'warning',
      buttons: ['Cancel', 'OK'],
      dangerMode: true,
    }).then((willDelete) => {
      //bound to the current `this`
      if (willDelete) {
        Meteor.call('deleteComment', this.commentId, (err) => {
          if (err) {
            toastr.clear();
            toastr['error'](err.reason, 'Error');
          } else {
            toastr.clear();
            toastr['info']('Comment deleted', 'Info');
            Session.set('selectedCommentId', undefined);
          }
        });

        swal.close();
      } else {
        swal.close();
      }
    });
  },
  'click button#delete-reply'(event) {
    swal({
      title: 'Delete reply',
      text: 'Are you sure?',
      icon: 'warning',
      buttons: ['Cancel', 'OK'],
      dangerMode: true,
    }).then((willDelete) => {
      //bound to the current `this`
      if (willDelete) {
        const comment = Comments.findOne({
          _id: Session.get('selectedCommentId'),
        });

        const index = event.currentTarget.getAttribute('reply-index');
        comment.replies.splice(index, 1);

        Meteor.call('updateComment', comment, (err) => {
          if (err) {
            toastr.clear();
            toastr['error'](err.reason, 'Error');
          } else {
            Session.set('dashboardUid', undefined);
            Session.set('dashboardLabel', undefined);
            Session.set('panelId', undefined);
            $('#comment-text').val('');
          }
        });

        swal.close();
      } else {
        swal.close();
      }
    });
  },
});

Template.commentBox.onCreated(function () {
  this.panelWidth = new ReactiveVar(1500);
  Meteor.subscribe('notificationsChannels');
  Meteor.subscribe('configuration');
  const applicationDashboardQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
    ],
  };
  Meteor.subscribe('applicationDashboards', applicationDashboardQuery);
  this.autorun(() => {});
});

Template.commentBox.onRendered(function () {
  const self = this;

  if (this.data.panelId !== undefined)
    Session.set('panelId', this.data.panelId);
  if (this.data.dashboardUid !== undefined)
    Session.set('dashboardUid', this.data.dashboardUid);
  if (this.data.dashboardLabel !== undefined)
    Session.set('dashboardLabel', this.data.dashboardLabel);
  if (this.data.grafana !== undefined)
    Session.set('grafana', this.data.grafana);
  if (this.data.panelTitle !== undefined)
    Session.set('panelTitle', this.data.panelTitle);
  Session.set('notificationsChannels', undefined);

  this.autorun(() => {
    const currentWidth = self.$('panel-body .grafana-iframe').width();
    if (currentWidth > 0) self.panelWidth.set(currentWidth);
  });

  Meteor.call('mentionUsers', (err, mentionUsers) => {
    $('.comment-text-area').mention({
      delimiter: '@',
      users: mentionUsers.data,
    });

    // const notificationsChannels = NotificationsChannels.find({
    //     $or: [
    //         { application: FlowRouter.current().queryParams.systemUnderTest },
    //         { application: { $exists: false }}
    //     ]
    // }).fetch();
    //
    // $('.comment-text-area').channel({
    //     channelDelimiter: '#',
    //     channels: notificationsChannels.map((notificationsChannel) => {
    //         return {
    //             name: notificationsChannel.name,
    //             description: notificationsChannel.description
    //         }
    //     })
    // })
  });
});

Template.commentBox.helpers({
  setTheme(graphUrl) {
    const user = Meteor.user();

    if (user && user.profile.theme) {
      return graphUrl.replace(
        /theme=(dark|light)/,
        `theme=${user.profile.theme}`,
      );
    }
  },
  hasNotificationsChannels() {
    return (
      NotificationsChannels.find({
        $or: [
          { application: FlowRouter.current().queryParams.systemUnderTest },
          { application: { $exists: false } },
        ],
      }).fetch().length > 0
    );
  },
  dashboardIsSet() {
    return this.dashboardUid !== undefined;
  },
  panelIsSet() {
    return this.panelId !== undefined;
  },
  dashboardSelected() {
    return Session.get('dashboardUid') !== undefined;
  },
  panelSelected() {
    return Session.get('panelId') !== undefined;
  },
  hasGraphPreviewUrl() {
    if (
      Session.get('dashboardUid') !== undefined &&
      Session.get('dashboardLabel') !== undefined &&
      Session.get('panelId') !== undefined
    ) {
      const testRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      );

      if (testRun) {
        const applicationDashboard = ApplicationDashboards.findOne({
          $and: [
            { application: testRun.application },
            { testEnvironment: testRun.testEnvironment },
            { dashboardUid: Session.get('dashboardUid') },
            { dashboardLabel: Session.get('dashboardLabel') },
          ],
        });

        return !!applicationDashboard;
      }
    }
  },
  graphPreviewUrl() {
    if (
      Session.get('dashboardUid') !== undefined &&
      Session.get('dashboardLabel') !== undefined &&
      Session.get('panelId') !== undefined
    ) {
      const testRun = getTestRun(
        FlowRouter.current().queryParams.systemUnderTest,
        FlowRouter.current().params.testRunId,
      );

      if (testRun) {
        const applicationDashboard = ApplicationDashboards.findOne({
          $and: [
            { application: testRun.application },
            { testEnvironment: testRun.testEnvironment },
            { dashboardUid: Session.get('dashboardUid') },
            { dashboardLabel: Session.get('dashboardLabel') },
          ],
        });

        return renderGrafanaPanelSoloUrl(
          testRun,
          applicationDashboard.dashboardLabel,
          applicationDashboard.grafana,
          applicationDashboard.dashboardUid,
          Session.get('panelId'),
        );
      }
    }
  },
  reply() {
    return this.reply === true;
  },
  commentPlaceholder() {
    if (this.reply === true) {
      return 'Reply to this comment';
    } else {
      return 'Comment on this test run';
    }
  },
  commentBoxHeader() {
    if (this.reply === true) {
      return 'reply';
    } else {
      return 'comment';
    }
  },
  testRunExpired() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      return testRun.expired === true;
    }
  },
});

Template.commentBox.events({
  'click button#submit-comment'() {
    const commentDate = new Date();
    const user = Meteor.user();
    const comment = {
      application: FlowRouter.current().queryParams.systemUnderTest,
      testType: FlowRouter.current().queryParams.workload,
      testEnvironment: FlowRouter.current().queryParams.testEnvironment,
      testRunId: FlowRouter.current().params.testRunId,
      dashboardLabel: Session.get('dashboardLabel'),
      dashboardUid: Session.get('dashboardUid'),
      panelId: Session.get('panelId'),
      panelTitle: Session.get('panelTitle'),
      createdBy: user._id,
      viewedBy: [],
      createdByUsername: user.profile.name,
      createdAt: commentDate,
      updatedAt: commentDate,
      // content: $('#comment-text').val()
    };
    if (this.dashboardUid !== undefined) {
      comment['content'] = $('#modal-comment-text').val();
    } else {
      comment['content'] = $('#comment-text').val();
    }

    if ($('iframe.comments-graph-preview').attr('src'))
      comment['graphUrl'] = $('iframe.comments-graph-preview').attr('src');

    Meteor.call(
      'insertComment',
      comment,
      Session.get('notificationsChannels'),
      (err, insertedCommentId) => {
        if (err) {
          toastr.clear();
          toastr['error'](err.reason, 'Error');
        } else {
          if (insertedCommentId.error) {
            toastr.clear();
            toastr['error'](JSON.stringify(insertedCommentId.error), 'Error');
          } else {
            toastr.clear();
            window.toastr['success']('Done!', 'Added comment');

            Session.set('dashboardUid', undefined);
            Session.set('dashboardLabel', undefined);
            Session.set('panelTitle', undefined);
            Session.set('panelId', undefined);
            Session.set('selectedCommentId', insertedCommentId.data);

            $('#comment-text').val('');
            $('#modal-comment-text').val('');

            // noinspection JSCheckFunctionSignatures
            Modal.hide('commentsModal');

            const application =
              FlowRouter.current().queryParams.systemUnderTest;
            const testType = FlowRouter.current().queryParams.workload;
            const testEnvironment =
              FlowRouter.current().queryParams.testEnvironment;
            const testRunId = FlowRouter.current().params.testRunId;

            const notification = {
              application: application,
              testType: testType,
              testEnvironment: testEnvironment,
              testRunId: testRunId,
              createdAt: new Date(),
              createdBy: user._id,
              message: `${user.profile.name} commented on test run ${testRunId}`,
            };

            Meteor.call('insertNotification', notification);

            if (!FlowRouter.current().path.includes('tab=comments')) {
              const params = { testRunId: testRunId };
              const queryParams = {
                systemUnderTest: application,
                workload: testType,
                testEnvironment: testEnvironment,
                tab: 'comments',
              };
              BlazeLayout.reset();

              FlowRouter.go('testRunSummary', params, queryParams);
            }
          }
        }
      },
    );
  },
  'click button#submit-reply'() {
    const user = Meteor.user();

    const comment = Comments.findOne({
      _id: Session.get('selectedCommentId'),
    });

    if (!comment.replies) comment.replies = [];

    const commentsDate = new Date();

    comment.replies.push({
      createdBy: user._id,
      createdByUsername: user.profile.name,
      createdAt: commentsDate,
      content: $('textarea#reply-text').val(),
    });

    comment['updatedAt'] = commentsDate;
    comment['viewedBy'] = [user._id];

    Meteor.call('updateComment', comment, (err) => {
      if (err) {
        toastr.clear();
        toastr['error'](err.reason, 'Error');
      } else {
        Session.set('dashboardUid', undefined);
        Session.set('dashboardLabel', undefined);
        Session.set('panelId', undefined);
        $('#reply-text').val('');

        const application = FlowRouter.current().queryParams.systemUnderTest;
        const testType = FlowRouter.current().queryParams.workload;
        const testEnvironment =
          FlowRouter.current().queryParams.testEnvironment;
        const testRunId = FlowRouter.current().params.testRunId;

        const notification = {
          application: application,
          testType: testType,
          testEnvironment: testEnvironment,
          testRunId: testRunId,
          createdAt: new Date(),
          createdBy: user._id,
          message: `${user.profile.name} replied to comment on test run ${testRunId}`,
        };

        Meteor.call('insertNotification', notification);
      }
    });
  },
});
