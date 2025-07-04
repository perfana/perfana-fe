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
import { Session } from 'meteor/session';
import { Applications } from '../collections/applications';
import { Notifications } from '../collections/notifications';
import { Versions } from '../collections/versions';
import { log } from '/both/logger';
import './header.html';
import './header.less';

Template.header.onCreated(function headerOnCreated() {
  this.query = new ReactiveVar({});

  this.autorun(function () {
    FlowRouter.watchPathChange();

    const user = Meteor.user();
    let applications;

    if (user) {
      if (
        Roles.userHasRole(user._id, 'admin') ||
        Roles.userHasRole(user._id, 'super-admin')
      ) {
        applications = Applications.find({}).fetch();
      } else if (user.profile.memberOf) {
        applications = Applications.find({
          team: { $in: user.profile.memberOf.teams },
        }).fetch();
      } else {
        applications = Applications.find({}).fetch();
      }

      const applicationNames = applications.map((application) => {
        return application.name;
      });

      const now = Date.now();
      const currentHour = now - (now % (1000 * 3600));
      const dateBeforeTwoWeeks = new Date(currentHour - 1000 * 3600 * 24 * 14);

      const query = {
        $and: [
          {
            application: {
              $in: applicationNames,
            },
          },
          {
            createdAt: {
              $gte: dateBeforeTwoWeeks,
            },
          },
          {
            viewedBy: { $ne: user._id },
          },
          {
            createdBy: { $ne: user._id },
          },
        ],
      };

      this.subscribe(['notifications', query, 'header']);

      Template.instance().query.set(query);
    }

    if (Meteor.isClient) {
      let connectionStatusColor;
      let connectionStatus;
      if (Meteor.status().status === 'connected') {
        connectionStatusColor = '#09d809';
        connectionStatus = 'Connected to server';
      } else if (Meteor.status().status === 'connecting') {
        connectionStatusColor = '#f79519';
        connectionStatus = 'Connecting to server';
      } else {
        connectionStatusColor = 'red';
        connectionStatus =
          'Not connected to server, check your network connection';
        Meteor.setTimeout(() => {
          Meteor.reconnect();
        }, 10000);
      }
      Session.set('connectionStatusColor', connectionStatusColor);
      Session.set('connectionStatus', connectionStatus);
    }
  });
});

Template.header.helpers({
  perfanaUrl() {
    return Meteor.settings.public.perfanaUrl;
  },
  connectionStatusColor() {
    return Session.get('connectionStatusColor');
  },
  connectionStatus() {
    return Session.get('connectionStatus');
  },
  ref() {
    return encodeURIComponent(location.pathname);
  },
  userIsAdmin() {
    const user = Meteor.user();
    if (user) {
      if (
        Meteor.settings.public.showAdminPages &&
        Meteor.settings.public.showAdminPages === 'true'
      ) {
        return (
          Roles.userHasRole(user._id, 'admin') ||
          Roles.userHasRole(user._id, 'super-admin')
        );
      } else {
        return false;
      }
    }
  },
  userLoggedIn() {
    return Meteor.user();
  },
  notficationCount() {
    if (Template.instance().query)
      return Notifications.find(Template.instance().query.get()).count();
  },
  notificationsPresent() {
    if (Template.instance().query)
      return Notifications.find(Template.instance().query.get()).count() > 0;
  },
  currentThemeIcon() {
    const user = Meteor.user();

    if (user) {
      if (user.profile.theme === 'dark') {
        return 'fa-sun-o';
      } else {
        return 'fa-moon-o';
      }
    }
  },
  theOtherTheme() {
    const user = Meteor.user();

    if (user) {
      if (user.profile.theme === 'dark') {
        return 'Light';
      } else {
        return 'Dark';
      }
    }
  },
});
Template.header.events({
  'click #documentation'() {
    window.open('https://docs.perfana.io/', '_blank');
  },
  'click #support'() {
    window.open('https://perfana.io/support', '_blank');
  },
  'click #theme'() {
    Meteor.call('toggleUserTheme');
  },
  'click #about'() {
    Modal.show('aboutModal');
  },
  'click .logout'() {
    Meteor.call('getLogoutUrl', (error, result) => {
      if (error) {
        log.error(JSON.stringify(result.error));
      } else {
        if (result.error) {
          log.error(JSON.stringify(result.error));
        } else {
          if (result.data) {
            Meteor.logout();
            window.location.replace(result.data);
          } else {
            Meteor.logout();
          }
        }
      }
    });
  },
  'click .application-search-header-toggle'() {
    Session.set('team', null);
    Session.set('testEnvironment', null);
    Session.set('testType', null);
    Session.set('application', null);
  },
  'click .team-search-header-toggle'() {
    Session.set('team', null);
    Session.set('testEnvironment', null);
    Session.set('testType', null);
    Session.set('application', null);
  },
});

Template.aboutModal.onCreated(function aboutModalOnCreated() {
  Meteor.subscribe('versions');
});

Template.aboutModal.helpers({
  versions() {
    return Versions.find();
  },
  fields() {
    return [
      { key: 'component', label: 'Component' },
      { key: 'version', label: 'Version' },
    ];
  },
  settings() {
    return {
      rowsPerPage: 50,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      noDataTmpl: Template.noVersions,
    };
  },
});
