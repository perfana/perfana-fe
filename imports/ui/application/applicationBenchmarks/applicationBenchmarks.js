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

/* eslint-disable indent */
// noinspection CssInvalidPropertyValue

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ApplicationDashboards } from '../../../collections/applicationDashboards';
import { Benchmarks } from '../../../collections/benchmarks';
import { Applications } from '../../../collections/applications';
import { GenericChecks } from '../../../collections/genericChecks';
import { Profiles } from '../../../collections/profiles';
import { ReactiveVar } from 'meteor/reactive-var';
import { log } from '/both/logger';

import './applicationBenchmarks.html';
import { CheckResults } from '../../../collections/checkResults';
import { getUnit } from '../../../helpers/units';
import { getTestRun } from '../../../helpers/utils';
import _ from 'lodash';

Template.applicationBenchmarks.onCreated(
  function applicationBenchmarksOnCreated() {
    this.userHasPermissionForApplication = new ReactiveVar(false);
    this.showFilter = new ReactiveVar(false);

    const applicationDashboardQuery = {
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
      ],
    };

    const benchmarksQuery = {
      $and: [
        { application: Session.get('application') },
        { testEnvironment: Session.get('testEnvironment') },
        { testType: Session.get('testType') },
      ],
    };

    Meteor.subscribe('benchmarks', benchmarksQuery);
    Meteor.subscribe('applications');
    Meteor.subscribe('genericChecks');
    Meteor.subscribe('profiles');

    const grafanaDashboardsQuery = {
      $and: [{ usedBySUT: Session.get('application') }],
    };

    Meteor.subscribe('grafanaDashboards', grafanaDashboardsQuery);

    Meteor.subscribe('applicationDashboards', applicationDashboardQuery);

    this.autorun(() => {
      const application = Applications.findOne({
        name: Session.get('application'),
      });

      if (application) {
        Meteor.call(
          'userHasPermissionForApplication',
          application.name,
          (err, result) => {
            if (err) {
              log.error(JSON.stringify(err));
            } else {
              if (result.error) {
                log.error(JSON.stringify(result.error));
              } else {
                this.userHasPermissionForApplication.set(result.data);
              }
            }
          },
        );
      }
    });

    AutoForm.addHooks(
      'addBenchmarks',
      {
        before: {
          method: function (doc) {
            if (
              doc.panel &&
              doc.panel.requirement &&
              doc.panel.requirement.operator !== undefined &&
              doc.panel.requirement.value === undefined
            ) {
              window.toastr.clear();
              window.toastr['error'](
                'Invalid service level indicator',
                'Error',
              );
              return false;
            }

            if (
              doc.panel &&
              doc.panel.benchmark &&
              doc.panel.benchmark.operator !== undefined &&
              doc.panel.benchmark.value === undefined
            ) {
              window.toastr.clear();
              window.toastr['error']('Invalid benchmark', 'Error');
              return false;
            }

            // if((!doc.panel.benchmark || doc.panel.benchmark.operator === undefined) && (!doc.panel.requirement || doc.panel.requirement.operator === undefined)) {
            //     doc.panel.evaluateType = 'avg';
            //     doc.panel.excludeRampUpTime = false;
            // }

            return doc;
          },
        },
        onSuccess: function () {
          window.toastr.clear();
          window.toastr['success']('Done!', 'Added service level indicator!');
        },
        onError: function (formType, err) {
          window.toastr.clear();
          window.toastr['error'](err, 'Error');
        },
      },
      false,
    );
    AutoForm.addHooks(
      'editBenchmarks',
      {
        before: {
          'method-update': function (doc) {
            if (
              doc.$set['panel.requirement.operator'] !== undefined &&
              doc.$set['panel.requirement.value'] === undefined
            ) {
              window.toastr.clear();
              window.toastr['error'](
                'Invalid service level indicator',
                'Error',
              );
              return false;
            }

            if (
              doc.$set['panel.benchmark.operator'] !== undefined &&
              doc.$set['panel.benchmark.value'] === undefined
            ) {
              window.toastr.clear();
              window.toastr['error']('Invalid benchmark', 'Error');
              return false;
            }

            if (doc.$set['panel.requirement.operator'] === undefined) {
              doc.$unset['panel.requirement'] = '';
              delete doc.$unset['panel.requirement.operator'];
              delete doc.$unset['panel.requirement.value'];
              delete doc.$set['panel.requirement.operator'];
              delete doc.$set['panel.requirement.value'];
            }

            if (doc.$set['panel.benchmark.operator'] === undefined) {
              doc.$unset['panel.benchmark'] = '';
              delete doc.$unset['panel.benchmark.operator'];
              delete doc.$unset['panel.benchmark.value'];
              delete doc.$unset['panel.benchmark.absoluteFailureThreshold'];
              delete doc.$set['panel.benchmark.operator'];
              delete doc.$set['panel.benchmark.value'];
              delete doc.$set['panel.benchmark.absoluteFailureThreshold'];
            }

            if (doc.$set['reasonNotValid'] !== undefined) {
              doc.$set['reasonNotValid'] = '';
            }

            return doc;
          },
        },
        onSuccess: function () {
          window.toastr.clear();
          window.toastr['success']('Done!', 'Updated service level indicator!');
        },
        onError: function (formType, err) {
          window.toastr.clear();
          window.toastr['error'](err.reason, 'Error');
        },
      },
      false,
    );
  },
);

