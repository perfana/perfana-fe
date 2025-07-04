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
// noinspection ES6PreferShortImport
import { log } from '../../../both/logger';

export const grafanaApiGetBasicAuth = async (grafana, endpoint) => {
  const grafanaSettings = Meteor.settings.grafanaInstances.find(
    (grafanaInstance) => grafanaInstance.label === grafana.label,
  );

  const auth = Buffer.from(
    `${grafanaSettings.username}:${grafanaSettings.password}`,
  ).toString('base64');

  const apiUrl = grafanaSettings.serverUrl
    ? grafanaSettings.serverUrl + endpoint
    : grafanaSettings.clientUrl + endpoint;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${auth}`,
      },
    });
    return response.json();
  } catch (err) {
    log.error(err);
  }
};

export const grafanaApiPutBasicAuth = async (grafana, endpoint, postData) => {
  const grafanaSettings = Meteor.settings.grafanaInstances.find(
    (grafanaInstance) => grafanaInstance.label === grafana.label,
  );

  const auth = Buffer.from(
    `${grafanaSettings.username}:${grafanaSettings.password}`,
  ).toString('base64');

  const apiUrl = grafanaSettings.serverUrl
    ? grafanaSettings.serverUrl + endpoint
    : grafanaSettings.clientUrl + endpoint;

  try {
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(postData),
    });
    return response.json();
  } catch (err) {
    log.error(err);
  }
};

export const grafanaApiPatchBasicAuth = async (grafana, endpoint, postData) => {
  const grafanaSettings = Meteor.settings.grafanaInstances.find(
    (grafanaInstance) => grafanaInstance.label === grafana.label,
  );

  const auth = Buffer.from(
    `${grafanaSettings.username}:${grafanaSettings.password}`,
  ).toString('base64');

  const apiUrl = grafanaSettings.serverUrl
    ? grafanaSettings.serverUrl + endpoint
    : grafanaSettings.clientUrl + endpoint;

  try {
    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(postData),
    });
    return response.json();
  } catch (err) {
    log.error(err);
  }
};

export const grafanaApiPostBasicAuth = async (grafana, endpoint, postData) => {
  const grafanaSettings = Meteor.settings.grafanaInstances.find(
    (grafanaInstance) => grafanaInstance.label === grafana.label,
  );

  const auth = Buffer.from(
    `${grafanaSettings.username}:${grafanaSettings.password}`,
  ).toString('base64');

  const apiUrl = grafanaSettings.serverUrl
    ? grafanaSettings.serverUrl + endpoint
    : grafanaSettings.clientUrl + endpoint;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(postData),
    });
    return response.json();
  } catch (err) {
    log.error(err);
  }
};
