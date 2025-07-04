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
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import { DynatraceDql } from '../../../collections/dynatraceDql';
import { ReactiveVar } from 'meteor/reactive-var';

import './applicationDynatrace.html';

import { Applications } from '../../../collections/applications';
import swal from 'sweetalert';

Template.dynatraceDql.onCreated(function dynatraceDqlOnCreated() {
  this.state = new ReactiveDict();

  Meteor.subscribe('applications');
  Meteor.subscribe('dynatraceDql');

  this.userHasPermissionForApplication = new ReactiveVar(false);
  this.numberOfDynatraceDqlQueries = new ReactiveVar();
  this.showFilter = new ReactiveVar(false);

  this.autorun(() => {
    Template.instance().showFilter.set(
      Template.instance().numberOfDynatraceDqlQueries.get() > 5,
    );

    /* update subscription based on filters*/
    const query = { $and: [] };

    if (Session.get('application'))
      query.$and.push({ application: Session.get('application') });
    if (Session.get('testEnvironment'))
      query.$and.push({ testEnvironment: Session.get('testEnvironment') });

    const application = Applications.findOne({
      name: Session.get('application'),
    });

    if (application) {
      Meteor.call(
        'userHasPermissionForApplication',
        application.name,
        (err, result) => {
          if (err) {
            console.log(JSON.stringify(err));
          } else {
            if (result.error) {
              console.log(JSON.stringify(result.error));
            } else {
              this.userHasPermissionForApplication.set(result.data);
            }
          }
        },
      );
    }
  });
});

Template.dynatraceDql.helpers({
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
  application() {
    return Session.get('application');
  },
  testEnvironment() {
    return Session.get('testEnvironment');
  },

  dynatraceDqlQueries() {
    const application = Applications.findOne({
      name: FlowRouter.current().queryParams.systemUnderTest,
    });

    if (application) {
      const environmentQueries = DynatraceDql.find(
        {
          $and: [
            { application: FlowRouter.current().queryParams.systemUnderTest },
            {
              testEnvironment: FlowRouter.current().queryParams.testEnvironment,
            },
          ],
        },
        { sort: { dashboardLabel: 1 } },
      ).fetch();

      Template.instance().numberOfDynatraceDqlQueries.set(
        environmentQueries.length,
      );

      return environmentQueries;
    } else {
      return [];
    }
  },
  fields() {
    return [
      // { key: 'dashboardLabel', label: 'Dashboard' },
      { key: 'panelTitle', label: 'Title' },
      { key: 'dqlQuery', label: 'DQL Query' },
      { key: 'matchMetricPattern', label: 'Match metric pattern' },
      {
        key: 'omitGroupByVariableFromMetricName',
        label: 'Omit group by variable from metric name',
        fn: (value, object) => {
          if (value && Array.isArray(value) && value.length > 0) {
            return new Spacebars.SafeString(value.join(', '));
          }
          return '';
        },
      },
      {
        key: '_id',
        label: '',
        isVisible: Template.instance().userHasPermissionForApplication,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="edit-dynatrace-dql" class="fa fa-pencil reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Edit DQL query"></i>`,
          );
        },
      },
      {
        key: '_id',
        label: '',
        isVisible: Template.instance().userHasPermissionForApplication,
        fn: () => {
          return new Spacebars.SafeString(
            `<i id="delete-dynatrace-dql" class="fa fa-trash reactive-table-icon" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Delete DQL query"></i>`,
          );
        },
      },
    ];
  },
  settings() {
    return {
      rowsPerPage: 20,
      showFilter: Template.instance().showFilter.get(),
      showNavigation: 'auto',
      showNavigationRowsPerPage: 'false',
      noDataTmpl: Template.noDynatraceDqlQueries,
    };
  },
  hasDynatraceDqlQueries() {
    return (
      Template.instance().numberOfDynatraceDqlQueries &&
      Template.instance().numberOfDynatraceDqlQueries.get() > 0
    );
  },
});

Template.dynatraceDql.events({
  'click .back'() {
    history.back();
  },
  'click .reactive-table tbody tr'(event, template) {
    const afAtts = {};
    switch (event.target.id) {
      case 'delete-dynatrace-dql':
        swal({
          title: 'Delete DQL query',
          text: 'This will permanently delete this Dynatrace DQL query!',
          icon: 'warning',
          buttons: ['Cancel', 'OK'],
          dangerMode: true,
        }).then((willDelete) => {
          if (willDelete) {
            Meteor.call('dynatraceDql.remove', this._id);
            swal.close();
          } else {
            swal.close();
          }
        });
        break;

      case 'edit-dynatrace-dql':
        afAtts['type'] = 'method-update';
        afAtts['meteormethod'] = 'dynatraceDql.update';
        afAtts['id'] = 'editDynatraceDql';
        afAtts['schema'] = 'DynatraceDqlSchema';
        afAtts['collection'] = 'DynatraceDql';
        afAtts['buttonContent'] = 'Update';
        afAtts['backdrop'] = 'static';

        AutoForm.addHooks(
          afAtts['id'],
          {
            onSuccess: function () {
              Modal.hide('afModalWindow');
            },
          },
          false,
        );

        Modal.show('afModalWindow', {
          title: 'Update DQL query',
          dialogClass: '',
          afAtts: afAtts,
          operation: 'update',
          collection: 'DynatraceDql',
          doc: this,
          backdrop: afAtts['backdrop'],
        });
        break;
    }
  },
});

Template.noDynatraceDqlQueries.onCreated(
  function noDynatraceDqlQueriesOnCreated() {
    this.userHasPermissionForApplication = new ReactiveVar(false);

    Meteor.subscribe('applications');

    this.autorun(() => {
      const application = Applications.findOne({
        name: Session.get('application'),
      });

      if (application) {
        Meteor.call(
          'userHasPermissionForApplication',
          application.name,
          (err, result) => {
            if (err) {
              console.log(JSON.stringify(err));
            } else {
              if (result.error) {
                console.log(JSON.stringify(result.error));
              } else {
                this.userHasPermissionForApplication.set(result.data);
              }
            }
          },
        );
      }
    });
  },
);

Template.noDynatraceDqlQueries.helpers({
  userHasPermissionForApplication() {
    return (
      Template.instance().userHasPermissionForApplication &&
      Template.instance().userHasPermissionForApplication.get()
    );
  },
});

Template.noDynatraceDqlQueries.events({
  'click .add-dynatrace-dql'() {
    /* show add DQL query afModal*/
    const afAtts = {};

    afAtts['id'] = 'addDynatraceDql';
    afAtts['type'] = 'method';
    afAtts['meteormethod'] = 'dynatraceDql.insert';
    afAtts['schema'] = 'DynatraceDqlSchema';
    afAtts['collection'] = 'DynatraceDql';
    afAtts['buttonContent'] = 'Add';
    afAtts['backdrop'] = 'static';

    AutoForm.addHooks(
      afAtts['id'],
      {
        onSuccess: function () {
          Modal.hide('afModalWindow');
        },
      },
      false,
    );

    Modal.show('afModalWindow', {
      title: 'Add Dynatrace DQL query',
      dialogClass: '',
      afAtts: afAtts,
      operation: afAtts['type'],
      collection: 'DynatraceDql',
      backdrop: afAtts['backdrop'],
    });
  },
});
