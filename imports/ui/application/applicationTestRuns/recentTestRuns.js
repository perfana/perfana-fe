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

// noinspection HtmlUnknownAttribute,JSJQueryEfficiency

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { log } from '/both/logger';

import swal from 'sweetalert';
import {
  formatDate,
  getTestRunById,
  humanReadableDuration,
} from '../../../helpers/utils';

import './recentTestRuns.html';
import './recentTestRuns.less';

import { Applications } from '../../../collections/applications';
import { TestRuns } from '../../../collections/testruns';
import { DsChangepoints } from '../../../collections/dsChangePoints';
import { DsControlGroups } from '../../../collections/dsControlGroups';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import { Teams } from '../../../collections/teams';
import { Comments } from '../../../collections/comments';
import async from 'async';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import _ from 'lodash';

Template.recentTestRuns.onCreated(function testrunsOnCreated() {
  this.currentTime = new ReactiveVar(new Date().valueOf());

  Meteor.setInterval(() => {
    this.currentTime.set(new Date().valueOf());
  }, 5000); // ms

  // Meteor.subscribe('grafanas');
  // Meteor.subscribe('comments');

  this.recentTestRuns = new ReactiveVar();

  Session.set('adaptEnabled', false);

  this.selectedTestruns = new ReactiveArray();

  this.testRunQuery = new ReactiveVar();

  this.userHasPermissionForApplication = new ReactiveVar(false);

  const currentPage = new ReactiveVar(Session.get('current-page') || 0);
  const rowsPerPage = new ReactiveVar(Session.get('rows-per-page') || 10);

  this.currentPage = currentPage;
  this.rowsPerPage = rowsPerPage;

  const dsChangePointQuery = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
      { testRunId: FlowRouter.current().params.testRunId },
    ],
  };

  Meteor.subscribe('dsChangepoints', dsChangePointQuery);

  Meteor.subscribe(
    'applications',
    {},
    {
      onReady: () => {
        const application = Applications.findOne({
          name: FlowRouter.current().queryParams.systemUnderTest,
        });

        if (application) {
          Meteor.call(
            'userHasPermissionForApplication',
            application.name,
            (err, result) => {
              if (result.error) {
                log.error(JSON.stringify(result.error));
              } else {
                this.userHasPermissionForApplication.set(result.data);
              }
            },
          );

          let testTypeIndex;

          const testEnvironmentIndex = application.testEnvironments
            .map((testEnvironment) => {
              return testEnvironment.name;
            })
            .indexOf(FlowRouter.current().queryParams.testEnvironment);

          if (testEnvironmentIndex !== -1) {
            testTypeIndex = application.testEnvironments[
              testEnvironmentIndex
            ].testTypes
              .map((testType) => {
                return testType.name;
              })
              .indexOf(FlowRouter.current().queryParams.workload);
          }
          if (testEnvironmentIndex !== -1 && testTypeIndex !== -1) {
            Session.set(
              'adaptEnabled',
              application.testEnvironments[testEnvironmentIndex].testTypes[
                testTypeIndex
              ].runAdapt === true,
            );
          }
        }
      },
    },
  );

  const baseQuery = {
    $and: [
      // queryCompletedOr,
      { expired: false },
    ],
  };

  this.autorun(function () {
    FlowRouter.watchPathChange();

    if (Session.get('reset-table') === true) {
      currentPage.set(0);
      // noinspection JSCheckFunctionSignatures
      rowsPerPage.get(10);
      Session.set('reset-table', false);
    } else {
      Session.set('current-page', currentPage.get());
      Session.set('rows-per-page', rowsPerPage.get());
    }

    const query = JSON.parse(JSON.stringify(baseQuery));

    const teamName = Session.get('team');
    const application = Session.get('application');
    const testEnvironment = Session.get('testEnvironment');
    const testType = Session.get('testType');

    /* update subscription based on filters*/

    if (teamName !== undefined && application === undefined) {
      const team = Teams.findOne({ name: teamName });
      if (team) {
        const teamApplications = Applications.find({ team: team._id }).fetch();
        if (teamApplications.length > 0) {
          query.$and.push({
            application: {
              $in: teamApplications.map((teamApplication) => {
                return teamApplication.name;
              }),
            },
          });
        } else {
          query.$and.push({ application: 'none' }); // dummy application to return no results
        }
      }
    }

    if (application !== undefined) {
      query.$and.push({ application: application });
    }

    if (testEnvironment !== undefined)
      query.$and.push({ testEnvironment: testEnvironment });
    if (testType !== undefined) query.$and.push({ testType: testType });
    if (Session.get('tags') !== undefined && Session.get('tags').length > 0)
      query.$and.push({ tags: { $all: Session.get('tags') } });

    const dsControlGroupQuery = {
      $and: [
        { application: application },
        { testEnvironment: testEnvironment },
        { testType: testType },
      ],
    };

    if (
      Meteor.subscribe('testRuns', 'recentTestRuns', 500, query).ready() &&
      Meteor.subscribe('dsControlGroups', dsControlGroupQuery).ready()
    ) {
      // create new query object based on query and add  filter on end time stamp
      const recentTestRunQuery = Object.assign({}, query, {
        $and: (query.$and || []).concat([
          {
            $or: [
              {
                end: {
                  $lte: new Date(
                    Template.instance().currentTime.get() - 30 * 1000,
                  ), // 30 seconds ago
                },
              },
              {
                completed: true,
              },
            ],
          },
        ]),
      });

      let recentTestRuns = TestRuns.find(recentTestRunQuery, {
        sort: { end: -1 },
      }).fetch();

      // if  testType is set, get control groups
      if (testType !== undefined) {
        const dsControlGroups = DsControlGroups.find(dsControlGroupQuery, {
          sort: { lastDatetime: -1 },
        }).fetch();
        if (dsControlGroups.length > 0) {
          recentTestRuns = recentTestRuns.map((testRun) => {
            // if testRunId is in control group testRunIds array, add controlGroup: true to testRun
            if (dsControlGroups[0].testRuns.includes(testRun.testRunId)) {
              return Object.assign({}, testRun, { controlGroup: true });
            }
            return testRun;
          });
        }
      }

      if (recentTestRuns)
        Template.instance().recentTestRuns.set(recentTestRuns);
    }
  });
});