Template.applicationBenchmarks.helpers({
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
  application() {
    return Session.get('application');
  },
  testEnvironment() {
    return Session.get('testEnvironment');
  },
  testType() {
    return Session.get('testType');
  },
  applicationBenchmarks() {
    const benchmarks = Benchmarks.find(
      {
        $and: [
          { application: Session.get('application') },
          { testEnvironment: Session.get('testEnvironment') },
          { testType: Session.get('testType') },
        ],
      },
      { sort: { genericCheckId: 1 } },
    ).fetch();

    if (benchmarks.length > 0) {
      Template.instance().showFilter.set(benchmarks.length > 5);
      return benchmarks;
    }
  },

  fields() {
    return [
      {
        key: 'dashboardLabel',
        label: 'Dashboard',
        sortOrder: 1,
        sortDirection: 'ascending',
        cellClass: (value, object) => {
          if (
            object.valid === false &&
            object.reasonNotValid.split(' ')[0] === 'Dashboard'
          ) {
            return 'danger-benchmark';
          }
        },
      },
      {
        key: 'panel.title',
        label: 'Metric',
        fn: (value) => {
          return value.replace(/[0-9]+-(.*)/, '$1');
        },
        cellClass: (value, object) => {
          if (
            object.valid === false &&
            object.reasonNotValid.split(' ')[0] === 'Panel'
          ) {
            return 'danger-benchmark';
          }
        },
      },
      {
        key: 'panel.evaluateType',
        label: 'Aggregation',
        fn: (value, object) => {
          return getEvaluateType(object);
        },
      },
      {
        key: '_id',
        label: 'Service Level Objective',
        fn: (value, object) => {
          return new Spacebars.SafeString(createRequirementSpan(object));
        },
      },
      {
        key: '_id',
        label: 'Comparing threshold',
        fn: (value, object) => {
          return new Spacebars.SafeString(createBenchmarkSpan(object));
        },
      },
      {
        key: 'genericCheckId',
        label: 'Profile',
        sortOrder: 0,
        sortDirection: 'ascending',
        fn: (value, object) => {
          return new Spacebars.SafeString(createGenericCheckLabel(object));
        },
      },

      {
        key: '_id',
        label: '',
        isVisible: Template.instance().userHasPermissionForApplication,
        fn: (value, object) => {
          return new Spacebars.SafeString(createEditBenchmarkSpan(object));
        },
      },
      {
        key: '_id',
        label: '',
        isVisible: Template.instance().userHasPermissionForApplication,
        fn: () => {
          return new Spacebars.SafeString(createMatchPatternSpan());
        },
      },

      {
        key: '_id',
        label: '',
        isVisible: Template.instance().userHasPermissionForApplication,
        fn: (value, object) => {
          return new Spacebars.SafeString(createDeleteBenchmarkSpan(object));
        },
      },

      {
        key: '_id',
        label: '',
        fn: (value, object) => {
          return new Spacebars.SafeString(createValidSpan(object));
        },
      },
    ];
  },

  settings() {
    return {
      rowsPerPage: 20,
      showFilter: Template.instance().showFilter.get(),
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      noDataTmpl: Template.noBenchmarks,
    };
  },
  hasApplicationDashboards() {
    const applicationDashboards = ApplicationDashboards.find({
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
      ],
    }).fetch();

    if (applicationDashboards) return applicationDashboards.length > 0;
  },
});
Template.applicationBenchmarks.events({
  'click .back'() {
    history.back();
  },
  'click .reactive-table tbody tr'() {
    const afAtts = {
      type: 'method-update',
      meteormethod: 'updateBenchmark',
      id: 'editBenchmarks',
      schema: 'BenchmarkSchema',
      collection: 'Benchmarks',
      buttonContent: 'Update',
      backdrop: 'static',
    };
    switch (event.target.id) {
      case 'delete-benchmark':
        swal({
          title: 'Delete service level indicator',
          text: 'Are you sure?',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
          // dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            Meteor.call('deleteBenchmark', this);

            swal.close();
          } else {
            swal.close();
          }
        });

        break;

      case 'edit-benchmark':
        AutoForm.addHooks(
          afAtts['id'],
          {
            onSuccess: function () {
              // noinspection JSCheckFunctionSignatures
              Modal.hide('afModalWindow');
            },
          },
          false,
        );

        Modal.show('afModalWindow', {
          title: 'Update service level indicator',
          dialogClass: '',
          afAtts: afAtts,
          // operation: afAtts['type'],
          operation: 'update',
          collection: 'Benchmarks',
          // doc: this._id,
          doc: this,
          backdrop: afAtts['backdrop'],
        });

        break;

      case 'filter-series':
        Modal.show('filterSeriesModal', this);

        break;
    }
  },
  'click .add-grafana-dashboard'() {
    /* change tab to application dashboards */

    $('.nav-tabs a[href="#application-dashboards"]').tab('show');

    /* show add dashboard afModal*/

    const afAtts = {
      id: 'addApplicationDashboards',
      type: 'method',
      meteormethod: 'insertApplicationDashboard',
      schema: 'ApplicationDashboardsSchema',
      collection: 'ApplicationDashboards',
      buttonContent: 'Add',
      backdrop: 'static',
    };

    AutoForm.addHooks(
      afAtts['id'],
      {
        onSuccess: function () {
          // noinspection JSCheckFunctionSignatures
          Modal.hide('afModalWindow');
        },
      },
      false,
    );

    Modal.show('afModalWindow', {
      title: 'Add Grafana dashboard',
      dialogClass: '',
      afAtts: afAtts,
      operation: 'insert',
      collection: 'ApplicationDashboards',
      backdrop: afAtts['backdrop'],
    });
  },
});

