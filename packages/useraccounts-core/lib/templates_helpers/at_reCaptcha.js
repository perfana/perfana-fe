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

AT.prototype.atReCaptchaRendered = function () {
  $.getScript("//www.google.com/recaptcha/api.js?hl=" + T9n.getLanguage());
};

AT.prototype.atReCaptchaHelpers = {
  key: function () {
    if (
      AccountsTemplates.options.reCaptcha &&
      AccountsTemplates.options.reCaptcha.siteKey
    )
      return AccountsTemplates.options.reCaptcha.siteKey;
    return Meteor.settings.public.reCaptcha.siteKey;
  },

  theme: function () {
    return (
      AccountsTemplates.options.reCaptcha &&
      AccountsTemplates.options.reCaptcha.theme
    );
  },

  data_type: function () {
    return (
      AccountsTemplates.options.reCaptcha &&
      AccountsTemplates.options.reCaptcha.data_type
    );
  },
};
