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

/* eslint-disable no-case-declarations */
// noinspection HtmlUnknownAttribute,JSJQueryEfficiency

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import { formatDate, renderGrafanaUrl } from '../../helpers/utils';
import { log } from '/both/logger';

import './grafana.html';
import './grafana.less';

import { Grafanas } from '../../collections/grafanas';
import { GrafanaDashboards } from '../../collections/grafanaDashboards';
import { ApplicationDashboards } from '../../collections/applicationDashboards';
import swal from 'sweetalert';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import _ from 'lodash';

Template.grafana.onCreated(function () {
  this.state = new ReactiveDict();
  Meteor.subscribe('grafanas');
  this.selectedDashboards = new ReactiveArray();
  this.activeHref = new ReactiveVar(`#0`);
});

Template.grafana.helpers({
  tabActive(href) {
    return Template.instance().activeHref.get() === `#${href}`;
  },
  instanceHelper(result) {
    if (result === true) {
      return 'Yes';
    } else {
      return 'No';
    }
  },
  adminUser() {
    const user = Meteor.user();
    return (
      user &&
      (Roles.userHasRole(user._id, 'admin') ||
        Roles.userHasRole(user._id, 'super-admin'))
    );
  },
  grafanas() {
    return Grafanas.find({}).fetch();
  },
  grafanaDashboardFilter() {
    // return  Template.instance().requestNameFilter.get()
    return Session.get('grafanaDashboardFilter');
  },
  fields() {
    return [
      // {key: 'grafana', label: 'Grafana instance'},
      { key: 'name', label: 'Dashboard name', cellClass: 'col-md-4' },
      {
        key: 'updated',
        label: 'Last time synced',
        cellClass: 'col-md-2',
        fn: (value) => {
          const sortValue = new Date(value).getTime(); // parse date format here and get value to sort by
          return new Spacebars.SafeString(
            '<span sort=' + sortValue + '>' + formatDate(value) + '</span>',
          );
        },
      },
      // {key: '_id', label: '',
      //     hidden: () => {
      //         let user = Meteor.user();
      //         return !user;
      //     },
      //     fn:  (value, object, key) =>  {
      //         return new Spacebars.SafeString(`<i id="sync-grafana-dashboard" class="fa fa-refresh reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Sync dashboard"></i>`);
      //     }
      // },
      // { key: '_id', label: '',
      //     isVisible: Template.instance().showIcons,
      //     fn: (value, object, key) =>  {
      //         return new Spacebars.SafeString(`<i id="edit-grafana-dashboard" class="fa fa-pencil reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Edit dashboard"></i>`);
      //     }
      // },
      {
        key: 'usedBySUT',
        label: 'Used by SUT',
        cellClass: 'col-md-3',
        fn: (value) => {
          return new Spacebars.SafeString(createUsedBySUTSpan(value));
        },
      },
      {
        key: 'tags',
        label: '',
        sortOrder: 0,
        sortDirection: 'descending',
        fn: (value) => {
          return new Spacebars.SafeString(createDashboardTagsSpan(value));
        },
      },
      // { key: '_id',
      //     hidden: () => {
      //         let user = Meteor.user();
      //         return !user;
      //     },

      {
        key: '_id',
        label: '',
        // isVisible: Template.instance().showIcons,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="grafana-dashboard-link" class="fa fa-external-link reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Open in Grafana"></i>`,
          );
        },
      },
      {
        key: '_id',
        label: () => {
          return new Spacebars.SafeString(
            `<i id="delete-selected-dashboards" class="fa fa-trash reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete selected dashboards"></i>`,
          );
        },
        sortable: false,
        // isVisible: Template.instance().showIcons,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-grafana-dashboard" class="fa fa-trash reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete dashboard"></i>`,
          );
        },
      },
      {
        key: '_id',
        sortable: false,
        label: () => {
          return new Spacebars.SafeString(
            `<input id="select-all-dashboards" class="reactive-table-icon" type='checkbox' />`,
          );
        },
        fn: (value, object) => {
          return new Spacebars.SafeString(
            `<input  dashboard-id=${object._id} id="select-dashboard" class="reactive-table-icon" type='checkbox' />`,
          );
        },
        cellClass: 'select-dashboard',
      },
      // { key: '_id', sortable: false,
      //     label: () =>  {
      //         return new Spacebars.SafeString(`<i id="delete-selected-dashboards" class="fa fa-trash reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete selected dashboards"></i>`);
      //     },
      //     fn: (value, object, key) =>  {
      //         return new Spacebars.SafeString('<div></div>');
      //     },
      //     cellClass: 'select-dashboard'
      // },
    ];
  },
  settings() {
    return {
      rowsPerPage: 20,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      filters: ['usedBySUTFilter', 'dashboardNameFilter'],
    };
  },
  serverUrlConfigured(grafana) {
    return grafana.serverUrl;
  },
});