Template.noBenchmarks.onCreated(function applicationBenchmarksOnCreated() {
  this.userHasPermissionForApplication = new ReactiveVar(false);

  Meteor.subscribe('applications');

  this.autorun(() => {
    const application = Applications.findOne({
      name: Session.get('application'),
    });

    if (application) {
      Meteor.call(
        'userHasPermissionForApplication',
        application.name,
        (err, result) => {
          if (err) {
            log.error(JSON.stringify(err));
          } else {
            if (result.error) {
              log.error(JSON.stringify(result.error));
            } else {
              this.userHasPermissionForApplication.set(result.data);
            }
          }
        },
      );
    }
  });
});

Template.noBenchmarks.helpers({
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },

  hasApplicationDashboards() {
    const applicationDashboards = ApplicationDashboards.find({
      $and: [
        { application: FlowRouter.current().queryParams.systemUnderTest },
        { testEnvironment: FlowRouter.current().queryParams.testEnvironment },
      ],
    }).fetch();

    if (applicationDashboards) return applicationDashboards.length > 0;
  },
});

const getEvaluateType = (applicationBenchmark) => {
  let evaluateType = humanReadableEvaluateType(
    applicationBenchmark.panel.evaluateType,
  );

  // if based on generic check, try to get data from generic check to override it

  if (!_.has(applicationBenchmark, 'genericCheckId')) {
    const genericCheck = GenericChecks.findOne({
      checkId: applicationBenchmark.genericCheckId,
    });

    if (genericCheck) {
      evaluateType = humanReadableEvaluateType(genericCheck.panel.evaluateType);
    }
  }

  return evaluateType;
};

