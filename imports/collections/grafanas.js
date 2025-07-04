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

export const Grafanas = new Mongo.Collection('grafanas');

const GrafanaSchema = new SimpleSchema({
  label: {
    type: String,
    label: 'Label',
    index: true,
    unique: true,
  },
  clientUrl: {
    type: String,
    label: 'Url to connect from client',
  },
  serverUrl: {
    type: String,
    optional: true,
    label: 'Url to connect from server',
  },
  orgId: {
    type: String,
    label: 'Grafana Organisation ID',
  },
  apiKey: {
    type: String,
    optional: true,
    label: 'Grafana API Key',
    autoform: {
      type: 'password',
    },
  },
  username: {
    type: String,
    optional: true,
  },
  password: {
    type: String,
    autoform: {
      type: 'password',
    },
    optional: true,
  },
  snapshotInstance: {
    type: Boolean,
    label: 'Use this Grafana instance to store all snapshots',
    autoform: {
      defaultValue: false,
    },
  },
  trendsInstance: {
    type: Boolean,
    label: 'Use this Grafana instance to host the Perfana trends dashboard',
    autoform: {
      value: function () {
        return checkTrendsInstance(
          AutoForm.getFieldValue(this.name.replace('trendsInstance', 'label')),
        );
      },
    },
  },
});

const checkTrendsInstance = (label) => {
  const grafana = Grafanas.findOne({ label: label });
  if (grafana && grafana.trendsInstance === true) {
    return true;
  } else {
    // noinspection RedundantIfStatementJS
    if (Grafanas.findOne({ trendsInstance: true })) {
      return false;
    } else {
      return true;
    }
  }
};

Grafanas.attachSchema(GrafanaSchema);

if (Meteor.isClient) {
  window.Grafanas = Grafanas;
}

if (Meteor.isClient) {
  // noinspection JSCheckFunctionSignatures
  AutoForm.addHooks(['editGrafanas', 'addGrafanas'], {
    onSuccess: function (formType) {
      if (formType === 'insert') {
        Meteor.call('setGrafanaInstances', this.insertDoc);
      } else {
        Meteor.call('setGrafanaInstances', this.updateDoc.$set);
      }
    },
  }, false);
}
