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

import fetch from 'node-fetch';

Oidc = {};

OAuth.registerService("oidc", 2, null, async function (query) {
  var debug = false;
  var token = await getToken(query);
  if (debug) console.log("XXX: register token:", token);

  var accessToken = token.access_token || token.id_token;
  var expiresAt = +new Date() + 1000 * parseInt(token.expires_in, 10);

  var userinfo = await getUserInfo(accessToken, expiresAt);
  if (debug) console.log("XXX: userinfo:", userinfo);

  var serviceData = {};
  serviceData.id = userinfo.id;
  serviceData.username = userinfo.username;
  serviceData.accessToken = userinfo.accessToken;
  serviceData.idToken = token.id_token;
  serviceData.expiresAt = userinfo.expiresAt;
  serviceData.email = userinfo.email;

  if (accessToken) {
    var tokenContent = getTokenContent(accessToken);
    var fields = _.pick(
      tokenContent,
      getConfiguration().idTokenWhitelistFields,
    );
    _.extend(serviceData, fields);
  }

  if (token.refresh_token) serviceData.refreshToken = token.refresh_token;
  if (debug) console.log("XXX: serviceData:", serviceData);

  var profile = {};
  profile.name = userinfo.name;
  profile.email = userinfo.email;
  if (debug) console.log("XXX: profile:", profile);

  return {
    serviceData: serviceData,
    options: { profile: profile },
  };
});

var userAgent = "Meteor";
if (Meteor.release) {
  userAgent += "/" + Meteor.release;
}

var getToken = async function (query) {
  var debug = false;
  var config = getConfiguration();
  var serverTokenEndpoint =
    config.tokenEndpoint.indexOf("http") !== -1
      ? config.tokenEndpoint
      : config.serverUrl + config.tokenEndpoint;
  var redirect_uri = OAuth._redirectUri("oidc", config).replace(
    "http:",
    "https:",
  );

  if (debug) console.log("XXX: redirect_uri: ", redirect_uri);

  const params = new URLSearchParams({
    code: query.code,
    client_id: config.clientId,
    client_secret: OAuth.openSecret(config.secret),
    redirect_uri: redirect_uri,
    grant_type: "authorization_code",
    state: query.state,
  });

  try {
    const response = await fetch(serverTokenEndpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'User-Agent': userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      if (debug)
        console.log(
          "Failed to complete handshake with OIDC " +
            serverTokenEndpoint +
            ": " +
            data.error,
        );
      throw new Error(
        "Failed to complete handshake with OIDC " +
          serverTokenEndpoint +
          ": " +
          data.error,
      );
    }

    if (debug) console.log("XXX: getToken response: ", data);
    return data;
  } catch (err) {
    if (debug)
      console.log(
        "Failed to get token from OIDC " +
          serverTokenEndpoint +
          ": " +
          err.message,
      );
    throw _.extend(
      new Error(
        "Failed to get token from OIDC " +
          serverTokenEndpoint +
          ": " +
          err.message,
      ),
      { response: err.response },
    );
  }
};

var getUserInfo = function (accessToken, expiresAt) {
  var config = getConfiguration();

  if (config.userinfoEndpoint) {
    return getUserInfoFromEndpoint(accessToken, config, expiresAt);
  } else {
    return getUserInfoFromToken(accessToken);
  }
};

var getConfiguration = function () {
  var config = ServiceConfiguration.configurations.findOne({ service: "oidc" });
  if (!config) {
    throw new ServiceConfiguration.ConfigError("Service oidc not configured.");
  }
  return config;
};

var getTokenContent = function (token) {
  var content = null;
  if (token) {
    try {
      var parts = token.split(".");
      var header = JSON.parse(new Buffer(parts[0], "base64").toString());
      content = JSON.parse(new Buffer(parts[1], "base64").toString());
      var signature = new Buffer(parts[2], "base64");
      var signed = parts[0] + "." + parts[1];
    } catch (err) {
      this.content = {
        exp: 0,
      };
    }
  }
  return content;
};

Oidc.retrieveCredential = function (credentialToken, credentialSecret) {
  return OAuth.retrieveCredential(credentialToken, credentialSecret);
};

var getUserInfoFromEndpoint = async function (accessToken, config, expiresAt) {
  var debug = false;

  var serverUserinfoEndpoint =
    config.userinfoEndpoint.indexOf("http") !== -1
      ? config.userinfoEndpoint
      : config.serverUrl + config.userinfoEndpoint;

  try {
    const response = await fetch(serverUserinfoEndpoint, {
      headers: {
        'User-Agent': userAgent,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const userinfo = await response.json();
    if (debug) console.log("XXX: getUserInfo response: ", userinfo);

    return {
      id: userinfo.id || userinfo.sub,
      username: userinfo.username || userinfo.preferred_username,
      accessToken: OAuth.sealSecret(accessToken),
      expiresAt: expiresAt,
      email: userinfo.email,
      name: userinfo.name,
    };
  } catch (err) {
    throw _.extend(
      new Error(
        "Failed to fetch userinfo from OIDC " +
          serverUserinfoEndpoint +
          ": " +
          err.message,
      ),
      { response: err.response },
    );
  }
};

var getUserInfoFromToken = function (accessToken) {
  var tokenContent = getTokenContent(accessToken);
  var mainEmail = tokenContent.email || tokenContent.emails[0];

  return {
    id: tokenContent.sub,
    username:
      tokenContent.username || tokenContent.preferred_username || mainEmail,
    accessToken: OAuth.sealSecret(accessToken),
    expiresAt: tokenContent.exp,
    email: mainEmail,
    name: tokenContent.name,
  };
};