const createRequirementSpan = (applicationBenchmark) => {
  const unit =
    applicationBenchmark.panel.yAxesFormat ?
      getUnit(applicationBenchmark.panel.yAxesFormat).name
    : '';

  const hasRequirement =
    applicationBenchmark.panel.requirement &&
    applicationBenchmark.panel.requirement.operator &&
    applicationBenchmark.panel.requirement.value;

  if (hasRequirement) {
    let requirementOperator = humanReadableOperator(
      applicationBenchmark.panel.requirement.operator,
    );
    const format =
      (
        applicationBenchmark.panel.evaluateType === 'fit' ||
        applicationBenchmark.panel.yAxesFormat === 'percentunit'
      ) ?
        '%'
      : ` ${unit}`;
    let requirementValue =
      applicationBenchmark.panel.yAxesFormat === 'percentunit' ?
        Math.round(applicationBenchmark.panel.requirement.value * 10000) / 100
      : applicationBenchmark.panel.requirement.value;

    const matchPattern =
      applicationBenchmark.panel.matchPattern ?
        ` for series matching pattern '<strong>${applicationBenchmark.panel.matchPattern}</strong>'`
      : '';

    // if based on generic check, try to get data from generic check to override it

    if (!_.has(applicationBenchmark, 'genericCheckId')) {
      const genericCheck = GenericChecks.findOne({
        checkId: applicationBenchmark.genericCheckId,
      });

      if (genericCheck) {
        requirementOperator = humanReadableOperator(
          genericCheck.panel.requirement.operator,
        );
        requirementValue = genericCheck.panel.requirement.value;
      }
    }

    return `<span>should be ${requirementOperator} <strong>${requirementValue}${format}</strong>${matchPattern}</span>`;
  } else {
    return '<span>No requirement specified</span>';
  }
};

const createBenchmarkSpan = (applicationBenchmark) => {
  const unit =
    applicationBenchmark.panel.evaluateType === 'fit' ? '%'
    : applicationBenchmark.panel.yAxesFormat === 'percentunit' ? '%'
    : getUnit(applicationBenchmark.panel.yAxesFormat).name;

  const hasBenchmark =
    applicationBenchmark.panel.benchmark &&
    applicationBenchmark.panel.benchmark.operator &&
    applicationBenchmark.panel.benchmark.value;
  let absoluteFailureThresholdString = '';

  if (hasBenchmark) {
    let benchmarkOperator = humanReadableBenchmarkOperator(
      applicationBenchmark.panel.benchmark.operator,
    );
    const format = applicationBenchmark.panel.yAxesFormat ? ` ${unit}` : '';
    let benchmarkValue =
      (
        applicationBenchmark.panel.yAxesFormat === 'percentunit' &&
        (applicationBenchmark.panel.benchmark.operator === 'pst' ||
          applicationBenchmark.panel.benchmark.operator === 'ngt')
      ) ?
        Math.round(applicationBenchmark.panel.benchmark.value * 10000) / 100
      : applicationBenchmark.panel.benchmark.value;
    let percentage =
      (
        applicationBenchmark.panel.benchmark.operator === 'pst-pct' ||
        applicationBenchmark.panel.benchmark.operator === 'ngt-pct'
      ) ?
        '%'
      : ` ${format}`;
    const matchPattern =
      applicationBenchmark.panel.matchPattern ?
        ` for series matching pattern '<strong>${applicationBenchmark.panel.matchPattern}</strong>'`
      : '';
    if (applicationBenchmark.panel.benchmark.absoluteFailureThreshold) {
      const absoluteFailureThreshold =
        applicationBenchmark.panel.yAxesFormat === 'percentunit' ?
          Math.round(
            applicationBenchmark.panel.benchmark.absoluteFailureThreshold *
              10000,
          ) / 100
        : applicationBenchmark.panel.benchmark.absoluteFailureThreshold;
      absoluteFailureThresholdString =
        applicationBenchmark.panel.benchmark.absoluteFailureThreshold ?
          `| fail only if absolute deviation exceeds <strong>${absoluteFailureThreshold} ${format}</strong>`
        : '';
    }
    if (!_.has(applicationBenchmark, 'genericCheckId')) {
      const genericCheck = GenericChecks.findOne({
        checkId: applicationBenchmark.genericCheckId,
      });

      if (genericCheck) {
        benchmarkOperator = humanReadableOperator(
          genericCheck.panel.benchmark.operator,
        );
        benchmarkValue = genericCheck.panel.benchmark.value;
        percentage =
          (
            genericCheck.panel.benchmark.operator === 'pst-pct' ||
            genericCheck.panel.benchmark.operator === 'ngt-pct'
          ) ?
            '%'
          : '';
      }
    }

    return `<span>allow ${benchmarkOperator} deviation of <strong>${benchmarkValue}${percentage}</strong> ${matchPattern}${absoluteFailureThresholdString}</span>`;
  } else {
    return '<span>No threshold specified</span>';
  }
};

