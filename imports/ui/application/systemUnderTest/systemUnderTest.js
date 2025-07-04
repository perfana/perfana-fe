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

/* eslint-disable no-case-declarations */
// noinspection JSJQueryEfficiency

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { log } from '/both/logger';

import './systemUnderTest.html';

import { Applications } from '../../../collections/applications';
import { getTestRun } from '../../../helpers/utils';
import { Session } from 'meteor/session';

Template.systemUnderTest.onCreated(function systemUnderTestOnCreated() {
  this.userHasPermissionForApplication = new ReactiveVar(false);
  this.dynatraceConfigured = new ReactiveVar(false);

  // Check if Dynatrace is configured
  Meteor.call('isDynatraceConfigured', (err, result) => {
    if (err) {
      log.error('Error checking Dynatrace configuration:', JSON.stringify(err));
    } else {
      this.dynatraceConfigured.set(result);
    }
  });

  this.autorun(() => {
    FlowRouter.watchPathChange();

    Meteor.subscribe('applications');

    const application = Applications.findOne({
      name: FlowRouter.current().queryParams.systemUnderTest,
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

Template.systemUnderTest.helpers({
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
  application() {
    const application = Applications.findOne({
      name: Session.get('application'),
    });
    if (application) return application;
  },
  testEnvironment() {
    return Session.get('testEnvironment');
  },
  testType() {
    return Session.get('testType');
  },
  testEnvironmentSelected() {
    return Session.get('testEnvironment') !== undefined;
  },
  testTypeSelected() {
    return Session.get('testType') !== undefined;
  },
  dynatraceConfigured() {
    return Template.instance().dynatraceConfigured && Template.instance().dynatraceConfigured.get();
  },
  tracingConfigured() {
    return Meteor.settings.public.tracingUrl !== undefined;
  },
  pyroscopeConfigured() {
    return Meteor.settings.public.pyroscopeUrl !== undefined;
  },
  testEnvironments() {
    const application = Applications.findOne({
      name: Session.get('application'),
    });

    if (application) {
      return Session.get('testEnvironment') === undefined ?
          application.testEnvironments
        : application.testEnvironments.filter((testEnvironment) => {
            return testEnvironment.name === Session.get('testEnvironment');
          });
    }
  },
  createLabels(dynatraceEntities) {
    let HTML = '<div>';

    if (dynatraceEntities) {
      dynatraceEntities.forEach((dynatraceEntity) => {
        HTML += `<span class="break-word label label-default" style="margin:5px;">${dynatraceEntity.label}</span>`;
      });
    }
    HTML += '</div>';

    return new Spacebars.SafeString(HTML);
  },
  createList(dynatraceEntities) {
    let HTML = '';

    dynatraceEntities.forEach((dynatraceEntity, i) => {
      if (i === 0) {
        HTML += `${dynatraceEntity.id}`;
      } else {
        HTML += `,${dynatraceEntity.id}`;
      }
    });

    return new Spacebars.SafeString(HTML);
  },
});

Template.systemUnderTest.events({
  'click .back'() {
    history.back();
  },

  'click div #edit-global-tracing-service'(event) {
    event.preventDefault();
    this.tracingService = $('#global-tracing-service')[0].innerHTML;
    this.scope = 'global';
    Modal.show('tracingServiceModal', this);
  },
  'click div #edit-test-environment-tracing-service'(event) {
    event.preventDefault();
    this.scope = 'testEnvironment';
    Modal.show('tracingServiceModal', this);
  },
  'click div #edit-workload-tracing-service'(event) {
    event.preventDefault();
    this.scope = 'workload';
    this.testEnvironment = $(event.currentTarget).attr('test-environment');
    Modal.show('tracingServiceModal', this);
  },
  'click div #edit-global-pyroscope-application'(event) {
    event.preventDefault();
    this.pyroscopeApplication = $('#global-pyroscope-application')[0].innerHTML;
    this.pyroscopeProfiler = $('#global-pyroscope-profiler')[0].innerHTML;
    this.scope = 'global';
    Modal.show('pyroscopeApplicationModal', this);
  },
  'click div #edit-test-environment-pyroscope-application'(event) {
    event.preventDefault();
    this.scope = 'testEnvironment';
    this.pyroscopeApplication = $(
      '#test-environment-pyroscope-application',
    )[0].innerHTML;
    this.pyroscopeProfiler = $(
      '#test-environment-pyroscope-profiler',
    )[0].innerHTML;
    Modal.show('pyroscopeApplicationModal', this);
  },
  'click div #edit-workload-pyroscope-application'(event) {
    event.preventDefault();
    this.scope = 'workload';
    this.testEnvironment = $(event.currentTarget).attr('test-environment');
    this.pyroscopeApplication = $(
      '#workload-pyroscope-application',
    )[0].innerHTML;
    this.pyroscopeProfiler = $('#workload-pyroscope-profiler')[0].innerHTML;
    Modal.show('pyroscopeApplicationModal', this);
  },
  'click div #edit-global-dynatrace-entity'(event) {
    event.preventDefault();
    this.dynatraceEntities = $('.dynatrace-entity.global')
      .toArray()
      .map((item) => {
        return {
          id: item['id'],
          text: item.innerText,
        };
      });
    this.scope = 'global';
    Modal.show('dynatraceEntityModal', this);
  },
  'click div #edit-test-environment-dynatrace-entity'(event) {
    event.preventDefault();
    this.dynatraceEntities = $('.dynatrace-entity.test-environment')
      .toArray()
      .map((item) => {
        return {
          id: item['id'],
          text: item.innerText,
        };
      });
    this.scope = 'testEnvironment';
    Modal.show('dynatraceEntityModal', this);
  },
  'click div #edit-baseline-test-run'(event) {
    event.preventDefault();
    this.application = Session.get('application');
    this.testEnvironment = $(event.currentTarget).attr('test-environment');
    this.testType = this.name;
    Modal.show('baselineTestRunModal', this);
  },
  'click i#remove-test-environment-workload'(event) {
    event.preventDefault();
    this.application = Session.get('application');
    this.testEnvironment = $(event.currentTarget).attr('test-environment');
    this.testType = $(event.currentTarget).attr('test-type');

    swal({
      title: 'Remove workload?',
      text: 'This will remove all Perfana resources (test runs, service level indicators, check results, etc) related to this workload.\nAre you sure?',
      icon: 'warning',
      buttons: ['Cancel', 'OK'],
      dangerMode: true,
    }).then((willDelete) => {
      //bound to the current `this`
      if (willDelete) {
        Meteor.call(
          'removeSystemUnderTestTestEnvironmentWorkload',
          this,
          (err, result) => {
            if (result.error) {
              window.toastr.clear();
              window.toastr['error'](JSON.stringify(result.error), 'Error');
            } else {
              window.toastr.clear();
              window.toastr['success']('Done!', 'Removed workload!');
            }

            swal.close();
          },
        );
      } else {
        swal.close();
      }
    });
  },
  'click i#remove-test-environment'(event) {
    event.preventDefault();
    this.application = Session.get('application');

    const storedApplication = Applications.findOne({
      name: Session.get('application'),
    });

    const numberOfTestEnvironments = storedApplication.testEnvironments.length;

    this.testEnvironment = $(event.currentTarget).attr('test-environment');

    swal({
      title: 'Remove test environment?',
      text: 'This will remove all Perfana resources (test runs, service level indicators, check results, etc) related to this test environment.\nAre you sure?',
      icon: 'warning',
      buttons: ['Cancel', 'OK'],
      dangerMode: true,
    }).then((willDelete) => {
      //bound to the current `this`
      if (willDelete) {
        Meteor.call(
          'removeSystemUnderTestTestEnvironment',
          this,
          (err, result) => {
            if (result.error) {
              window.toastr.clear();
              window.toastr['error'](JSON.stringify(result.error), 'Error');
            } else {
              window.toastr.clear();
              window.toastr['success']('Done!', 'Removed test environment!');
              /* if this was the last test environment, go to landing page */
              if (numberOfTestEnvironments === 1) {
                FlowRouter.go('landingPage', null, null);
              }
            }

            swal.close();
          },
        );
      } else {
        swal.close();
      }
    });
  },
  'click #delete-sut'(event) {
    event.preventDefault();
    this.application = Session.get('application');

    swal({
      title: 'Delete system under test?',
      text: 'This will remove all Perfana resources (test runs, service level indicators, check results, etc) related to this system under test.\nAre you sure?',
      icon: 'warning',
      buttons: ['Cancel', 'OK'],
      dangerMode: true,
    }).then((willDelete) => {
      //bound to the current `this`
      if (willDelete) {
        Meteor.call('removeSystemUnderTest', this, (err, result) => {
          if (result.error) {
            window.toastr.clear();
            window.toastr['error'](JSON.stringify(result.error), 'Error');
          } else {
            window.toastr.clear();
            window.toastr['success'](
              'Done!',
              `Deleted system under test ${this.application}!`,
            );
            /* if this was the last test environment, go to landing page */
            FlowRouter.go('landingPage', null, null);
          }

          swal.close();
        });
      } else {
        swal.close();
      }
    });
  },
  'click div #edit-workload-dynatrace-entity'(event) {
    event.preventDefault();
    this.dynatraceEntities = $('.dynatrace-entity.workload')
      .toArray()
      .map((item) => {
        return {
          id: item['id'],
          text: item.innerText,
        };
      });
    this.scope = 'workload';
    this.testEnvironment = $(event.currentTarget).attr('test-environment');
    Modal.show('dynatraceEntityModal', this);
  },
  'change input#autoCreateSnapshotsCheckbox'(event) {
    const application = Applications.findOne({
      name: Session.get('application'),
    });
    if (application) {
      const testEnvironmentIndex = application.testEnvironments
        .map((testEnvironment) => {
          return testEnvironment.name;
        })
        .indexOf($(event.currentTarget).attr('test-environment'));
      const testTypeIndex = application.testEnvironments[
        testEnvironmentIndex
      ].testTypes
        .map((testType) => {
          return testType.name;
        })
        .indexOf(this.name);
      application.testEnvironments[testEnvironmentIndex].testTypes[
        testTypeIndex
      ].autoCreateSnapshots = event.currentTarget.checked;

      Meteor.call('updateSystemUnderTest', application);
    }
  },
  'change input#enableAdaptCheckbox'(event) {
    const application = Applications.findOne({
      name: Session.get('application'),
    });
    if (application) {
      const testEnvironmentIndex = application.testEnvironments
        .map((testEnvironment) => {
          return testEnvironment.name;
        })
        .indexOf($(event.currentTarget).attr('test-environment'));
      const testTypeIndex = application.testEnvironments[
        testEnvironmentIndex
      ].testTypes
        .map((testType) => {
          return testType.name;
        })
        .indexOf(this.name);
      application.testEnvironments[testEnvironmentIndex].testTypes[
        testTypeIndex
      ].enableAdapt = event.currentTarget.checked;

      Meteor.call('updateSystemUnderTest', application);
    }
  },
  'change input#runAdaptCheckbox'(event) {
    const application = Applications.findOne({
      name: Session.get('application'),
    });
    if (application) {
      const testEnvironmentIndex = application.testEnvironments
        .map((testEnvironment) => {
          return testEnvironment.name;
        })
        .indexOf($(event.currentTarget).attr('test-environment'));
      const testTypeIndex = application.testEnvironments[
        testEnvironmentIndex
      ].testTypes
        .map((testType) => {
          return testType.name;
        })
        .indexOf(this.name);
      application.testEnvironments[testEnvironmentIndex].testTypes[
        testTypeIndex
      ].runAdapt = event.currentTarget.checked;
      if (event.currentTarget.checked === false) {
        application.testEnvironments[testEnvironmentIndex].testTypes[
          testTypeIndex
        ].enableAdapt = false;
      }
      Meteor.call('updateSystemUnderTest', application);
    }
  },
  'change input#difference-threshold'(event) {
    const application = Applications.findOne({
      name: Session.get('application'),
    });
    if (application) {
      const testEnvironmentIndex = application.testEnvironments
        .map((testEnvironment) => {
          return testEnvironment.name;
        })
        .indexOf($(event.currentTarget).attr('test-environment'));
      const testTypeIndex = application.testEnvironments[
        testEnvironmentIndex
      ].testTypes
        .map((testType) => {
          return testType.name;
        })
        .indexOf(this.name);
      application.testEnvironments[testEnvironmentIndex].testTypes[
        testTypeIndex
      ].differenceScoreThreshold = parseInt(event.currentTarget.value);

      Meteor.call('updateSystemUnderTest', application);
    }
  },
});

Template.tracingServiceModal.helpers({
  tracingService() {
    return this.tracingService;
  },
});

Template.tracingServiceModal.events({
  'click button#save-tracing-service'(event) {
    event.preventDefault();

    const application = Applications.findOne({
      name: Session.get('application'),
    });
    if (application) {
      switch (this.scope) {
        case 'global':
          application.tracingService = $('#tracing-service').val();
          break;
        case 'testEnvironment':
          application.testEnvironments[
            application.testEnvironments
              .map((testEnvironment) => {
                return testEnvironment.name;
              })
              .indexOf(this.name)
          ].tracingService = $('#tracing-service').val();
          break;
        case 'workload':
          const testEnvironmentIndex = application.testEnvironments
            .map((testEnvironment) => {
              return testEnvironment.name;
            })
            .indexOf(this.testEnvironment);
          const testTypeIndex = application.testEnvironments[
            testEnvironmentIndex
          ].testTypes
            .map((testType) => {
              return testType.name;
            })
            .indexOf(this.name);
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].tracingService = $('#tracing-service').val();
          break;
      }
    }

    Meteor.call('updateSystemUnderTest', application);
    // $('#testrun-release-modal').modal('hide');
    // noinspection JSCheckFunctionSignatures
    Modal.hide('tracingServiceModal');
  },
});

Template.pyroscopeApplicationModal.helpers({
  pyroscopeApplication() {
    return this.pyroscopeApplication;
  },
  pyroscopeProfiler() {
    return this.pyroscopeProfiler;
  },
  isSelectedpyrPscopeProfilerOption(value, pyroscopeProfiler) {
    return value === pyroscopeProfiler ? 'selected' : '';
  },
  pyroscopeProfilerOptions() {
    return [
      {
        value: 'process_cpu:cpu:nanoseconds:cpu:nanoseconds',
        label: 'process_cpu/cpu',
      },
      {
        value: 'memory:alloc_in_new_tlab_bytes:bytes:space:bytes',
        label: 'memory/alloc_in_new_tlab_bytes',
      },
      {
        value: 'memory:alloc_in_new_tlab_objects:count:space:bytes',
        label: 'memory/alloc_in_new_tlab_objects',
      },
      {
        value: 'mutex:contentions:count:mutex:count',
        label: 'mutex/contentions',
      },
      { value: 'mutex:delay:nanoseconds:mutex:count', label: 'mutex/delay' },
      {
        value: 'block:contentions:count:block:count',
        label: 'block/contentions',
      },
      { value: 'block:delay:nanoseconds:block:count', label: 'block/delay' },
    ];
  },
});

Template.pyroscopeApplicationModal.events({
  'click button#save-pyroscope-application'(event) {
    event.preventDefault();

    const application = Applications.findOne({
      name: Session.get('application'),
    });
    if (application) {
      switch (this.scope) {
        case 'global':
          application.pyroscopeApplication = $('#pyroscope-application').val();
          if (application.pyroscopeApplication) {
            application.pyroscopeProfiler = $(
              '#pyroscope-profiler select option:selected',
            ).text();
          } else {
            application.pyroscopeProfiler = undefined;
          }
          break;
        case 'testEnvironment':
          application.testEnvironments[
            application.testEnvironments
              .map((testEnvironment) => {
                return testEnvironment.name;
              })
              .indexOf(this.name)
          ].pyroscopeApplication = $('#pyroscope-application').val();
          if (
            application.testEnvironments[
              application.testEnvironments
                .map((testEnvironment) => {
                  return testEnvironment.name;
                })
                .indexOf(this.name)
            ].pyroscopeApplication
          ) {
            application.testEnvironments[
              application.testEnvironments
                .map((testEnvironment) => {
                  return testEnvironment.name;
                })
                .indexOf(this.name)
            ].pyroscopeProfiler = $(
              '#pyroscope-profiler select option:selected',
            ).text();
          } else {
            application.testEnvironments[
              application.testEnvironments
                .map((testEnvironment) => {
                  return testEnvironment.name;
                })
                .indexOf(this.name)
            ].pyroscopeProfiler = undefined;
          }
          break;
        case 'workload':
          const testEnvironmentIndex = application.testEnvironments
            .map((testEnvironment) => {
              return testEnvironment.name;
            })
            .indexOf(this.testEnvironment);
          const testTypeIndex = application.testEnvironments[
            testEnvironmentIndex
          ].testTypes
            .map((testType) => {
              return testType.name;
            })
            .indexOf(this.name);
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].pyroscopeApplication = $('#pyroscope-application').val();
          if (
            application.testEnvironments[testEnvironmentIndex].testTypes[
              testTypeIndex
            ].pyroscopeApplication
          ) {
            application.testEnvironments[testEnvironmentIndex].testTypes[
              testTypeIndex
            ].pyroscopeProfiler = $(
              '#pyroscope-profiler select option:selected',
            ).text();
          } else {
            application.testEnvironments[testEnvironmentIndex].testTypes[
              testTypeIndex
            ].pyroscopeProfiler = undefined;
          }
          break;
      }
    }

    Meteor.call('updateSystemUnderTest', application);
    // $('#testrun-release-modal').modal('hide');
    // noinspection JSCheckFunctionSignatures
    Modal.hide('pyroscopeApplicationModal');
  },
});

Template.dynatraceEntityModal.events({
  'click button#save-dynatrace-entity'(event) {
    event.preventDefault();

    const application = Applications.findOne({
      name: Session.get('application'),
    });
    if (application) {
      switch (this.scope) {
        case 'global':
          application.dynatraceEntities = Session.get(
            'dynatraceServiceEntities',
          );
          break;
        case 'testEnvironment':
          application.testEnvironments[
            application.testEnvironments
              .map((testEnvironment) => {
                return testEnvironment.name;
              })
              .indexOf(this.name)
          ].dynatraceEntities = Session.get('dynatraceServiceEntities');
          break;
        case 'workload':
          const testEnvironmentIndex = application.testEnvironments
            .map((testEnvironment) => {
              return testEnvironment.name;
            })
            .indexOf(this.testEnvironment);
          const testTypeIndex = application.testEnvironments[
            testEnvironmentIndex
          ].testTypes
            .map((testType) => {
              return testType.name;
            })
            .indexOf(this.name);
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].dynatraceEntities = Session.get('dynatraceServiceEntities');
          break;
      }
    }

    Meteor.call('updateSystemUnderTest', application);
    // $('#testrun-release-modal').modal('hide');
    // noinspection JSCheckFunctionSignatures
    Modal.hide('dynatraceEntityModal');
  },
});

Template.baselineTestRunModal.onCreated(
  function baselineTestRunModalOnCreated() {
    const query = {
      $and: [
        { application: Session.get('application') },
        { testEnvironment: this.data.testEnvironment },
        { testType: this.data.name },
      ],
    };

    // let snapshotQuery =  {
    //     $and: [
    //         {application: Session.get('application') },
    //         {testEnvironment: this.data.testEnvironment },
    //         {testType: this.data.name }
    //     ]
    // };
    //
    // Meteor.subscribe('snapshots', snapshotQuery);

    Meteor.subscribe('testRuns', 'systemUnderTest', 50, query);
  },
);

Template.baselineTestRunModal.events({
  'click button#save-baseline-test-run'(event) {
    event.preventDefault();

    const baselineTestRunId = Session.get('baselineTestRunId');

    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      baselineTestRunId,
    );

    swal({
      title: 'Set test run as baseline',
      text: baselineTestRunId,
      icon: 'warning',
      buttons: ['Cancel', 'OK'],
      dangerMode: true,
    }).then((confirm) => {
      //bound to the current `this`
      if (confirm) {
        const application = Applications.findOne({
          name: Session.get('application'),
        });
        if (application) {
          const testEnvironmentIndex = application.testEnvironments
            .map((testEnvironment) => {
              return testEnvironment.name;
            })
            .indexOf(this.testEnvironment);
          const testTypeIndex = application.testEnvironments[
            testEnvironmentIndex
          ].testTypes
            .map((testType) => {
              return testType.name;
            })
            .indexOf(this.name);
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].baselineTestRun = baselineTestRunId;

          Meteor.call('updateSystemUnderTest', application);
          // $('#testrun-release-modal').modal('hide');

          // noinspection JSCheckFunctionSignatures
          Modal.hide('baselineTestRunModal');

          Meteor.call('setTestRunAsBaseline', testRun, (error, testRun) => {
            toastr['info'](
              'This might take a while',
              'Updating test runs benchmark results',
            );

            if (error) {
              toastr.clear();
              window.toastr['error'](JSON.stringify(error), 'Error');
            } else if (testRun.error) {
              toastr.clear();
              window.toastr['error'](JSON.stringify(testRun.error), 'Error');
            } else {
              toastr.clear();
              toastr['success']('Done!', 'Updated test runs benchmark results');
            }
          });
        }
      } else {
        swal.close();
      }
    });
  },
});
