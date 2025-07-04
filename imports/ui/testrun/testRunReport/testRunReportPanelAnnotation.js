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

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import './testRunReportPanelAnnotation.html';

import { ReportPanels } from '../../../collections/reportPanels';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';

Template.testRunReportPanelAnnotation.onCreated(function () {
  this.setAsDefaultAnnotation = new ReactiveVar(false);

  const reportPanelsQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };

  Meteor.subscribe('reportPanels', reportPanelsQuery);
});

Template.testRunReportPanelAnnotation.helpers({
  setAsDefaultAnnotation() {
    return Template.instance().setAsDefaultAnnotation.get();
  },
});

Template.testRunReportPanelAnnotation.events({
  'click div #restore-default-annotation'(event) {
    event.preventDefault();

    const annotationIndex = this.reportAnnotations.index;

    const reportAnnotations = ReportPanels.find({
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
        { testType: FlowRouter.current().queryParams.workload },
      ],
    }).fetch();

    const defaultAnnotation = reportAnnotations.filter(
      (reportAnnotation) => reportAnnotation.index === annotationIndex,
    )[0].panel.annotation;

    const testRun = this.testRun;

    const index =
      testRun.reportAnnotations ?
        testRun.reportAnnotations
          .map((reportAnnotation) => {
            return reportAnnotation.panel.id;
          })
          .indexOf(this.reportAnnotations.panel.id)
      : 0;

    if (!testRun.reportAnnotations) testRun.reportAnnotations = [];

    testRun.reportAnnotations[index].panel.annotation = defaultAnnotation;

    Meteor.call('updateTestRunReportAnnotations', testRun, (err, result) => {
      if (result.error) {
        window.toastr.clear();
        window.toastr['error'](JSON.stringify(result.error), 'Error');
      } else {
        window.toastr.clear();
        window.toastr['success']('Done!', 'Restored default annotation!');
        $('#annotations').val(defaultAnnotation);
      }
    });
  },
  'click div #save-testrun-annotations'(event) {
    event.preventDefault();
    const testRun = this.testRun;

    const index =
      testRun.reportAnnotations ?
        testRun.reportAnnotations.findIndex(
          (reportAnnotation) =>
            reportAnnotation.panel.id === this.reportAnnotations.panel.id &&
            reportAnnotation.dashboardUid ===
              this.reportAnnotations.dashboardUid,
        )
      : 0;

    if (!testRun.reportAnnotations) testRun.reportAnnotations = [];

    testRun.reportAnnotations[index].panel.annotation = $('#annotations').val();

    Meteor.call('updateTestRunReportAnnotations', testRun, (err, result) => {
      if (result.error) {
        window.toastr.clear();
        window.toastr['error'](JSON.stringify(result.error), 'Error');
      } else {
        window.toastr.clear();
        window.toastr['success']('Done!', 'Updated report!');
        $('#testreport-panel-annotations-modal').modal('hide');
      }
    });

    if ($('#set-as-default').is(':checked')) {
      const reportPanel = ReportPanels.findOne({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
          { dashboardUid: testRun.reportAnnotations[index].dashboardUid },
          { 'panel.id': testRun.reportAnnotations[index].panel.id },
        ],
      });

      if (reportPanel) {
        reportPanel.panel.annotation = $('#annotations').val();

        Meteor.call(
          'updateReportPanel',
          reportPanel,
          reportPanel._id,
          (err, result) => {
            if (err) {
              window.toastr.clear();
              window.toastr['error'](JSON.stringify(err), 'Error');
            } else {
              if (result.error) {
                window.toastr.clear();
                window.toastr['error'](JSON.stringify(result.error), 'Error');
              } else {
                window.toastr.clear();
                window.toastr['success']('Done!', 'Set as default annotation!');
              }
            }
          },
        );
      }
    }
  },
});
