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
import { Applications } from '../../collections/applications';
import { Session } from 'meteor/session';

import './userApplications.html';

Template.userApplications.onCreated(function homeOnCreated() {
  this.userApplications = new ReactiveVar([]);

  Meteor.subscribe(
    'applications',
    {},
    {
      onReady: () => {
        const user = Meteor.user();
        let applications;

        if (user) {
          if (
            Roles.userHasRole(user._id, 'admin') ||
            Roles.userHasRole(user._id, 'super-admin')
          ) {
            applications = Applications.find({}, { sort: { name } });
            this.userApplications.set(
              applications !== undefined && applications !== null ?
                applications
              : [],
            );
          } else if (
            Template.instance().featuresTeams &&
            Template.instance().featuresTeams.get() === true &&
            user.profile.memberOf
          ) {
            applications = Applications.find(
              { team: { $in: user.profile.memberOf.teams } },
              { sort: { name } },
            );
            this.userApplications.set(
              applications !== undefined && applications !== null ?
                applications
              : [],
            );
          } else {
            applications = Applications.find({}, { sort: { name } });
            this.userApplications.set(
              applications !== undefined && applications !== null ?
                applications
              : [],
            );
          }
        }
      },
    },
  );
});

Template.userApplications.helpers({
  userApplications() {
    return Template.instance().userApplications.get() !== undefined ?
        Template.instance().userApplications.get()
      : [];
  },
  adminOrNoTeams() {
    const user = Meteor.user();

    if (user) {
      if (
        Roles.userHasRole(user._id, 'admin') ||
        Roles.userHasRole(user._id, 'super-admin')
      ) {
        return true;
      } else {
        return !user.profile.memberOf;
      }
    }
  },
  fields() {
    return [{ key: 'name', label: 'Name' }];
  },
  settings() {
    return {
      rowsPerPage: 10,
      showFilter: true,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      noDataTmpl: Template.noUserApplications,
    };
  },
});

Template.userApplications.events({
  'click .reactive-table tbody tr'() {
    Session.set('application', this.name);

    const queryParams = {};
    queryParams['systemUnderTest'] = this.name;

    const singleTestEnvironment = getSingleTestEnvironment(
      Session.get('application'),
    );
    if (singleTestEnvironment) {
      queryParams['testEnvironment'] = singleTestEnvironment;
      const singleTestType = getSingleTestType(
        Session.get('application'),
        singleTestEnvironment,
      );
      if (singleTestType) {
        queryParams['workload'] = singleTestType;
      }
    }

    FlowRouter.go('testRuns', null, queryParams);
  },
});

const getSingleTestEnvironment = (applicationName) => {
  const application = Applications.findOne({
    name: applicationName,
  });

  if (application) {
    if (application.testEnvironments.length === 1) {
      return application.testEnvironments[0].name;
    } else {
      return undefined;
    }
  }
};

const getSingleTestType = (applicationName, testEnvironmentName) => {
  const application = Applications.findOne({
    name: applicationName,
  });

  if (application) {
    const testEnvironmentIndex = application.testEnvironments
      .map((testEnvironment) => testEnvironment.name)
      .indexOf(testEnvironmentName);

    if (
      application.testEnvironments[testEnvironmentIndex].testTypes.length === 1
    ) {
      return application.testEnvironments[testEnvironmentIndex].testTypes[0]
        .name;
    } else {
      return undefined;
    }
  }
};