Template.recentTestRuns.helpers({
  recentTestRuns() {
    const testRuns = Template.instance().recentTestRuns.get();
    return testRuns || [];
  },
  testEnvironmentSelected() {
    return Session.get('testEnvironment') !== undefined;
  },

  fields() {
    return [
      { key: 'application', label: 'System under test' },
      { key: 'applicationRelease', label: 'Version' },
      { key: 'testEnvironment', label: 'Test environment' },
      { key: 'testType', label: 'Workload' },
      {
        key: 'testRunId',
        label: 'Test run ID',
        fn: (value, object) => {
          return new Spacebars.SafeString(createLink(object));
        },
      },
      {
        key: 'start',
        label: 'Start',
        fn: (value) => {
          const sortValue = new Date(value).getTime();
          return new Spacebars.SafeString(
            '<span sort=' + sortValue + '>' + formatDate(value) + '</span>',
          );
        },
      },
      { key: 'end', hidden: true, sortOrder: 0, sortDirection: 'descending' },
      {
        key: 'end',
        label: 'End',
        fn: (value) => {
          const sortValue = new Date(value).getTime();
          return new Spacebars.SafeString(
            '<span sort=' + sortValue + '>' + formatDate(value) + '</span>',
          );
        },
      },
      {
        key: 'duration',
        label: 'Duration',
        fn: (value) => {
          return humanReadableDuration(value);
        },
      },
      {
        key: '_id',
        label: '',
        fn: (value, object) => {
          return new Spacebars.SafeString(getTestRunAnnotationsTooltip(object));
        },
      },
      {
        key: '_id',
        label: '',
        fn: (value, object) => {
          return new Spacebars.SafeString(getTestRunBaselineIcon(object));
        },
      },
      {
        key: '_id',
        label: '',
        fn: (value, object) => {
          return new Spacebars.SafeString(getTestRunChangePointIcon(object));
        },
      },
      {
        key: '_id',
        label: '',
        fn: (value, object) => {
          return new Spacebars.SafeString(getControlGroupIcon(object));
        },
      },
      {
        key: '_id',
        label: '',
        fn: (value, object) => {
          return new Spacebars.SafeString(getReport(object));
        },
      },
      {
        key: '_id',
        label: 'Result',
        fn: (value, object) => {
          return new Spacebars.SafeString(
            getConsolidatedBenchmarkResults(object),
          );
        },
      },
      {
        key: '_id',
        label: '',
        fn: (value, object) => {
          return new Spacebars.SafeString(getComments(object));
        },
      },
      {
        key: '_id',
        sortable: false,
        label: () => {
          return new Spacebars.SafeString(getTestRunMenu());
        },
        isVisible: Template.instance().userHasPermissionForApplication,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-testrun" class="fa fa-trash reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete test run"></i>`,
          );
        },
      },
      {
        key: '_id',
        sortable: false,
        label: () => {
          return new Spacebars.SafeString(
            `<input id="select-all-testruns" type='checkbox' />`,
          );
        },
        isVisible: Template.instance().userHasPermissionForApplication,
        fn: (value, object) => {
          return new Spacebars.SafeString(
            `<input testrun-id=${object._id} id="select-testrun" class="reactive-table-icon" type='checkbox' />`,
          );
        },
        cellClass: 'select-test-run',
      },
    ];
  },

  settings() {
    return {
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      noDataTmpl: Template.noTestRuns,
      currentPage: Template.instance().currentPage,
      rowsPerPage: Template.instance().rowsPerPage,
    };
  },

  apiKeys() {
    const apiKeys = Template.instance().apiKeys.get();
    return apiKeys || [];
  },
});

