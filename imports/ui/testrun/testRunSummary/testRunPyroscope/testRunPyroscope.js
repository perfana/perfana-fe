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
import { ReactiveVar } from 'meteor/reactive-var';

import './testRunPyroscope.html';

import { getTestRun } from '/imports/helpers/utils';
import { Session } from 'meteor/session';
import { Applications } from '/imports/collections/applications';
import { TestRuns } from '/imports/collections/testruns';

Template.testRunPyroscope.onCreated(function testRunPyroscopeOnCreated() {
  // this.requestNameFilter = new ReactiveVar();
  this.testRunPyroscope = new ReactiveVar();
  this.testRun = new ReactiveVar();
  this.pyroscopeApplication = new ReactiveVar();
  this.pyroscopeProfiler = new ReactiveVar();
  this.baselineTestRun = new ReactiveVar();
  this.singleViewCollapsed = new ReactiveVar(false);
  this.compareViewCollapsed = new ReactiveVar(true);
  this.activeHref = new ReactiveVar('single');

  const query = {
    $and: [
      { application: Session.get('application') },
      { testEnvironment: Session.get('testEnvironment') },
      { testType: Session.get('testType') },
    ],
  };

  Meteor.subscribe('testRuns', 'testRunPyroscope', 50, query);
  Meteor.subscribe('applications');

  this.autorun(() => {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      this.testRun.set(testRun);

      const application = Applications.findOne({
        name: testRun.application,
      });

      const testEnvironmentIndex = application.testEnvironments
        .map((testEnvironment) => {
          return testEnvironment.name;
        })
        .indexOf(testRun.testEnvironment);
      const testTypeIndex = application.testEnvironments[
        testEnvironmentIndex
      ].testTypes
        .map((testType) => {
          return testType.name;
        })
        .indexOf(testRun.testType);

      if (
        application.testEnvironments[testEnvironmentIndex].testTypes[
          testTypeIndex
        ].pyroscopeApplication
      ) {
        this.pyroscopeApplication.set(
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].pyroscopeApplication,
        );
        this.pyroscopeProfiler.set(
          application.testEnvironments[testEnvironmentIndex].testTypes[
            testTypeIndex
          ].pyroscopeProfiler,
        );
      } else if (
        application.testEnvironments[testEnvironmentIndex].pyroscopeApplication
      ) {
        this.pyroscopeApplication.set(
          application.testEnvironments[testEnvironmentIndex]
            .pyroscopeApplication,
        );
        this.pyroscopeProfiler.set(
          application.testEnvironments[testEnvironmentIndex].pyroscopeProfiler,
        );
      } else if (application.pyroscopeApplication) {
        this.pyroscopeApplication.set(application.pyroscopeApplication);
        this.pyroscopeProfiler.set(application.pyroscopeProfiler);
      }
    }

    if (Session.get('pyroscopeBaseline')) {
      const baselineTestRun = TestRuns.findOne({
        _id: Session.get('pyroscopeBaseline'),
      });

      if (baselineTestRun) this.baselineTestRun.set(baselineTestRun);
    }
  });
});

Template.testRunPyroscope.helpers({
  pyroscopeUrl() {
    if (Template.instance().testRun.get())
      return createPyroscopeUrl(
        Template.instance().testRun.get(),
        Template.instance().pyroscopeApplication.get(),
        Template.instance().pyroscopeProfiler.get(),
      );
  },
  pyroscopeCompareUrl() {
    if (Template.instance().testRun.get())
      return createPyroscopeCompareUrl(
        Template.instance().testRun.get(),
        Template.instance().baselineTestRun.get(),
        'comparison',
        Template.instance().pyroscopeApplication.get(),
        Template.instance().pyroscopeProfiler.get(),
      );
  },
  pyroscopeDiffUrl() {
    if (Template.instance().testRun.get())
      return createPyroscopeCompareUrl(
        Template.instance().testRun.get(),
        Template.instance().baselineTestRun.get(),
        'comparison-diff',
        Template.instance().pyroscopeApplication.get(),
        Template.instance().pyroscopeProfiler.get(),
      );
  },
  pyroscopeBaselineSelected() {
    return Session.get('pyroscopeBaseline') !== undefined;
  },
  singleViewCollapsed() {
    return Template.instance().singleViewCollapsed.get();
  },
  compareViewCollapsed() {
    return Template.instance().compareViewCollapsed.get();
  },
  pyroscopeTabActive(href) {
    return Template.instance().activeHref.get() === href.toString();
  },
  multipleTestRuns() {
    const testRun = getTestRun(
      FlowRouter.current().queryParams.systemUnderTest,
      FlowRouter.current().params.testRunId,
    );

    if (testRun) {
      const multipleTestRuns = TestRuns.find({
        $and: [
          { application: testRun.application },
          { testEnvironment: testRun.testEnvironment },
          { testType: testRun.testType },
        ],
      }).fetch();

      return multipleTestRuns.length > 1;
    }
  },
});

