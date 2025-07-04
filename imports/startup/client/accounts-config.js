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

// noinspection NpmUsedModulesInstalled

import { Accounts } from 'meteor/accounts-base';
import { AccountsTemplates } from 'meteor/perfana-useraccounts:core';
import { Meteor } from 'meteor/meteor';

Accounts.ui.config({
  passwordSignupFields: 'EMAIL_ONLY',
});

AccountsTemplates.configure({
  forbidClientAccountCreation:
    Meteor.settings.public.forbidClientAccountCreation ?
      Meteor.settings.public.forbidClientAccountCreation
    : false,
});

Accounts.config({
  loginExpirationInDays:
    Meteor.settings.loginExpirationInDays ?
      Meteor.settings.loginExpirationInDays
    : 1,
});
