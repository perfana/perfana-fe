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

import { getTestRun } from '/imports/helpers/utils';

import './testRunMetadata.html';
import './testRunMetadata.less';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

Template.testRunMetadata.onCreated(function () {
  this.userHasPermissionForApplication = new ReactiveVar(false);
});
Template.testRunMetadata.onRendered(function () {
  this.autorun(() => {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      Meteor.call(
        'userHasPermissionForApplication',
        testRun.application,
        (err, result) => {
          if (err) {
            window.toastr['error'](JSON.stringify(result.error), 'Error');
          } else {
            this.userHasPermissionForApplication.set(result.data);
          }
        },
      );
    }
  });
});

Template.testRunMetadata.helpers({
  testRunCompleted() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) return testRun.completed === true ? 'Yes' : 'No';
  },
  testRun() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) return testRun;
  },
  testRunHasTags() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) return testRun.tags && testRun.tags.length > 0;
  },
  testRunHasCIBuildResultsUrl() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun)
      return (
        testRun.CIBuildResultsUrl &&
        testRun.CIBuildResultsUrl.length > 0 &&
        testRun.CIBuildResultsUrl !== 'null' &&
        testRun.CIBuildResultsUrl !== 'unknown'
      );
  },
  testRunHasAnnotations() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) return testRun.annotations && testRun.annotations.length > 0;
  },
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
});

Template.testRunMetadata.events({
  'click div #edit-annotations'(event, template) {
    // event.preventDefault();
    if (event.target.tagName.toLowerCase() !== 'a') {
      if (template.userHasPermissionForApplication.get() === true) {
        Modal.show('testRunAnnotation', this);
      }
    }
  },
  'click div #edit-release'(event, template) {
    event.preventDefault();
    if (template.userHasPermissionForApplication.get() === true) {
      Modal.show('testRunRelease', this);
    }
  },
  'click div #edit-tags'(event, template) {
    event.preventDefault();
    if (template.userHasPermissionForApplication.get() === true) {
      Modal.show('testRunTagsModal', this.testRun);
    }
  },
  'click div #edit-start'(event, template) {
    event.preventDefault();
    if (template.userHasPermissionForApplication.get() === true) {
      Modal.show('testRunEditDateTimeModal', {
        testRun: this.testRun,
        timestamp: 'start',
      });
    }
  },
  'click div #edit-end'(event, template) {
    event.preventDefault();
    if (template.userHasPermissionForApplication.get() === true) {
      Modal.show('testRunEditDateTimeModal', {
        testRun: this.testRun,
        timestamp: 'end',
      });
    }
  },
  'click a.add-tags'(event, template) {
    event.preventDefault();
    if (template.userHasPermissionForApplication.get() === true) {
      Modal.show('testRunTagsModal', this.testRun);
    }
  },
  'click a.add-annotations'(event, template) {
    event.preventDefault();
    if (template.userHasPermissionForApplication.get() === true) {
      Modal.show('testRunAnnotation', this);
    }
  },

  'click div .ci-build-result-url'(event) {
    event.preventDefault();
    window.open($(event.target).text(), '_blank');
  },
});

Template.testRunAnnotation.helpers({
  annotations() {
    return this.testRun.annotations;
  },
});

Template.testRunAnnotation.events({
  'click button#save-testrun-annotations'(event) {
    event.preventDefault();
    const testRun = this.testRun;
    testRun.annotations = $('#annotations').val();
    Meteor.call('updateTestRunAnnotations', testRun);
    // $('#testrun-annotations-modal').modal('hide');
    // noinspection JSCheckFunctionSignatures
    Modal.hide('testRunAnnotation');
  },
});

Template.testRunRelease.helpers({
  release() {
    return this.testRun.applicationRelease;
  },
});

Template.testRunRelease.events({
  'click button#save-testrun-release'(event) {
    event.preventDefault();
    const testRun = this.testRun;
    testRun.applicationRelease = $('#release').val();
    Meteor.call('updateTestRunApplicationRelease', testRun);
    // $('#testrun-release-modal').modal('hide');
    // noinspection JSCheckFunctionSignatures
    Modal.hide('testRunRelease');
  },
});

Template.testRunTagsModal.events({
  'click button#save-tags'(event) {
    event.preventDefault();

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    Meteor.call('updateTestRunTags', testRun, Session.get('tags'), (error) => {
      if (error) {
        window.toastr.clear();
        window.toastr['error'](JSON.stringify(error), 'Error');
      } else {
        window.toastr.clear();
        window.toastr['success']('Done!', 'Saved test run tags');

        // noinspection JSCheckFunctionSignatures
        Modal.hide('testRunTagsModal');
        Session.set('tags', undefined);
      }
    });
  },
});

Template.testRunEditDateTimeModal.onRendered(function () {
  this.$('.datetimepicker').datetimepicker({
    inline: true,
    sideBySide: true,
    defaultDate:
      this.data.timestamp === 'start' ?
        new Date(this.data.testRun.start)
      : new Date(this.data.testRun.end),
    format: 'D MMMM YYYY, HH:mm',
  });
});

Template.testRunEditDateTimeModal.events({
  'click button#save-timestamp'(event) {
    event.preventDefault();

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    const picker = $('.datetimepicker'),
      dateTime = new Date(picker.data('DateTimePicker').date());

    Meteor.call(
      'updateTestRunTimestamp',
      testRun,
      this.timestamp,
      dateTime,
      (error) => {
        if (error) {
          window.toastr.clear();
          window.toastr['error'](JSON.stringify(error), 'Error');
        } else {
          window.toastr.clear();
          window.toastr['success']('Done!', `Saved test run ${this.timestamp}`);

          // noinspection JSCheckFunctionSignatures
          Modal.hide('testRunEditDateTimeModal');
        }
      },
    );
  },
});