Template.recentTestRuns.events({
  'mouseenter .reactive-table tbody tr td i'(event) {
    event.preventDefault();

    tippy('[data-tippy-content]', {
      theme: 'light-border',
      allowHTML: true,
    });
  },
  'click .reactive-table tbody tr'(event) {
    const testRun = this;
    const reportParams = {
      systemUnderTest: testRun.application,
      testEnvironment: testRun.testEnvironment,
      workload: testRun.testType,
      testRunId: testRun.testRunId,
    };
    const params = {
      systemUnderTest: testRun.application,
      testRunId: testRun.testRunId,
    };
    const queryParams = {
      systemUnderTest: testRun.application,
      workload: testRun.testType,
      testEnvironment: testRun.testEnvironment,
      tab: 'comments',
    };

    switch (event.target.id) {
      case 'delete-testrun':
        swal({
          title: 'Delete test run',
          text: testRun.testRunId,
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            Meteor.call('deleteTestRun', this._id, (error) => {
              if (error) {
                window.toastr.clear();
                window.toastr['error'](
                  error.reason,
                  `Error deleting test run ${testRun.testRunId}, error: ${error.reason}`,
                );
              } else {
                window.toastr.clear();
                window.toastr['success'](
                  'Done!',
                  'Test run deleted successfully',
                );
              }
            });
          } else {
            swal.close();
          }
        });

        break;

      // case 'set-filter-testrun':
      //
      //     let queryParams = {
      //         systemUnderTest: testRun.application,
      //         testEnvironment: testRun.testEnvironment,
      //         workload: testRun.testType
      //     };
      //
      //
      //     FlowRouter.go('testRuns', null, queryParams)
      //
      //
      //
      //     break;
      case 'select-testrun':
        if (event.target.checked) {
          Template.instance().selectedTestruns.push(this._id);
        } else {
          const index = Template.instance().selectedTestruns.indexOf(this._id);
          Template.instance().selectedTestruns.splice(index, 1);
        }

        break;

      case 'view-report':
        Session.set('reportRoute', 'testRuns');

        FlowRouter.go('report', reportParams, null);

        break;

      case 'comments':
        FlowRouter.go('testRunSummary', params, queryParams);
        break;

      default:
        if (!event.target.className.includes('select-test-run')) {
          const params = {
            systemUnderTest: testRun.application,
            testRunId: testRun.testRunId,
          };
          const queryParams = {
            systemUnderTest: testRun.application,
            workload: testRun.testType,
            testEnvironment: testRun.testEnvironment,
            team: FlowRouter.current().queryParams.team,
            tags: FlowRouter.current().queryParams.tags,
          };
          FlowRouter.go('testRunSummary', params, queryParams);
        }
    }
  },
  'click #delete-selected-testruns'(event, template) {
    event.preventDefault();

    _.each(template.selectedTestruns, (_id) => {
      Meteor.call('deleteTestRun', _id, (error) => {
        if (error) {
          window.toastr.clear();
          window.toastr['error'](
            error.reason,
            `Error deleting test run ${_id}, error: ${error.reason}`,
          );
        }
      });
    });

    template.selectedTestruns.clear();
  },
  'click button#load-older-test-runs'(event, template) {
    event.preventDefault();

    template.testRunsLimit.set(template.testRunsLimit.get() + 50);
  },

  'click #batch-evaluate-selected-testruns'(event, template) {
    event.preventDefault();

    Meteor.call(
      'batchEvaluateSelectedTestRuns',
      template.selectedTestruns,
      'RE_EVALUATE',
      (err, result) => {
        if (err) {
          window.toastr.clear();
          window.toastr['error'](
            err.reason,
            `Error evaluating test runs, error: ${err}`,
          );
        } else {
          if (result.error) {
            window.toastr.clear();
            window.toastr['error'](
              result.error.reason,
              `Error evaluating test runs, error: ${result.error}`,
            );
          } else {
            window.toastr.clear();
            window.toastr['success'](
              'Done!',
              'Initiated test runs evaluation, please wait for the process to complete',
            );
          }

          template.selectedTestruns.clear();
          $('input#select-testrun[type="checkbox"]').prop('checked', false);
          $('input#select-all-testruns[type="checkbox"]').prop(
            'checked',
            false,
          );
          return false;
        }
      },
    );
  },
  'click #batch-refresh-selected-testruns'(event, template) {
    event.preventDefault();

    Meteor.call(
      'batchEvaluateSelectedTestRuns',
      template.selectedTestruns,
      'REFRESH',
      (err, result) => {
        if (err) {
          window.toastr.clear();
          window.toastr['error'](
            err.reason,
            `Error rerfreshing test runs, error: ${err}`,
          );
        } else {
          if (result.error) {
            window.toastr.clear();
            window.toastr['error'](
              result.error.reason,
              `Error rerfreshing test runs, error: ${result.error}`,
            );
          } else {
            window.toastr.clear();
            window.toastr['success'](
              'Done!',
              'Initiated test runs refresh, please wait for the process to complete',
            );
          }

          template.selectedTestruns.clear();
          $('input#select-testrun[type="checkbox"]').prop('checked', false);
          $('input#select-all-testruns[type="checkbox"]').prop(
            'checked',
            false,
          );
          return false;
        }
      },
    );
  },
  'click #create-missing-snapshots'(event, template) {
    event.preventDefault();

    async.each(
      template.selectedTestruns,
      (_id, callback) => {
        const testRun = getTestRunById(_id);

        if (testRun) {
          Meteor.call('createSnapshots', testRun, (error) => {
            if (error) {
              callback(error);
            } else {
              callback();
            }
          });
        }
      },
      (err) => {
        if (err) {
          window.toastr.clear();
          window.toastr['error'](
            err.reason,
            `Error creating snapshots, error: ${err.reason}`,
          );
        } else {
          window.toastr.clear();
          window.toastr['success'](
            'Done!',
            'Initated snapshot creation, please wait for the process to complete',
          );
        }

        template.selectedTestruns.clear();
        $('input#select-testrun[type="checkbox"]').prop('checked', false);
        $('input#select-all-testruns[type="checkbox"]').prop('checked', false);
      },
    );
  },
  'click #update-snapshots'(event, template) {
    event.preventDefault();

    Modal.show('updateSnapshotsModal', {
      selectedTestRunIds: template.selectedTestruns,
      checkRetention: false,
    });
  },
  'click #select-all-testruns'(event, template) {
    // event.preventDefault();

    if (event.target.checked) {
      $('input#select-testrun[type="checkbox"]')
        .not(event.target)
        .prop('checked', event.target.checked);

      $('input#select-testrun[type="checkbox"]').each(function () {
        if ($(this).is(':checked'))
          template.selectedTestruns.push($(this).attr('testrun-id'));
      });
    } else {
      template.selectedTestruns.clear();

      $('input#select-testrun[type="checkbox"]')
        .not(event.target)
        .prop('checked', event.target.checked);
    }
  },
  /*  'click #select-all-testruns' (event, template) {

        if(event.target.checked) {

            let testRuns = TestRuns.find().fetch();

            _.each(testRuns, (testRun) => {

                let index = template.selectedTestruns.indexOf(testRun._id);

                if(index === -1) template.selectedTestruns.push(testRun._id);
            })

            $('input#select-testrun[type="checkbox"]').attr('Checked','Checked');

        } else {

            template.selectedTestruns.clear();

            $('input#select-testrun[type="checkbox"]').removeAttr('Checked');
        }
    }*/
});

