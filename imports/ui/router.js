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

import './sidebar.js';
import './breadCrump';
import './header.js';
import './home.js';
import './login/login';
import './searchBox/applicationSearchBox';
import './searchBox/teamSearchBox';
import './searchBox/workloadSearchBox';
import './searchBox/versionSearchBox';
import './searchBox/environmentSearchBox';
import './landingPage/landingPage.js';
import './landingPage/userTeams';
import './landingPage/userApplications';
import './landingPage/failedTestRuns';
import './landingPage/usersWithoutTeam';
import './notifications';

import { Session } from 'meteor/session';

FlowRouter.route('/', {
  triggersEnter: [
    () => {
      Session.set('team', undefined);
      Session.set('testType', undefined);
      Session.set('testEnvironment', undefined);
      Session.set('application', undefined);
      Session.set('version', undefined);
      Session.set('current-page', 0);
      Session.set('rows-per-page', 10);
    },
  ],
  triggersExit: [
    () => {
      Session.set('current-page', 0);
      Session.set('rows-per-page', 10);
    },
  ],
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'landingPage',
    });
  },
  name: 'landingPage',
});

FlowRouter.route('/login', {
  name: 'login',
  action() {
    BlazeLayout.render('perfanaLoginLayout');
  },
});

// global triggers

FlowRouter.triggers.enter([
  (queryParams) => {
    if (queryParams.queryParams.team !== undefined)
      Session.set('team', queryParams.queryParams.team);
    else if (Session.get('team') !== '') Session.set('team', undefined);

    if (queryParams.queryParams.systemUnderTest)
      Session.set('application', queryParams.queryParams.systemUnderTest);
    else Session.set('application', undefined);

    if (queryParams.queryParams.workload)
      Session.set('testType', queryParams.queryParams.workload);
    else if (FlowRouter.current().route.path !== '/dashboards') {
      Session.set('testType', undefined);
    }

    if (queryParams.queryParams.testEnvironment)
      Session.set('testEnvironment', queryParams.queryParams.testEnvironment);
    else Session.set('testEnvironment', undefined);

    if (queryParams.queryParams.version)
      Session.set('version', queryParams.queryParams.version);
    else Session.set('version', undefined);

    if (queryParams.queryParams.tags)
      Session.set('tags', queryParams.queryParams.tags.split(','));
    else Session.set('tags', undefined);
  },
  function () {
    if (!Meteor.loggingIn() && !Meteor.userId()) {
      const route = FlowRouter.current();
      if (route.route.name !== 'login') {
        Session.set('redirectAfterLogin', route.path);
        if (FlowRouter.current().path !== '/login') {
          FlowRouter.go('login', null, { ref: FlowRouter.current().path });
        } else {
          FlowRouter.go('login', null, null);
        }
      }
    }
  },
]);

Accounts.onLogin(function () {
  if (Session.equals('logIn', true)) {
    Session.set('logIn', false);
    const redirect = Session.get('redirectAfterLogin');
    if (redirect) {
      Session.set('redirectAfterLogin', null);
      // FlowRouter.go(redirect);
      Meteor.setTimeout(function () {
        FlowRouter.go(redirect);
      }, 100);
    } else {
      FlowRouter.go('landingPage', null, null);
    }
  }
});

Accounts.onLogout(function () {
  FlowRouter.go('login', null, { ref: '/' });
});
