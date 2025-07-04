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
import { TestRuns } from '/imports/collections/testruns';
import { ReportPanels } from '/imports/collections/reportPanels';
import { ReportRequirements } from '/imports/collections/reportRequirements';
import { userHasPermission } from '../helpers/checkPermission';
import { log } from '/both/logger';
import _ from 'lodash';

if (Meteor.isServer) {
  Meteor.publish('reportPanels', (query) => {
    check(query, Match.OneOf(undefined, null, Object));
    log.debug(
      '######### reportPanels subscription query: ' + JSON.stringify(query),
    );

    if (
      query.$and.length === 0 ||
      query.$and.some((obj) => Object.keys(obj).length === 0)
    ) {
      return [];
    } else {
      return ReportPanels.find(query);
    }
  });
}

Meteor.methods({
  applyReportSpecs: (testRun) => {
    check(testRun, Object);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'insert.report-panel.unauthorized',
        'The user is not authorized to update reports for this system under test',
      );
    }

    const wrap = Meteor.makeAsync(applyReportSpecsFn);

    return wrap(testRun);
  },
  insertReportPanel: (reportPanel) => {
    check(reportPanel, Object);

    if (!userHasPermission(Meteor.userId(), reportPanel.application)) {
      throw new Meteor.Error(
        'insert.report-panel.unauthorized',
        'The user is not authorized to create a report panel',
      );
    }

    const wrap = Meteor.makeAsync(insertReportPanelFn);
    return wrap(reportPanel);
  },
  updateReportPanel: (reportPanel, reportPanelId) => {
    check(reportPanel, Object);
    check(reportPanelId, String);

    if (!userHasPermission(Meteor.userId(), reportPanel.application)) {
      throw new Meteor.Error(
        'insert.report-panel.unauthorized',
        'The user is not authorized to create a a report panel',
      );
    }

    const wrap = Meteor.makeAsync(updateReportPanelFn);
    return wrap(reportPanel, reportPanelId);
  },

  deleteReportPanel: (application, testEnvironment, testType, index) => {
    check(application, String);
    check(testEnvironment, String);
    check(testType, String);
    check(index, Number);

    if (!userHasPermission(Meteor.userId(), application)) {
      throw new Meteor.Error(
        'delete.report-panel.unauthorized',
        'The user is not authorized to delete a report panel',
      );
    }

    ReportPanels.remove({
      $and: [
        { application: application },
        { testEnvironment: testEnvironment },
        { testType: testType },
        { index: index },
      ],
    });

    /* update indexes */

    const updateReportPanels = ReportPanels.find(
      {
        $and: [
          { application: application },
          { testEnvironment: testEnvironment },
          { testType: testType },
          { index: { $gt: index } },
        ],
      },
      { sort: { index: 1 } },
    ).fetch();

    _.each(updateReportPanels, (panel) => {
      ReportPanels.update(
        {
          $and: [
            { application: panel.application },
            { testEnvironment: panel.testEnvironment },
            { testType: panel.testType },
            { index: panel.index },
          ],
        },
        {
          $set: {
            index: panel.index - 1,
          },
        },
      );
    });
  },

  updateApplicationReportSpecsByIndex: (
    oldIndex,
    newIndex,
    application,
    testEnvironment,
    testType,
  ) => {
    check(oldIndex, Number);
    check(newIndex, Number);
    check(application, String);
    check(testEnvironment, String);
    check(testType, String);

    if (!userHasPermission(Meteor.userId(), application)) {
      throw new Meteor.Error(
        'insert.generic-report-panel.unauthorized',
        'The user is not authorized to update a generic report panel',
      );
    }

    const wrap = Meteor.makeAsync(updateReportPanelsByIndexFn);
    return wrap(oldIndex, newIndex, application, testEnvironment, testType);
  },

  generateReport: (testRun) => {
    check(testRun, Object);

    if (!userHasPermission(Meteor.userId(), testRun.application)) {
      throw new Meteor.Error(
        'insert.report.unauthorized',
        'The user is not authorized to create a a report for this system under test',
      );
    }

    const reportPanels = ReportPanels.find(
      {
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
        ],
      },
      { sort: { index: 1 } },
    ).fetch();

    _.each(reportPanels, (reportPanel) => {
      TestRuns.update(
        {
          _id: testRun._id,
        },
        {
          $push: {
            reportAnnotations: {
              application: reportPanel.application,
              testType: reportPanel.testType,
              testEnvironment: reportPanel.testEnvironment,
              grafana: reportPanel.grafana,
              dashboardName: reportPanel.dashboardName,
              dashboardLabel: reportPanel.dashboardLabel,
              dashboardUid: reportPanel.dashboardUid,
              index: reportPanel.index,
              panel: reportPanel.panel,
            },
          },
        },
      );
    });

    const reportRequirements = ReportRequirements.find(
      {
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
        ],
      },
      { sort: { index: 1 } },
    ).fetch();

    _.each(reportRequirements, (reportRequirement) => {
      TestRuns.update(
        {
          _id: testRun._id,
        },
        {
          $push: {
            reportRequirements: {
              requirementText: reportRequirement.requirementText,
              requirementResult: reportRequirement.requirementResult,
              index: reportRequirement.index,
            },
          },
        },
      );
    });

    // let updatedTestrun = TestRuns.findOne({
    //     _id: testRun._id
    // });

    /* set expiry to never for all snapshots */

    // const snapshots = Snapshots.find({
    //     testRunId: updatedTestrun.testRunId
    // })
    //
    // snapshots.forEach((snapshot) => {
    //
    //     Meteor.call('updateSnapshot', updatedTestrun, snapshot, 0, (error, testRun) => {  // set expiry to 0
    //
    //         if(error) {
    //             console.log('Error updating snapshot expiry: ' + JSON.stringify(error));
    //         } else if(testRun.error) {
    //             console.log('Error updating snapshot expiry: ' + JSON.stringify(testRun.error));
    //         }
    //
    //     });
    // });
  },
});