const getTestRunAnnotationsTooltip = (testRun) => {
  if (testRun.annotations && testRun.annotations.length > 0) {
    return `<i id="testrun-annotations" class="fa fa-info-circle reactive-table-icon" data-tippy-content="${testRun.annotations.replace(/"/g, '')}"></i>`;
  } else {
    return `<div></div>`;
  }
};

const getTestRunBaselineIcon = (testRun) => {
  const application = Applications.findOne({ name: testRun.application });

  if (application) {
    const baselineTestRuns = [];

    _.each(application.testEnvironments, (testEnvironment) => {
      _.each(testEnvironment.testTypes, (testType) => {
        if (testType.baselineTestRun)
          baselineTestRuns.push(testType.baselineTestRun);
      });
    });

    if (baselineTestRuns.indexOf(testRun.testRunId) !== -1) {
      return `<i  class="fa fa-flag reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" data-tippy-content="Baseline test run"></i>`;
    } else {
      return `<div></div>`;
    }
  } else {
    return `<div></div>`;
  }
};

const getReport = (testRun) => {
  let HTML;

  if (
    _.has(testRun, 'reportAnnotations') &&
    testRun.reportAnnotations.length > 0 &&
    testRun.expires === 0
  ) {
    HTML = `<i class="fa fa-file-text-o reactive-table-icon" id="view-report" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="View report"></i>`;
  } else {
    HTML = '<span></span>';
  }

  return HTML;
};

