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

/* eslint-disable meteor/no-session */
import { Session } from 'meteor/session';
import { Grafanas } from './grafanas';
import { GrafanaDashboards } from './grafanaDashboards';

export const GenericReportPanels = new Mongo.Collection('genericReportPanels');

const GenericReportPanelsSchema = new SimpleSchema({
  profile: {
    type: String,
    autoform: {
      defaultValue: () => {
        return Session.get('profileName') ? Session.get('profileName') : '';
      },
      readonly: () => {
        return Session.get('profileReadOnly') === true;
      },
      custom: () => {
        if (Session.get('profileReadOnly') === true) {
          setTimeout(() => {
            $('select[name="profile"]').prop('disabled', true);
            $('input[name="profile"]').attr(
              'title',
              'This cannot be changed for default Perfana profiles',
            );
            $('input[name="profile"]').attr('style', 'color: grey !important;');
          }, 500);
        }
      },
    },
  },
  grafana: {
    type: String,
    autoform: {
      type: 'universe-select',
      create: true,
      createOnBlur: true,
      options: [],
      optionsMethod: 'getGrafanas',
      defaultValue: function () {
        return getDefaultGrafana();
      },
    },
  },
  dashboardName: {
    type: String,
    autoform: {
      type: function () {
        const defaultGrafana = getDefaultGrafana();

        if (
          AutoForm.getFieldValue(
            this.name.replace('dashboardName', 'grafana'),
          ) ||
          defaultGrafana !== undefined
        ) {
          return 'universe-select';
        } else {
          return 'hidden';
        }
      },
      create: true,
      createOnBlur: true,
      options: [],
      optionsMethod: 'getAutoconfigGrafanaDashboards',
      optionsMethodParams: function () {
        const defaultGrafana = getDefaultGrafana();

        if (
          AutoForm.getFieldValue(
            this.name.replace('dashboardName', 'grafana'),
          ) ||
          defaultGrafana !==
            undefined /*&& AutoForm.getFieldValue(this.name.replace('dashboardName', 'profile'))*/
        ) {
          return {
            grafanaLabel:
              AutoForm.getFieldValue(
                this.name.replace('dashboardName', 'grafana'),
              ) || defaultGrafana,
            profile:
              Session.get(
                'profileName',
              ) /*profile: AutoForm.getFieldValue(this.name.replace('dashboardName', 'profile'))*/,
          };
        }
      },
    },
  },
  dashboardUid: {
    type: String,
    autoform: {
      type: 'hidden',
      value: function () {
        const defaultGrafana = getDefaultGrafana();

        if (
          (AutoForm.getFieldValue(
            this.name.replace('dashboardUid', 'grafana'),
          ) ||
            defaultGrafana !== undefined) &&
          AutoForm.getFieldValue(
            this.name.replace('dashboardUid', 'dashboardName'),
          )
        ) {
          return getDashboardUid(
            AutoForm.getFieldValue(
              this.name.replace('dashboardUid', 'grafana'),
            ) || defaultGrafana,
            AutoForm.getFieldValue(
              this.name.replace('dashboardUid', 'dashboardName'),
            ),
          );
        }
      },
    },
  },
  panel: {
    type: Object,
    label: 'Metric',
    autoform: {
      type: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace('panel', 'dashboardName'),
          ) !== undefined
        ) {
          return '';
        } else {
          return 'hidden';
        }
      },
    },
  },
  'panel.title': {
    type: String,
    autoform: {
      type: function () {
        if (
          AutoForm.getFieldValue(
            this.name.replace('panel.title', 'dashboardName'),
          ) !== undefined
        ) {
          return 'universe-select';
        } else {
          return 'hidden';
        }
      },
      create: true,
      createOnBlur: true,
      options: [],
      optionsMethod: 'getTemplateDashboardPanels',
      optionsMethodParams: function () {
        if (
          AutoForm.getFieldValue(this.name.replace('panel.title', 'grafana')) &&
          AutoForm.getFieldValue(
            this.name.replace('panel.title', 'dashboardUid'),
          )
        )
          return {
            grafanaLabel: AutoForm.getFieldValue(
              this.name.replace('panel.title', 'grafana'),
            ),
            dashboardUid: AutoForm.getFieldValue(
              this.name.replace('panel.title', 'dashboardUid'),
            ),
          };
      },
    },
  },
  'panel.id': {
    type: Number,
    autoform: {
      type: 'hidden',
      value: function () {
        if (
          AutoForm.getFieldValue(this.name.replace('panel.id', 'panel.title'))
        )
          return parseInt(
            AutoForm.getFieldValue(
              this.name.replace('panel.id', 'panel.title'),
            ).replace(/^([0-9]+)-.*/, '$1'),
          );
      },
    },
  },
  'panel.annotation': {
    type: String,
    optional: true,
    autoform: {
      type: function () {
        if (AutoForm.getFieldValue('panel.title') !== undefined) {
          return '';
        } else {
          return 'hidden';
        }
      },
    },
  },
  index: {
    type: Number,
    optional: true,
    autoform: {
      type: 'hidden',
    },
  },

  reportPanelId: {
    type: String,
    autoform: {
      type: 'hidden',
      // value: function () {
      //     if (AutoForm.getFieldValue(this.name.replace('reportPanelId', 'tag')) && AutoForm.getFieldValue(this.name.replace('reportPanelId', 'grafana')) && AutoForm.getFieldValue(this.name.replace('reportPanelId', 'dashboardUid')) && AutoForm.getFieldValue(this.name.replace('reportPanelId', 'panel.id'))) {
      //         return AutoForm.getFieldValue(this.name.replace('reportPanelId', 'tag')) + '-' + AutoForm.getFieldValue(this.name.replace('reportPanelId', 'grafana')) + '-' + AutoForm.getFieldValue(this.name.replace('reportPanelId', 'dashboardUid')) + '-' + AutoForm.getFieldValue(this.name.replace('reportPanelId', 'panel.id'));
      //     }
      // },
    },
    optional: true,
  },
});

const getDashboardUid = (grafanaLabel, dashboardName) => {
  const grafanaDashboard = GrafanaDashboards.findOne({
    $and: [
      { grafana: grafanaLabel },
      { name: dashboardName },
      { tags: { $in: ['perfana-template', 'Perfana-template'] } },
    ],
  });

  if (grafanaDashboard) {
    return grafanaDashboard.uid;
  }
};

const getDefaultGrafana = () => {
  const grafanas = Grafanas.find({}).fetch();

  if (grafanas.length === 1) {
    return grafanas[0].label;
  } else {
    return undefined;
  }
};

GenericReportPanels.attachSchema(GenericReportPanelsSchema);

if (Meteor.isClient) {
  window.GenericReportPanels = GenericReportPanels;
  window.GenericReportPanelsSchema = GenericReportPanelsSchema;

  Meteor.subscribe('grafanas');
}
