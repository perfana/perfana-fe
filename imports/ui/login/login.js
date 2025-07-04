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

import './login.html';
import './atSocial.html';
import './atForm.html';

Template['overrideAtOauth'].replaces('atOauth');
Template['overrideAtSocial'].replaces('atSocial');
Template['overrideAtForm'].replaces('atForm');

Template.atOauth.helpers({
  oauthServiceEnabled() {
    return this.configured;
  },
});

Template.atSocial.helpers({
  identityProviderEnabled() {
    return !!Meteor.settings.public.identityProvider;
  },

  identityProvider() {
    if (Meteor.settings.public.identityProvider) {
      switch (Meteor.settings.public.identityProvider) {
        case 'google':
          return 'google_sign_in_button_icon';
        case 'microsoft':
          return 'microsoft_sign_in_button_icon';
        default:
          return '';
      }
    }
  },

  overrideLoginButtonText() {
    return Meteor.settings.public.overrideLoginButtonText ?
        Meteor.settings.public.overrideLoginButtonText
      : this._id.charAt(0).toUpperCase() + this._id.slice(1);
  },

  hide() {
    if (FlowRouter.current().queryParams.showUsernamePasswordLogin) {
      return (
        !FlowRouter.current().queryParams.showUsernamePasswordLogin === true
      );
    } else {
      return Meteor.settings.public.showUsernamePasswordLogin !== undefined ?
          Meteor.settings.public.showUsernamePasswordLogin === false
        : false;
    }
  },
});

Template.atForm.helpers({
  hideUserNamePassword() {
    if (FlowRouter.current().queryParams.showUsernamePasswordLogin) {
      return (
        !FlowRouter.current().queryParams.showUsernamePasswordLogin === true
      );
    } else {
      return Meteor.settings.public.showUsernamePasswordLogin !== undefined ?
          Meteor.settings.public.showUsernamePasswordLogin === false
        : false;
    }
  },
});

Template.login.onCreated(function loginOnCreated() {
  Session.set('logIn', true);
});

Template.login.helpers({
  perfanaUrl() {
    return Meteor.settings.public.perfanaUrl;
  },
  hide() {
    if (FlowRouter.current().queryParams.showUsernamePasswordLogin) {
      return (
        !FlowRouter.current().queryParams.showUsernamePasswordLogin === true
      );
    } else {
      return Meteor.settings.public.showUsernamePasswordLogin !== undefined ?
          Meteor.settings.public.showUsernamePasswordLogin === false
        : false;
    }
  },
});
