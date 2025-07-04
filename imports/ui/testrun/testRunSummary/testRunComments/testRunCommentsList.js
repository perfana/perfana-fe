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

import { Comments } from '/imports/collections/comments';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import { formatDate } from '/imports/helpers/utils';
import { Meteor } from 'meteor/meteor';
import './testRunCommentsList.html';
import _ from 'lodash';

Template.testRunCommentsList.onCreated(function testRunCommentsListOnCreated() {
  this.comments = new ReactiveVar();

  Meteor.subscribe('comments');
  Meteor.subscribe('grafanas');

  const comments = Comments.find(
    {
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
        { testType: FlowRouter.current().queryParams.workload },
        { testRunId: FlowRouter.current().params.testRunId },
      ],
    },
    { sort: { createdAt: -1 } },
  );

  if (comments) {
    this.comments.set(comments);
  }

  this.autorun(() => {
    if (this.comments && this.comments.get()) {
      Meteor.setTimeout(() => {
        if (this.comments.get().fetch().length > 0)
          Session.set('selectedCommentId', this.comments.get().fetch()[0]._id);
      }, 200);
    }
  });
});

Template.testRunCommentsList.helpers({
  id() {
    return this.testRun._id;
  },
  comments() {
    return Template.instance().comments.get();
  },
  hasGraphUrl() {
    return _.has(this, 'graphUrl');
  },

  commentByCurrentUser() {
    return Meteor.userId() === this.createdBy;
  },
  commentNotByCurrentUser() {
    return Meteor.userId() !== this.createdBy;
  },
  fields() {
    return [
      {
        key: 'updatedAt',
        label: 'Date',
        fn: (value) => {
          return formatDate(value);
        },
        cellClass: 'col-md-2',
      },
      {
        key: 'updatedAt',
        hidden: true,
        sortOrder: 0,
        sortDirection: 'descending',
      }, //hidden column to sort unformatted date
      { key: 'createdByUsername', label: 'From', cellClass: 'col-md-1' },
      { key: 'dashboardLabel', label: 'Dashboard', cellClass: 'col-md-1' },
      {
        key: 'panelTitle',
        label: 'Metric',
        cellClass: 'col-md-2',
        fn: (value) => {
          return value.replace(/[0-9]+-(.*)/, '$1');
        },
      },
      {
        key: 'content',
        label: 'Comment',
        cellClass: 'col-md-6',
        fn: (value) => {
          return new Spacebars.SafeString(getTruncatedContent(value));
        },
      },
      {
        key: '_id',
        label: '',
        fn: (value, object) => {
          return new Spacebars.SafeString(getNewLabel(object));
        },
      },
    ];
  },
  settings() {
    return {
      rowsPerPage: 50,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      noDataTmpl: Template.noComments,
    };
  },
  rowClass() {
    return function (comment) {
      let rowClass = '';

      if (Session.get('selectedCommentId')) {
        if (comment._id === Session.get('selectedCommentId')) {
          rowClass += 'team-selected ';
        }
      }

      const user = Meteor.user();

      if (user) {
        if (
          comment.viewedBy.indexOf(user._id) === -1 &&
          (comment.createdBy !== user._id || comment.replies)
        ) {
          rowClass += 'new-comment';
        }
      }

      return rowClass;
    };
  },
});

Template.testRunCommentsList.events({
  'click .reactive-table tbody tr'() {
    Session.set('selectedCommentId', this._id);

    const comment = Comments.findOne({
      _id: this._id,
    });

    const user = Meteor.user();

    if (user) {
      if (comment.viewedBy.indexOf(user._id) === -1) {
        Meteor.call('updateCommentViewers', comment, user._id, (err) => {
          if (err) {
            toastr.clear();
            toastr['error'](err.reason, 'Error');
          }
        });
      }
    }
  },
});

const getTruncatedContent = (content) => {
  if (content.length > 100) {
    const truncatedContent = content.substring(0, 100);
    return `<span>${truncatedContent} ... </a></span>`;
  } else {
    return `<span>${content}</span>`;
  }
};

const getNewLabel = (comment) => {
  const user = Meteor.user();

  if (user) {
    if (
      comment.viewedBy.indexOf(user._id) === -1 &&
      (comment.createdBy !== user._id || comment.replies)
    ) {
      if (comment.replies) {
        return `<div><span class=" break-word label label-default">new reply</span></div>`;
      } else {
        return `<div><span class=" break-word label label-default">new</span></div>`;
      }
    } else {
      return `<div></div>`;
    }
  } else {
    return `<div></div>`;
  }
};
