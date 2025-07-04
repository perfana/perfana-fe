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
import fetch from 'node-fetch';
// noinspection ES6PreferShortImport
import { log } from '../../../both/logger';

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status}, message: ${JSON.stringify(data)}`,
    );
  }
  return data;
};

export const grafanaCall = (grafana, endpoint, callback) => {
  const apiUrl = grafana.serverUrl
    ? grafana.serverUrl + endpoint
    : grafana.clientUrl + endpoint;

  const options = {
    headers: {
      Authorization: `Bearer ${grafana.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };

  fetch(apiUrl, options)
    .then(handleResponse)
    .then((data) => callback(null, data))
    .catch((error) => {
      log.error(error);
      callback(
        new Meteor.Error(
          500,
          `Call to endpoint ${endpoint} failed: ${error.message}`,
        ),
        null,
      );
    });
};

export const grafanaCallPost = (grafana, endpoint, postData, callback) => {
  const apiUrl = grafana.serverUrl
    ? grafana.serverUrl + endpoint
    : grafana.clientUrl + endpoint;

  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${grafana.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(postData),
  };

  fetch(apiUrl, options)
    .then(handleResponse)
    .then((data) => callback(null, data))
    .catch((error) => {
      log.error(error);
      callback(
        new Meteor.Error(
          500,
          `Call to endpoint ${endpoint} failed: ${error.message}`,
        ),
        null,
      );
    });
};

export const grafanaCallDelete = (grafana, endpoint, callback) => {
  const apiUrl = grafana.serverUrl
    ? grafana.serverUrl + endpoint
    : grafana.clientUrl + endpoint;

  const options = {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${grafana.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };

  fetch(apiUrl, options)
    .then(handleResponse)
    .then((data) => callback(null, data))
    .catch((error) => {
      log.error(error);
      callback(
        new Meteor.Error(
          500,
          `Call to endpoint ${endpoint} failed: ${error.message}`,
        ),
        null,
      );
    });
};