export const getComments = (testRun) => {
  let unReadCommentCount = 0;

  const comments = Comments.find({
    $and: [
      { application: testRun.application },
      { testEnvironment: testRun.testEnvironment },
      { testType: testRun.testType },
      { testRunId: testRun.testRunId },
      // {
      //     viewedBy: {"$ne": user._id}
      // },
      // {
      //     createdBy: {"$ne": user._id}
      // }
    ],
  });

  if (comments.fetch().length > 0) {
    const commentsCount = comments.fetch().length;

    const user = Meteor.user();

    if (user) {
      comments.forEach((comment) => {
        if (
          comment.createdBy !== user._id &&
          comment.viewedBy.indexOf(user._id) === -1
        )
          unReadCommentCount++;
      });

      if (unReadCommentCount > 0) {
        return `<i class="fa fa-comment unread reactive-table-icon" id="comments">
                          <span class="num" id="comments">${commentsCount}</span>
                        </i>`;
      } else {
        return `<i class="fa fa-comment reactive-table-icon" id="comments">
                          <span class="num" id="comments">${commentsCount}</span>
                        </i>`;
      }
    } else {
      return `<i class="fa fa-comment reactive-table-icon" id="comments">
                          <span class="num" id="comments">${commentsCount}</span>
                        </i>`;
    }
  } else {
    return `<div></div>`;
  }
};
export const getTestRunMenu = () => {
  return `
        <div class="testrun-menu">
            <div class="dropdown btn-group ">
              <i class="fa fa-bars dropdown-toggle"  id="dropdownMenuIcon" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"></i>
              <div class="dropdown-menu test-run-menu-lef" aria-labelledby="dropdownMenuIcon">
                <h6 class="dropdown-header">Selected test runs</h6>
                <li class="test-run-menu"><a class="dropdown-item" id="batch-evaluate-selected-testruns" href="#">Re-evaluate</a></li>
                <li class="test-run-menu"><a class="dropdown-item" id="batch-refresh-selected-testruns" href="#">Refresh</a></li>
                <li class="test-run-menu"><a class="dropdown-item" id="delete-selected-testruns" href="#">Delete</a></li>
              </div>
          </div>
        </div>`;
};

