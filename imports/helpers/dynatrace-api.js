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

export const dynatraceApiGet = async (endpoint) => {
  const token = 'Api-Token ' + Meteor.settings.dynatraceApiToken;
  const dynatraceUrl = Meteor.settings.dynatraceUrl;
  const apiUrl = dynatraceUrl + endpoint;

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
  return response.json();
};

export const dynatraceApiPost = async (endpoint, postData) => {
  const token = 'Api-Token ' + Meteor.settings.dynatraceApiToken;
  const dynatraceUrl = Meteor.settings.dynatraceUrl;
  const apiUrl = dynatraceUrl + endpoint;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(postData),
  });
  return response.json();
};
