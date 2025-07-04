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

Oidc = {};

// Request OpenID Connect credentials for the user
// @param options {optional}
// @param credentialRequestCompleteCallback {Function} Callback function to call on
//   completion. Takes one argument, credentialToken on success, or Error on
//   error.
Oidc.requestCredential = function (options, credentialRequestCompleteCallback) {
  // support both (options, callback) and (callback).
  if (!credentialRequestCompleteCallback && typeof options === "function") {
    credentialRequestCompleteCallback = options;
    options = {};
  }

  var config = ServiceConfiguration.configurations.findOne({ service: "oidc" });
  if (!config) {
    credentialRequestCompleteCallback &&
      credentialRequestCompleteCallback(
        new ServiceConfiguration.ConfigError("Service oidc not configured."),
      );
    return;
  }

  var credentialToken = Random.secret();
  var loginStyle = OAuth._loginStyle("oidc", config, options);
  var scope = config.requestPermissions || ["openid", "profile", "email"];

  // options
  options = options || {};
  options.client_id = config.clientId;
  options.response_type = options.response_type || "code";
  options.redirect_uri = OAuth._redirectUri("oidc", config);
  options.state = OAuth._stateParam(
    loginStyle,
    credentialToken,
    options.redirectUrl,
  );
  options.scope = scope.join(" ");

  if (config.loginStyle && config.loginStyle == "popup") {
    options.display = "popup";
  }

  var loginUrl = config.serverUrl + config.authorizationEndpoint;
  // check if the loginUrl already contains a "?"
  var urlHasQuestionMark = loginUrl.indexOf("?") !== -1;
  var index = 0;
  for (var k in options) {
    if (index === 0 && !urlHasQuestionMark) {
      loginUrl += "?";
    } else {
      loginUrl += "&";
    }
    loginUrl += encodeURIComponent(k) + "=" + encodeURIComponent(options[k]);
    index++;
  }

  //console.log('XXX: loginURL: ' + loginUrl)

  options.popupOptions = options.popupOptions || {};
  var popupOptions = {
    width: options.popupOptions.width || 320,
    height: options.popupOptions.height || 450,
  };

  OAuth.launchLogin({
    loginService: "oidc",
    loginStyle: loginStyle,
    loginUrl: loginUrl,
    credentialRequestCompleteCallback: credentialRequestCompleteCallback,
    credentialToken: credentialToken,
    popupOptions: popupOptions,
  });
};
