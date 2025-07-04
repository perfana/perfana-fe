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

AT.prototype.atErrorHelpers = {
  singleError: function () {
    var errors = AccountsTemplates.state.form.get("error");
    return errors && errors.length === 1;
  },
  error: function () {
    return AccountsTemplates.state.form.get("error");
  },
  errorText: function () {
    var field, err;
    if (this.field) {
      field = T9n.get(this.field, (markIfMissing = false));
      err = T9n.get(this.err, (markIfMissing = false));
    } else err = T9n.get(this.valueOf(), (markIfMissing = false));

    // Possibly removes initial prefix in case the key in not found inside t9n
    if (err.substring(0, 15) === "error.accounts.") err = err.substring(15);

    if (field) return field + ": " + err;
    return err;
  },
};
