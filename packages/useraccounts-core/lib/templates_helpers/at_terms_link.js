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

AT.prototype.atTermsLinkHelpers = {
  disabled: function () {
    return AccountsTemplates.disabled();
  },
  text: function () {
    return T9n.get(
      AccountsTemplates.texts.termsPreamble,
      (markIfMissing = false),
    );
  },
  privacyUrl: function () {
    return AccountsTemplates.options.privacyUrl;
  },
  privacyLinkText: function () {
    return T9n.get(
      AccountsTemplates.texts.termsPrivacy,
      (markIfMissing = false),
    );
  },
  showTermsAnd: function () {
    return (
      !!AccountsTemplates.options.privacyUrl &&
      !!AccountsTemplates.options.termsUrl
    );
  },
  and: function () {
    return T9n.get(AccountsTemplates.texts.termsAnd, (markIfMissing = false));
  },
  termsUrl: function () {
    return AccountsTemplates.options.termsUrl;
  },
  termsLinkText: function () {
    return T9n.get(AccountsTemplates.texts.termsTerms, (markIfMissing = false));
  },
};

AT.prototype.atTermsLinkEvents = {
  "click a": function (event) {
    if (AccountsTemplates.disabled()) event.preventDefault();
  },
};