Template.grafana.events({
  'keyup #grafana-dashboard-filter'(event) {
    // template.requestNameFilter.set(event.target.value)
    Session.set('grafanaDashboardFilter', event.target.value);
  },
  'click .nav-tabs.grafana-configuration  a'(event, template) {
    /* reset selected dashboards */
    template.selectedDashboards.clear();
    event.preventDefault();
    template.activeHref.set(event.currentTarget.getAttribute('href'));
  },
  'click .clear-filter'(event) {
    event.preventDefault();
    Session.set('grafanaDashboardFilter', undefined);
  },
  'click #delete-selected-dashboards'(event, template) {
    swal({
      title: 'Delete selected dashboards',
      text: 'This will also delete the dashboards in Grafana and all service level indicators based on this dashboards! Are you sure?',
      icon: 'warning',
      buttons: true,
      cancel: true,
      confirm: 'Confirm',
    }).then((willDelete) => {
      //bound to the current `this`
      if (willDelete) {
        _.each(template.selectedDashboards, (_id) => {
          Meteor.call(
            'deleteGrafanaDashboard',
            _id,
            Session.get('usedBySUT'),
            (err, grafanaDashboard) => {
              if (grafanaDashboard.error) {
                log.error(JSON.stringify(grafanaDashboard.error));
              }
            },
          );
        });
      } else {
        swal.close();
      }
    });
  },
  'click .reactive-table tbody tr'(event, template) {
    // event.preventDefault();

    switch (event.target.id) {
      case 'delete-grafana-dashboard':
        swal({
          title: 'Delete dashboard',
          text: 'This will also delete the dashboard in Grafana and all service level indicators based on this dashboards! Are you sure?',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          //bound to the current `this`
          if (willDelete) {
            swal.close();

            Meteor.call(
              'deleteGrafanaDashboard',
              this._id,
              Session.get('usedBySUT'),
              (err, grafanaDashboard) => {
                if (grafanaDashboard.error) {
                  log.error(JSON.stringify(grafanaDashboard.error));
                }
              },
            );
          } else {
            swal.close();
          }
        });

        break;

      case 'select-dashboard':
        if (event.target.checked) {
          template.selectedDashboards.push(this._id);
        } else {
          const index = template.selectedDashboards.indexOf(this._id);
          template.selectedDashboards.splice(index, 1);
        }

        break;

      case 'grafana-dashboard-link':
        const grafana = Grafanas.findOne({ label: this.grafana });

        if (grafana) {
          const dashboard = ApplicationDashboards.findOne({
            $and: [{ grafana: this.grafana }, { dashboardUid: this.uid }],
          });

          if (dashboard) {
            const testRun = {};

            testRun['start'] = 'now-15m';
            testRun['end'] = 'now';
            testRun['application'] = dashboard.application;
            testRun['testEnvironment'] = dashboard.testEnvironment;

            const grafanaUrl = renderGrafanaUrl(
              testRun,
              dashboard,
              grafana,
              this,
              false,
            );
            window.open(grafanaUrl, '_blank');
            break;
          } else {
            const testRun = {};

            testRun['start'] = 'now-15m';
            testRun['end'] = 'now';

            const grafanaUrl = renderGrafanaUrl(
              testRun,
              {},
              grafana,
              this,
              false,
            );
            window.open(grafanaUrl, '_blank');
            break;
          }
        }
    }
  },
  'click .refresh'(event, template) {},
  'click #select-all-dashboards'(event, template) {
    if (event.target.checked) {
      $('input#select-dashboard[type="checkbox"]')
        .not(event.target)
        .prop('checked', event.target.checked);
      // $('input#select-dashboard[type="checkbox"]').attr('Checked','Checked');
      // $('input#select-dashboard[type="checkbox"]').attr('Checked','Checked');

      $('input#select-dashboard[type="checkbox"]').each(function () {
        if ($(this).is(':checked'))
          template.selectedDashboards.push($(this).attr('dashboard-id'));
      });
    } else {
      template.selectedDashboards.clear();

      $('input#select-dashboard[type="checkbox"]')
        .not(event.target)
        .prop('checked', event.target.checked);
    }
  },
});

