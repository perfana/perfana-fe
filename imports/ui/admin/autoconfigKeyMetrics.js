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
import { Template } from 'meteor/templating';
import { GenericChecks } from '../../collections/genericChecks';
import { ReactiveVar } from 'meteor/reactive-var';

import './autoconfigKeyMetrics.html';
import { getUnit } from '../../helpers/units';

Template.autoconfigKeyMetrics.onCreated(function profilesOnCreated() {
  this.isAdmin = new ReactiveVar();
  Meteor.subscribe('genericChecks');

  Session.set('profileName', this.data.profileName);

  AutoForm.addHooks(
    'editGenericChecks',
    {
      before: {
        'method-update': function (doc) {
          if (
            doc.$set['panel.requirement.operator'] !== undefined &&
            doc.$set['panel.requirement.value'] === undefined
          ) {
            window.toastr.clear();
            window.toastr['error']('Invalid service level indicator', 'Error');
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

          // if(doc.$set.panel && doc.$set.panel.type && (doc.$set.panel.type !== 'graph' || doc.$set.panel.type !== 'timeseries')) {
          //
          //     doc.$set['panel.evaluateType'] = 'avg';
          //     doc.$set['panel.excludeRampUpTime'] = false;
          // }

          return doc;
        },
      },
      onSuccess: function () {
        window.toastr.clear();
        window.toastr['success']('Done!', 'Updated service level indicator!');
      },
      onError: function (formType, err) {
        window.toastr.clear();
        window.toastr['error'](err, 'Error');
      },
    },
    false,
  );

  AutoForm.addHooks(
    'addGenericChecks',
    {
      before: {
        method: function (doc) {
          if (
            doc.panel.requirement &&
            doc.panel.requirement.operator !== undefined &&
            doc.panel.requirement.value === undefined
          ) {
            window.toastr.clear();
            window.toastr['error']('Invalid service level indicator', 'Error');
            return false;
          }

          if (
            doc.panel.benchmark &&
            doc.panel.benchmark.operator !== undefined &&
            doc.panel.benchmark.value === undefined
          ) {
            window.toastr.clear();
            window.toastr['error']('Invalid benchmark', 'Error');
            return false;
          }

          // if(doc.panel && doc.panel.type && (doc.panel.type !== 'graph' || doc.panel.type !== 'timeseries')) {
          //
          //     doc['panel.evaluateType'] = 'avg';
          //     doc['panel.excludeRampUpTime'] = false;
          //
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
        window.toastr['error'](err.reason, 'Error');
      },
    },
    false,
  );
});

Template.autoconfigKeyMetrics.onRendered(function profilesOnRendered() {
  this.isAdmin.set(
    Roles.userHasRole(Meteor.userId(), 'admin') ||
      Roles.userHasRole(Meteor.userId(), 'super-admin'),
  );
});

Template.autoconfigKeyMetrics.helpers({
  isAdmin() {
    return Template.instance().isAdmin.get();
  },

  keyMetrics() {
    return GenericChecks.find({ profile: this.profileName });
  },
  fields() {
    return [
      // {key: 'grafana', label: 'Grafana instance'},
      {
        key: 'addForWorkloadsMatchingRegex',
        label: 'Add for workloads matching regex',
        cellClass: 'col-md-1',
        sortOrder: 0,
        sortDirection: 'ascending',
      },
      { key: 'dashboardName', label: 'Dashboard', cellClass: 'col-md-1' },
      {
        key: 'panel.title',
        label: 'Metric',
        cellClass: 'col-md-2',
        fn: (value) => {
          return value.replace(/[0-9]+-(.*)/, '$1');
        },
      },
      {
        key: 'panel.evaluateType',
        label: 'Evaluate',
        fn: (value) => {
          return humanReadableEvaluateType(value);
        },
      },

      {
        key: '_id',
        label: 'Service Level Objective',
        cellClass: 'col-md-3',
        fn: (value, object) => {
          return new Spacebars.SafeString(createRequirementSpan(object));
        },
      },
      {
        key: '_id',
        label: 'Comparing threshold',
        cellClass: 'col-md-4',
        fn: (value, object) => {
          return new Spacebars.SafeString(createBenchmarkSpan(object));
        },
      },
      {
        key: '_id',
        label: '',
        isVisible: Template.instance().isAdmin,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="edit-auto-config-key-metric" class="fa fa-pencil" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Edit metric"></i>`,
          );
        },
      },

      {
        key: '_id',
        label: '',
        isVisible: Template.instance().isAdmin,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-auto-config-key-metric" class="fa fa-trash" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete metric"></i>`,
          );
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
      noDataTmpl: Template.noKeyMetrics,
    };
  },
});

Template.autoconfigKeyMetrics.events(
  {
    'click .reactive-table.auto-config-key-metrics tbody tr'(event) {
      const afAtts = {};
      switch (event.target.id) {
        case 'delete-auto-config-key-metric':
          swal({
            title: 'Delete metric',
            text: 'Are you sure?',
            icon: 'warning',
            buttons: ['Cancel', 'OK'],
            dangerMode: true,
          }).then((willDelete) => {
            //bound to the current `this`
            if (willDelete) {
              Meteor.call('deleteGenericCheck', this._id, (err, result) => {
                if (result.error) {
                  window.toastr.clear();
                  window.toastr['error'](JSON.stringify(result.error), 'Error');
                } else {
                  window.toastr.clear();
                  window.toastr['success'](
                    'Done!',
                    'Deleted service level indicator!',
                  );
                }

                swal.close();
              });
            } else {
              swal.close();
            }
          });

          break;

        case 'edit-auto-config-key-metric':
          afAtts['type'] = 'method-update';
          afAtts['meteormethod'] = 'updateGenericCheck';
          afAtts['id'] = 'editGenericChecks';
          afAtts['schema'] = 'GenericChecksSchema';
          afAtts['collection'] = 'GenericChecks';
          afAtts['buttonContent'] = 'Update';
          afAtts['backdrop'] = 'static';

          AutoForm.addHooks(
            afAtts['id'],
            {
              onSuccess: function () {
                // noinspection JSCheckFunctionSignatures  Modal.hide('afModalWindow');
              },
            },
            false,
          );

          Modal.show('afModalWindow', {
            title: 'Update service level indicator',
            dialogClass: '',
            afAtts: afAtts,
            operation: 'update',
            collection: 'GenericChecks',
            doc: this,
            backdrop: afAtts['backdrop'],
          });

          break;
      }
    },
  },
  false,
);

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
    const requirementOperator = humanReadableOperator(
      applicationBenchmark.panel.requirement.operator,
    );
    const format =
      (
        applicationBenchmark.panel.evaluateType === 'fit' ||
        applicationBenchmark.panel.yAxesFormat === 'percentunit'
      ) ?
        '%'
      : ` ${unit}`;
    const requirementValue =
      applicationBenchmark.panel.yAxesFormat === 'percentunit' ?
        Math.round(applicationBenchmark.panel.requirement.value * 10000) / 100
      : applicationBenchmark.panel.requirement.value;

    const matchPattern =
      applicationBenchmark.panel.matchPattern ?
        ` for series matching pattern "<strong>${applicationBenchmark.panel.matchPattern}</strong>"`
      : '';

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
    const benchmarkOperator = humanReadableBenchmarkOperator(
      applicationBenchmark.panel.benchmark.operator,
    );
    const format = applicationBenchmark.panel.yAxesFormat ? ` ${unit}` : '';
    const benchmarkValue =
      (
        applicationBenchmark.panel.yAxesFormat === 'percentunit' &&
        (applicationBenchmark.panel.benchmark.operator === 'pst' ||
          applicationBenchmark.panel.benchmark.operator === 'ngt')
      ) ?
        Math.round(applicationBenchmark.panel.benchmark.value * 10000) / 100
      : applicationBenchmark.panel.benchmark.value;
    const percentage =
      (
        applicationBenchmark.panel.benchmark.operator === 'pst-pct' ||
        applicationBenchmark.panel.benchmark.operator === 'ngt-pct'
      ) ?
        '%'
      : ` ${format}`;
    const matchPattern =
      applicationBenchmark.panel.matchPattern ?
        ` for series matching pattern "<strong>${applicationBenchmark.panel.matchPattern}</strong>"`
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
    return `<span>allow ${benchmarkOperator} deviation of <strong>${benchmarkValue}${percentage}</strong> ${matchPattern}${absoluteFailureThresholdString}</span>`;
  } else {
    return '<span>No threshold specified</span>';
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