Template.testRunPyroscope.events({
  'click .nav-tabs.pyroscope-tags  a'(event, template) {
    event.preventDefault();
    template.activeHref.set(
      event.currentTarget.getAttribute('href').replace('#', ''),
    );
  },
  'click #pyroscope-single-link'(event, template) {
    const url = createPyroscopeUrl(
      template.testRun.get(),
      template.pyroscopeApplication.get(),
      template.pyroscopeProfiler.get(),
    );

    window.open(url, '_blank');
  },
  'click #pyroscope-compare-link'(event, template) {
    const url = createPyroscopeCompareUrl(
      template.testRun.get(),
      template.baselineTestRun.get(),
      'comparison',
      template.pyroscopeApplication.get(),
      template.pyroscopeProfiler.get(),
    );

    window.open(url, '_blank');
  },
  'click #pyroscope-diff-link'(event, template) {
    const url = createPyroscopeCompareUrl(
      template.testRun.get(),
      template.baselineTestRun.get(),
      'comparison-diff',
      template.pyroscopeApplication.get(),
      template.pyroscopeProfiler.get(),
    );

    window.open(url, '_blank');
  },
});

const profilers = [
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
  { value: 'mutex:contentions:count:mutex:count', label: 'mutex/contentions' },
  { value: 'mutex:delay:nanoseconds:mutex:count', label: 'mutex/delay' },
  { value: 'block:contentions:count:block:count', label: 'block/contentions' },
  { value: 'block:delay:nanoseconds:block:count', label: 'block/delay' },
];

const createPyroscopeUrl = (
  testRun,
  pyroscopeApplication,
  pyroscopeProfilerLabel,
) => {
  const theme = Meteor.user()?.profile?.theme || 'light';
  const pyroscopeUrl =
    Meteor.settings.public.pyroscopeUrl || 'http://localhost:4040';
  const pyroscopeStandAlone =
    Meteor.settings.public.pyroscopeStandAlone || false;
  const pyroscopeProfiler = profilers.find(
    (p) => p.label === pyroscopeProfilerLabel,
  );
  const timestamps = {
    start: Math.round(new Date(testRun.start).getTime() / 1000),
    end: Math.round(new Date(testRun.end).getTime() / 1000),
  };
  const applicationQuerystring =
    pyroscopeApplication ?
      `&var-profileMetricId=${pyroscopeProfiler.value}&var-serviceName=${pyroscopeApplication}`
    : '';

  if (pyroscopeStandAlone) {
    return `${pyroscopeUrl}/?from=${timestamps.start}&until=${timestamps.end}${applicationQuerystring}`;
  }

  const dates = {
    start: new Date(testRun.start).toISOString(),
    end: new Date(testRun.end).toISOString(),
  };

  return `${pyroscopeUrl}?searchText=&panelType=time-series&layout=grid&hideNoData=off&explorationType=flame-graph&var-serviceName=${pyroscopeApplication}&var-profileMetricId=${pyroscopeProfiler.value}&var-groupBy=all&var-filters=&maxNodes=16384&from=${dates.start}&to=${dates.end}&theme=${theme}&kiosk`;
};

const createPyroscopeCompareUrl = (
  testRun,
  baselineTestRun,
  view,
  pyroscopeApplication,
  pyroscopeProfilerLabel,
) => {
  const theme =
    Meteor.user().profile.theme ? Meteor.user().profile.theme : 'light';

  const leftStart = Math.round(
    new Date(baselineTestRun.start).getTime() / 1000,
  );
  const leftEnd = Math.round(new Date(baselineTestRun.end).getTime() / 1000);
  const rightStart = Math.round(new Date(testRun.start).getTime() / 1000);
  const rightEnd = Math.round(new Date(testRun.end).getTime() / 1000);
  const pyroscopeUrl =
    Meteor.settings.public.pyroscopeUrl ?
      Meteor.settings.public.pyroscopeUrl
    : 'http://localhost:4040';
  const pyroscopeStandAlone =
    Meteor.settings.public.pyroscopeStandAlone ?
      Meteor.settings.public.pyroscopeStandAlone
    : false;
  const pyroscopeProfiler = profilers.find(
    (p) => p.label === pyroscopeProfilerLabel,
  );

  if (pyroscopeStandAlone) {
    const start = Math.round(new Date(baselineTestRun.start).getTime() / 1000);
    const end = Math.round(new Date(testRun.end).getTime() / 1000);
    const applicationQuerystring =
      pyroscopeApplication ?
        `&query=${pyroscopeProfilerLabel}{service_name="${pyroscopeApplication}"}`
      : '';

    return `${pyroscopeUrl}/${view}?from=${start}&until=${end}&leftFrom=${leftStart}&leftUntil=${leftEnd}&rightFrom=${rightStart}&rightUntil=${rightEnd}${applicationQuerystring}`;
  } else {
    const leftStartDate = new Date(baselineTestRun.start).toISOString();
    const leftEndDate = new Date(baselineTestRun.end).toISOString();
    const rightStartDate = new Date(testRun.start).toISOString();
    const rightEndDate = new Date(testRun.end).toISOString();

    return `${pyroscopeUrl}?searchText=&panelType=time-series&layout=grid&hideNoData=off&explorationType=diff-flame-graph&var-serviceName=${pyroscopeApplication}&var-profileMetricId=${pyroscopeProfiler.value}&var-groupBy=all&var-filters=&maxNodes=16384&diffFrom=${leftStartDate}&diffTo=${leftEndDate}&diffFrom-2=${rightStartDate}&diffTo-2=${rightEndDate}&from-2=${leftStartDate}&to-2=${leftEndDate}&from-3=${rightStartDate}&to-3=${rightEndDate}&theme=${theme}&kiosk`;
  }
};
