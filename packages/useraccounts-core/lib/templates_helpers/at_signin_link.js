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

AT.prototype.atSigninLinkHelpers = {
  disabled: function () {
    return AccountsTemplates.disabled();
  },
  signInLink: function () {
    return AccountsTemplates.getRoutePath("signIn");
  },
  preText: function () {
    return T9n.get(
      AccountsTemplates.texts.signInLink_pre,
      (markIfMissing = false),
    );
  },
  linkText: function () {
    return T9n.get(
      AccountsTemplates.texts.signInLink_link,
      (markIfMissing = false),
    );
  },
  suffText: function () {
    return T9n.get(
      AccountsTemplates.texts.signInLink_suff,
      (markIfMissing = false),
    );
  },
};

AT.prototype.atSigninLinkEvents = {
  "click #at-signIn": function (event, t) {
    event.preventDefault();
    AccountsTemplates.linkClick("signIn");
  },
};
