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

import './apiKeys';
import './profiles';
import './profileDetails';
import './autoconfigDashboards';
import './autoconfigDeepLinks';
import './autoconfigKeyMetrics';
import './autoconfigReportPanels';
import './teams';
import './teamDetails';
import './teamMembers';
import './teamSuts';
import './teamMemberSearchBox';
import './teamsSearchBox';
import './teamSutSearchBox';
import './settings';
import './users';

FlowRouter.route('/settings/automated-configuration', {
  triggersEnter: [],
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'profiles',
    });
  },
  name: 'autoConfigSettings',
});

FlowRouter.route('/settings/teams', {
  triggersEnter: [],
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'teams',
    });
  },
  name: 'teams',
});

FlowRouter.route('/settings/users', {
  triggersEnter: [],
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'users',
    });
  },
  name: 'users',
});

FlowRouter.route('/settings', {
  triggersEnter: [],
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'settings',
    });
  },
  name: 'settings',
});

FlowRouter.route('/settings/api-keys', {
  triggersEnter: [],
  action: function () {
    BlazeLayout.render('perfanaLayout', {
      header: 'header',
      sidebar: 'sidebar',
      main: 'apiKeys',
    });
  },
  name: 'apiKeys',
});