const createGenericCheckLabel = (applicationBenchmark) => {
  if (applicationBenchmark.genericCheckId) {
    const genericCheck = GenericChecks.findOne({
      checkId: applicationBenchmark.genericCheckId,
    });

    if (genericCheck) {
      const profile = Profiles.findOne({ name: genericCheck.profile });

      if (profile) {
        if (profile.readOnly) {
          return `<span class='golden-path-label break-word label label-default'>${genericCheck.profile}</span>`;
        } else {
          return `<span class=' break-word label label-default'>${genericCheck.profile}</span>`;
        }
      } else {
        return '';
      }
    } else {
      return '';
    }
  } else {
    return '';
  }
};

const createEditBenchmarkSpan = (applicationBenchmark) => {
  if (!applicationBenchmark.genericCheckId) {
    return `<i id='edit-benchmark' class='fa fa-pencil reactive-table-icon' aria-hidden='true' data-toggle='tooltip' data-placement='top' title='Edit service level indicator'></i>`;
  } else {
    const user = Meteor.user();

    if (
      user &&
      (Roles.userHasRole(user._id, 'admin') ||
        Roles.userHasRole(user._id, 'super-admin'))
    ) {
      return `<i id='edit-benchmark' class='fa fa-pencil reactive-table-icon' aria-hidden='true' data-toggle='tooltip' data-placement='top' title='Edit service level indicator'></i>`;
    } else {
      return `<div></div>`;
    }
  }
};

const createMatchPatternSpan = () => {
  return `<i id='filter-series' class='fa fa-filter reactive-table-icon' style='font: 0.5em;' aria-hidden='true' data-toggle='tooltip' data-placement='top' title='Filter series'></i>`;
};

const createValidSpan = (applicationBenchmark) => {
  if (applicationBenchmark.valid === false) {
    return `<i id='invalid-benchmark' style='color: darkorange;' class='fa fa-warning' aria-hidden='true' data-toggle='tooltip' data-placement='top' title='${applicationBenchmark.reasonNotValid}'></i>`;
  } else {
    return `<div></div>`;
  }
};
const createDeleteBenchmarkSpan = (applicationBenchmark) => {
  if (!applicationBenchmark.genericCheckId) {
    return `<i id='delete-benchmark' class='fa fa-trash reactive-table-icon' aria-hidden='true' data-toggle='tooltip' data-placement='top' title='Delete benchmark'></i>`;
  } else {
    const user = Meteor.user();

    if (
      user &&
      (Roles.userHasRole(user._id, 'admin') ||
        Roles.userHasRole(user._id, 'super-admin'))
    ) {
      return `<i id='delete-benchmark' class='fa fa-trash reactive-table-icon' aria-hidden='true' data-toggle='tooltip' data-placement='top' title='Delete benchmark'></i>`;
    } else {
      return `<div></div>`;
    }
  }
};

const humanReadableOperator = (operator) => {
  switch (operator) {
    case 'st': //legacy
      return 'less than';
    case 'lt':
      return 'less than';
    case 'gt':
      return 'greater than';
  }
};