Template.linkedDashboards.onCreated(function linkedDashboardsOnCreated() {
  this.activeHref = new ReactiveVar(`#templates`);
  this.grafanaDashboards = new ReactiveVar([]);
  this.hasDashboardsUsedBySut = new ReactiveVar(false);
  this.query = new ReactiveVar();

  let query = {
    $and: [
      { tags: { $elemMatch: { $regex: 'perfana-template', $options: 'i' } } },
    ],
  };

  this.query.set(query);

  Meteor.call(
    'getGrafanaDashboardDashboardsUsedBySUT',
    this.data.grafanaLabel,
    (err, result) => {
      if (result.error) {
        log.error(JSON.stringify(result.error));
      } else {
        this.hasDashboardsUsedBySut.set(result.data);
      }
    },
  );

  this.autorun(() => {
    FlowRouter.watchPathChange();

    this.grafanaDashboards.set([]);

    const usedBySUT = Session.get('usedBySUT');
    if (usedBySUT !== undefined) {
      query = {
        $and: [
          {
            usedBySUT: {
              $elemMatch: { $regex: '^' + usedBySUT + '$', $options: 'i' },
            },
          },
        ],
      };

      this.query.set(query);
    }

    const updatedQuery = this.query.get();

    updatedQuery.$and.push({ grafana: this.data.grafanaLabel });

    Meteor.subscribe('grafanaDashboards', this.query.get());

    const grafanaDashboards = GrafanaDashboards.find(updatedQuery);

    if (grafanaDashboards) {
      this.grafanaDashboards.set(grafanaDashboards);
    }
  });
});

Template.linkedDashboards.helpers({
  hasDashboardsUsedBySut() {
    return Template.instance().hasDashboardsUsedBySut.get() === true;
  },
  tabActive(href) {
    return Template.instance().activeHref.get() === href;
  },
  dashboards() {
    if (
      Template.instance().grafanaDashboards &&
      Template.instance().grafanaDashboards.get()
    ) {
      return Template.instance().grafanaDashboards.get();
    }
  },
  fields() {
    return [
      // {key: 'grafana', label: 'Grafana instance'},
      { key: 'name', label: 'Dashboard name', cellClass: 'col-md-9' },
      {
        key: 'updated',
        label: 'Last time synced',
        cellClass: 'col-md-2',
        fn: (value) => {
          const sortValue = new Date(value).getTime(); // parse date format here and get value to sort by
          return new Spacebars.SafeString(
            '<span sort=' + sortValue + '>' + formatDate(value) + '</span>',
          );
        },
      },
      // {
      //     key: 'tags', label: '',  sortOrder: 0, sortDirection: 'descending', fn: (value, object, key) =>  {
      //         return new Spacebars.SafeString(createDashboardTagsSpan(value));
      //     },
      // },

      {
        key: '_id',
        label: '',
        // isVisible: Template.instance().showIcons,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="grafana-dashboard-link" class="fa fa-external-link reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Open in Grafana"></i>`,
          );
        },
      },
      {
        key: '_id',
        label: () => {
          return new Spacebars.SafeString(
            `<i id="delete-selected-dashboards" class="fa fa-trash reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete selected dashboards"></i>`,
          );
        },
        sortable: false,
        // isVisible: Template.instance().showIcons,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-grafana-dashboard" class="fa fa-trash reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete dashboard"></i>`,
          );
        },
      },
      {
        key: '_id',
        sortable: false,
        label: () => {
          return new Spacebars.SafeString(
            `<input id="select-all-dashboards" class="reactive-table-icon" type='checkbox' />`,
          );
        },
        fn: (value, object) => {
          return new Spacebars.SafeString(
            `<input  dashboard-id=${object._id} id="select-dashboard" class="reactive-table-icon" type='checkbox' />`,
          );
        },
        cellClass: 'select-dashboard',
      },
    ];
  },
  settings() {
    return {
      rowsPerPage: 20,
      showFilter: false,
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      filters: ['dashboardNameFilter'],
      noDataTmpl: Template.noLinkedDashboards,
    };
  },
  serverUrlConfigured(grafana) {
    return grafana.serverUrl;
  },
});

Template.linkedDashboards.events({
  'click .nav-tabs.linked-dashboards  a'(event, template) {
    event.preventDefault();
    let query;
    template.activeHref.set(event.currentTarget.getAttribute('href'));
    switch (event.currentTarget.getAttribute('href')) {
      case '#templates':
        query = {
          $and: [
            {
              tags: {
                $elemMatch: { $regex: 'perfana-template', $options: 'i' },
              },
            },
          ],
        };
        Session.set('usedBySUT', undefined);
        template.query.set(query);
        break;
      case '#other':
        query = {
          $and: [
            {
              tags: {
                $not: {
                  $elemMatch: { $regex: 'perfana-template', $options: 'i' },
                },
              },
            },
            {
              $or: [
                { usedBySUT: { $exists: false } },
                { usedBySUT: { $size: 0 } },
              ],
            },
          ],
        };
        template.query.set(query);
        Session.set('usedBySUT', undefined);
        break;
      default:
    }
  },
});

const createDashboardTagsSpan = (tags) => {
  if (
    tags
      .map((tag) => {
        return tag.toLowerCase();
      })
      .indexOf('perfana-template') !== -1
  ) {
    return `<span class=" break-word label label-default">perfana-template</span>`;
  } else {
    return '';
  }
};

const createUsedBySUTSpan = (usedBySUT) => {
  let HTML = '';
  usedBySUT.forEach((sut) => {
    HTML += `<span class=" break-word label label-default">${sut}</span>`;
  });

  return HTML;
};