const applyReportSpecsFn = (testRun, callback) => {
  const reportSpecs = ReportPanels.find(
    {
      $and: [
        { application: testRun.application },
        { testEnvironment: testRun.testEnvironment },
        { testType: testRun.testType },
      ],
    },
    { sort: { index: 1 } },
  ).fetch();

  const updatedTestRunReportPanels = [];

  if (testRun.reportAnnotations && testRun.reportAnnotations.length > 0) {
    _.each(reportSpecs, (reportSpec, index) => {
      let reportHasAnnotation = false;

      _.each(testRun.reportAnnotations, (testRunAnnotation) => {
        if (
          reportSpec.dashboardUid === testRunAnnotation.dashboardUid &&
          reportSpec.panel.id === testRunAnnotation.panel.id
        ) {
          testRunAnnotation.index = index;
          updatedTestRunReportPanels.push(testRunAnnotation);
          reportHasAnnotation = true;
        }
      });

      if (reportHasAnnotation === false) {
        const reportSpecObject = {
          application: reportSpec.application,
          dashboardName: reportSpec.dashboardName,
          dashboardLabel: reportSpec.dashboardLabel,
          dashboardUid: reportSpec.dashboardUid,
          testEnvironment: reportSpec.testEnvironment,
          testType: reportSpec.testType,
          grafana: reportSpec.grafana,
          panel: reportSpec.panel,
          index: reportSpec.index,
        };

        updatedTestRunReportPanels.push(reportSpecObject);
      }
    });
  } else {
    _.each(reportSpecs, (reportSpec) => {
      const reportSpecObject = {
        application: reportSpec.application,
        dashboardName: reportSpec.dashboardName,
        dashboardLabel: reportSpec.dashboardLabel,
        dashboardUid: reportSpec.dashboardUid,
        testEnvironment: reportSpec.testEnvironment,
        testType: reportSpec.testType,
        grafana: reportSpec.grafana,
        panel: reportSpec.panel,
        index: reportSpec.index,
      };

      updatedTestRunReportPanels.push(reportSpecObject);
    });
  }

  TestRuns.update(
    {
      _id: testRun._id,
    },
    {
      $set: {
        reportAnnotations: updatedTestRunReportPanels,
      },
    },
  );

  callback(null, testRun);
};

const insertReportPanelFn = (reportPanel, callback) => {
  const reportPanels = ReportPanels.find({
    $and: [
      { application: reportPanel.application },
      { testEnvironment: reportPanel.testEnvironment },
      { testType: reportPanel.testType },
    ],
  }).fetch();

  reportPanel.index = reportPanels.length;

  ReportPanels.insert(reportPanel, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const updateReportPanelFn = (reportPanel, reportPanelId, callback) => {
  const modifier = {};
  if (!reportPanel.$set && !reportPanel.$unset) {
    modifier.$set = reportPanel;
  } else {
    if (reportPanel.$set) {
      modifier.$set = reportPanel.$set;
    }

    if (reportPanel.$unset) {
      modifier.$unset = reportPanel.$unset;
    }
  }

  ReportPanels.update(
    {
      _id: reportPanelId,
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
const updateReportPanelsByIndexFn = (
  oldIndex,
  newIndex,
  application,
  testEnvironment,
  testType,
  callback,
) => {
  ReportPanels.update(
    {
      $and: [
        { application: application },
        { testEnvironment: testEnvironment },
        { testType: testType },
        { index: oldIndex },
      ],
    },
    {
      $set: {
        index: newIndex,
      },
    },
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    },
  );
};