const humanReadableBenchmarkOperator = (operator) => {
  switch (operator) {
    case 'pst':
      return 'positive';
    case 'ngt':
      return 'negative';
    case 'pst-pct':
      return 'positive';
    case 'ngt-pct':
      return 'negative';
  }
};

const humanReadableEvaluateType = (type) => {
  switch (type) {
    case 'avg':
      return 'Average value';
    case 'max':
      return 'Maximum value';
    case 'min':
      return 'Minimum value';
    case 'last':
      return 'Last value';
    case 'fit':
      return 'Slope';
  }
};
Template.filterSeriesModal.onCreated(function filterSeriesModalOnCreated() {
  const query = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };
  this.matchPattern = new ReactiveVar();
  this.matchPattern.set(this.data.panel.matchPattern);
  Meteor.subscribe('checkResults', query, 'applicationBenchmarks');
  Session.set('useRegExp', false);

  this.autorun(() => {
    const selectedSeries = Session.get('selectedSeries');
    let selectedSeriesPattern = '';
    if (selectedSeries) {
      selectedSeries.forEach((serie, index) => {
        if (index === 0) {
          selectedSeriesPattern += serie;
        } else {
          selectedSeriesPattern += `|${serie}`;
        }
      });
      this.matchPattern.set(selectedSeriesPattern);
    }
  });
});

Template.filterSeriesModal.helpers({
  useRegExpToggle() {
    return Session.get('useRegExp');
  },
  useRegExp() {
    return Session.equals('useRegExp', true);
  },
  matchPattern() {
    return Template.instance().matchPattern.get();
  },

  targets() {
    const regEx = new RegExp(Template.instance().matchPattern.get());

    const checkResult = CheckResults.findOne({
      $and: [
        { application: this.application },
        { testEnvironment: this.testEnvironment },
        { testType: this.testType },
        { dashboardLabel: this.dashboardLabel },
        { dashboardUid: this.dashboardUid },
        { panelId: this.panel.id },
      ],
    });

    return checkResult.targets
      .filter((target) => {
        return regEx.test(target.target);
      })
      .map((target) => {
        return target.target;
      });
  },
  hasMatchingTargets() {
    const regEx = new RegExp(Template.instance().matchPattern.get());
    const checkResult = CheckResults.findOne({
      $and: [
        { application: this.application },
        { testEnvironment: this.testEnvironment },
        { testType: this.testType },
        { dashboardLabel: this.dashboardLabel },
        { dashboardUid: this.dashboardUid },
        { panelId: this.panel.id },
      ],
    });

    const matchingTargets = checkResult.targets.filter((target) => {
      return regEx.test(target.target);
    });

    return matchingTargets.length > 0;
  },
  hasCheckResults() {
    const checkResult = CheckResults.findOne({
      $and: [
        { application: this.application },
        { testEnvironment: this.testEnvironment },
        { testType: this.testType },
        { dashboardLabel: this.dashboardLabel },
        { dashboardUid: this.dashboardUid },
        { panelId: this.panel ? this.panel.id : this.panelId },
      ],
    });

    return !!checkResult;
  },
});

Template.filterSeriesModal.events({
  'click button#save-pattern'(event, template) {
    event.preventDefault();
    const benchmark = this;
    benchmark.panel.matchPattern = template.matchPattern.get();
    // benchmark.panel.series = Session.get('selectedSeries');
    benchmark.updateTestRuns = $('#update-test-runs').is(':checked');
    if (benchmark.updateTestRuns)
      window.toastr['info'](
        'This might take a while',
        'Updating test runs check results',
      );

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    Meteor.call('updateBenchmarkMatchPattern', benchmark, testRun);

    Session.set('selectedSeries', undefined);

    $('#match-pattern-modal').modal('hide');
    return false;
  },
  'keyup input#pattern': function (e, t) {
    t.matchPattern.set(e.target.value);
  },
  'change #use-regular-expression'() {
    if (Session.equals('useRegExp', false)) {
      Session.set('useRegExp', true);
    } else {
      Session.set('useRegExp', false);
    }
  },
});