export const getConsolidatedBenchmarkResults = (testRun) => {
  let HTML =
    '<i class="fa fa-minus" style="color: lightgrey;" aria-hidden="true"></i>';

  if (testRun.valid === false) {
    let reasonsNotValid = '';
    testRun.reasonsNotValid.forEach((reason) => {
      reasonsNotValid += reason.replace(/"/g, '') + '\n';
    });

    HTML = `<i class="fa fa-warning reactive-table-icon" style="color: darkorange;" aria-hidden="true" data-tippy-content="${reasonsNotValid}"></i>`;
  } else if (testRun.status) {
    const evalCheck = testRun.status.evaluatingChecks;
    const checkResultsComplete =
      evalCheck === 'COMPLETE' ||
      evalCheck === 'ERROR' ||
      evalCheck === 'NOT_CONFIGURED';

    const evalCompare = testRun.status.evaluatingComparisons;
    const compareResultsComplete =
      evalCompare === 'COMPLETE' ||
      evalCompare === 'ERROR' ||
      evalCompare === 'NOT_CONFIGURED' ||
      evalCompare === 'NO_BASELINES_FOUND' ||
      evalCompare === 'NO_AUTO_COMPARE' ||
      evalCompare === 'NO_PREVIOUS_TEST_RUN_FOUND' ||
      evalCompare === 'BASELINE_TEST_RUN';

    const adaptCheck =
      testRun.status.evaluatingAdapt ?
        testRun.status.evaluatingAdapt
      : 'NOT_CONFIGURED';
    const adaptCheckComplete =
      adaptCheck === 'COMPLETE' ||
      adaptCheck === 'ERROR' ||
      adaptCheck === 'NO_BASELINES_FOUND' ||
      adaptCheck === 'NOT_CONFIGURED';

    let enableAdapt;
    let autoCompareTestRuns;
    const application = Applications.findOne({ name: testRun.application });

    if (application) {
      let testTypeIndex;
      const testEnvironmentIndex = application.testEnvironments
        .map((testEnvironment) => {
          return testEnvironment.name;
        })
        .indexOf(testRun.testEnvironment);

      if (testEnvironmentIndex !== -1) {
        testTypeIndex = application.testEnvironments[
          testEnvironmentIndex
        ].testTypes
          .map((testType) => {
            return testType.name;
          })
          .indexOf(testRun.testType);
      }
      if (testEnvironmentIndex !== -1 && testTypeIndex !== -1) {
        enableAdapt =
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].enableAdapt === true;
        autoCompareTestRuns =
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].autoCompareTestRuns === true;
      }
    }

    let resultHoverText = '';

    if (testRun.consolidatedResult.meetsRequirement !== undefined) {
      const meetsRequirementHoverText =
        testRun.consolidatedResult.meetsRequirement === true ?
          `Service Level Objectives: <i class='fa fa-check reactive-table-icon' style='color: green;'></i><br/>`
        : `Service Level Objectives: <i class='fa fa-exclamation-circle reactive-table-icon' style='color: red;'></i><br/>`;
      resultHoverText += meetsRequirementHoverText;
    }
    if (
      testRun.consolidatedResult.benchmarkPreviousTestRunOK !== undefined &&
      autoCompareTestRuns === true
    ) {
      const benchmarkPreviousTestRunHoverText =
        testRun.consolidatedResult.benchmarkPreviousTestRunOK === true ?
          `Compared to previous test run: <i class='fa fa-check reactive-table-icon' style='color: green;'></i><br/>`
        : `Compared to previous test run: <i class='fa fa-exclamation-circle reactive-table-icon' style='color: red;'></i><br/>`;
      resultHoverText += benchmarkPreviousTestRunHoverText;
    }
    if (
      testRun.consolidatedResult.benchmarkBaselineTestRunOK !== undefined &&
      autoCompareTestRuns === true
    ) {
      const benchmarkBaselineTestRunHoverText =
        testRun.consolidatedResult.benchmarkBaselineTestRunOK === true ?
          `Compared to baseline test run: <i class='fa fa-check reactive-table-icon' style='color: green;'></i><br/>`
        : `Compared to baseline test run: <i class='fa fa-exclamation-circle reactive-table-icon' style='color: red;'></i><br/>`;
      resultHoverText += benchmarkBaselineTestRunHoverText;
    }
    if (
      testRun.consolidatedResult.adaptTestRunOK !== undefined &&
      enableAdapt === true
    ) {
      const adaptTestRunHoverText =
        testRun.consolidatedResult.adaptTestRunOK === true ?
          `ADAPT result: <i class='fa fa-check reactive-table-icon' style='color: green;'></i><br/>`
        : `ADAPT result: <i class='fa fa-exclamation-circle reactive-table-icon' style='color: red;'></i><br/>`;
      resultHoverText += adaptTestRunHoverText;
    }

    if (
      !checkResultsComplete ||
      !compareResultsComplete ||
      !adaptCheckComplete
    ) {
      HTML =
        '<i  class="fa fa-refresh fa-spin reactive-table-icon" aria-hidden="true"></i>';
    } else {
      if (_.has(testRun, 'consolidatedResult')) {
        if (testRun.consolidatedResult.overall === true) {
          HTML = `<i class="fa fa-check reactive-table-icon" style="color: green;" aria-hidden="true" data-tippy-content="${resultHoverText}"></i>`;
        } else {
          HTML = `<i class="fa fa-exclamation-circle reactive-table-icon" style="color: red;" aria-hidden="true"  data-tippy-content="${resultHoverText}"></i>`;
        }
      }
    }
  } else {
    if (_.has(testRun, 'consolidatedResult')) {
      if (testRun.consolidatedResult.overall === true) {
        HTML = `<i class="fa fa-check reactive-table-icon" style="color: green;" aria-hidden="true" ></i>`;
      } else {
        HTML = `<i class="fa fa-exclamation-circle reactive-table-icon" style="color: red;" aria-hidden="true" ></i>`;
      }
    }
  }

  return HTML;
};

const createLink = (testRun) => {
  return `<a id="test-run-details" href="/test-run/${testRun.testRunId}?systemUnderTest=${testRun.application}&workload=${testRun.testType}&testEnvironment=${testRun.testEnvironment}">${testRun.testRunId}</a>`;
};

const getTestRunChangePointIcon = (testRun) => {
  const dsChangePointQuery = {
    $and: [
      { application: testRun.application },
      { testEnvironment: testRun.testEnvironment },
      { testType: testRun.testType },
      { testRunId: testRun.testRunId },
    ],
  };

  const dsChangePoint = DsChangepoints.findOne(dsChangePointQuery);

  if (dsChangePoint) {
    return `<i  class="fa fa-hourglass-start reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" data-tippy-content="ADAPT Change point"></i>`;
  } else {
    return `<div></div>`;
  }
};

const getControlGroupIcon = (testRun) => {
  if (testRun.controlGroup === true) {
    return `<i  class="fa fa-square fa-sm fa-reactive-table-icon" style="color: blue; font-size:10px;" aria-hidden="true" data-toggle="tooltip" data-placement="top" data-tippy-content="ADAPT control group"></i>`;
  } else {
    return `<div></div>`;
  }
};
