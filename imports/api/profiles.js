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
import { check } from 'meteor/check';

import { Profiles } from '../collections/profiles';
import { GenericChecks } from '../collections/genericChecks';
import { GenericReportPanels } from '../collections/genericReportPanels';
import { GenericDeepLinks } from '../collections/genericDeeplinks';
import { AutoConfigGrafanaDashboards } from '../collections/autoConfigGrafanaDashboards';

if (Meteor.isServer) {
  Meteor.publish('profiles', () => Profiles.find());
}

// noinspection JSUnusedGlobalSymbols
Meteor.methods({
  // duplicateProfile: (profile) => {
  //
  //   check(profile, Object);
  //   // check(duplicateProfileName, String);
  //
  //   if (!(Roles.userHasRole(Meteor.userId(), 'admin') || Roles.userHasRole(Meteor.userId(), 'super-admin')) ) {
  //     throw new Meteor.Error('duplicate.profile.unauthorized',
  //         'The user is not authorized to duplicate a profile');
  //   }
  //
  //   const wrap = Meteor.makeAsync(duplicateProfileFn);
  //   return wrap(profile, profile.name);
  //
  // },
  insertProfile: (profile) => {
    check(profile, Object);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'insert.profile.unauthorized',
        'The user is not authorized to create a profile',
      );
    }

    const wrap = Meteor.makeAsync(insertProfileFn);
    return wrap(profile);
  },
  updateProfile: (profile, profileId) => {
    check(profile, Object);
    check(profileId, String);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'update.profile.unauthorized',
        'The user is not authorized to update a profile',
      );
    }

    const wrap = Meteor.makeAsync(updateProfileFn);
    return wrap(profile, profileId);
  },
  getProfiles: (profileReadOnly) => {
    check(profileReadOnly, Boolean);
    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'update.profile.unauthorized',
        'The user is not authorized to update a profile',
      );
    }

    if (profileReadOnly.params && profileReadOnly.params === true) {
      return [];
    } else {
      const profiles = Profiles.find({}).fetch();

      return profiles.map((v) => ({
        label: v.name,
        value: v.name,
      }));
    }
  },
  deleteProfile: (profile) => {
    check(profile, Object);

    if (
      !(
        Roles.userHasRole(Meteor.userId(), 'admin') ||
        Roles.userHasRole(Meteor.userId(), 'super-admin')
      )
    ) {
      throw new Meteor.Error(
        'delete.profile.unauthorized',
        'The user is not authorized to delete a profile',
      );
    }

    /* cascade delete */

    const autoConfigGrafanaDashboards = AutoConfigGrafanaDashboards.find({
      profile: profile.name,
    });

    autoConfigGrafanaDashboards.forEach((autoConfigGrafanaDashboard) => {
      GenericChecks.remove({
        $and: [
          { profile: autoConfigGrafanaDashboard.profile },
          { dashboardUid: autoConfigGrafanaDashboard.dashboardUid },
        ],
      });

      GenericReportPanels.remove({
        $and: [
          { profile: autoConfigGrafanaDashboard.profile },
          { dashboardUid: autoConfigGrafanaDashboard.dashboardUid },
        ],
      });
    });

    AutoConfigGrafanaDashboards.remove({
      profile: profile.name,
    });

    GenericDeepLinks.remove({
      profile: profile.name,
    });

    Profiles.remove({
      _id: profile._id,
    });
  },
});

const insertProfileFn = (profile, callback) => {
  Profiles.insert(profile, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

// const duplicateProfileFn = (profile, duplicateProfileName, callback) => {
//
//   let duplicateProfile = _.cloneDeep(profile);
//   delete duplicateProfile._id;
//   duplicateProfile.name = duplicateProfileName;
//   duplicateProfile.readOnly = false;
//   duplicateProfile.tags = [];
//
//   Profiles.insert(duplicateProfile, (err, result) => {
//
//     if(err){
//
//       callback(err, null);
//
//     } else {
//
//
//       /* Get autoconfigurationDashboards */
//
//         let autoConfigGrafanaDashboards = AutoConfigGrafanaDashboards.find({
//             profile: profile.name
//         }).fetch();
//
//         if(autoConfigGrafanaDashboards.length > 0){
//
//           let grafana = Grafanas.findOne({
//             label: autoConfigGrafanaDashboards[0].grafana
//           });
//
//           const folderUid = duplicateProfileName.toLowerCase().replace(/ /g, "-");
//
//           /* Create folder if it does not exist */
//
//           grafanaCall(grafana, '/api/folders/' + folderUid, (err, result) => {
//
//             if(err){
//
//               let createFolder = Meteor.wrapAsync(grafanaCallPost)(grafana, '/api/folders', {
//                 title: duplicateProfileName,
//                 uid: folderUid
//               });
//
//             }
//
//             /* Duplicate grafanDashboards */
//
//             let grafanaDashboards = GrafanaDashboards.find({
//               uid: {
//                 $in: autoConfigGrafanaDashboards.map(v => v.dashboardUid)
//               }
//             }).fetch();
//
//             grafanaDashboards.forEach((grafanaDashboard) => {
//
//               let clonedGrafaDashboard = _.cloneDeep(grafanaDashboard);
//               delete clonedGrafaDashboard._id;
//               clonedGrafaDashboard.name = duplicateProfileName + ' - ' + clonedGrafaDashboard.name;
//               clonedGrafaDashboard.templateCreateDate = new Date();
//               clonedGrafaDashboard.uid = duplicateProfileName.toLowerCase().replace(/ /g, "-") + '-' + grafanaDashboard.name.toLowerCase().replace(/ /g, "-");
//               /* parse and update grafanaJson */
//
//               let grafanaJson = JSON.parse(clonedGrafaDashboard.grafanaJson);
//               grafanaJson.dashboard.title = duplicateProfileName + ' - ' + grafanaJson.dashboard.title;
//               delete grafanaJson.dashboard.id;
//               grafanaJson.dashboard.uid = duplicateProfileName.toLowerCase().replace(/ /g, "-") + '-' + grafanaDashboard.name.toLowerCase().replace(/ /g, "-");
//
//               clonedGrafaDashboard.grafanaJson = JSON.stringify(grafanaJson);
//
//               grafanaCallPost(grafana, '/api/dashboards/db', grafanaJson, (err, result) => {
//
//                   if (err){
//                       console.log(err);
//                   } else {
//
//                     let autoConfigGrafanaDashboard = _.find(autoConfigGrafanaDashboards, (v) => {
//                       return v.dashboardUid === grafanaDashboard.uid;
//                     });
//
//                     /* insert autoConfigGrafanaDashboard */
//
//                     let clonedAutoConfigGrafanaDashboard = autoConfigGrafanaDashboard;
//                     delete clonedAutoConfigGrafanaDashboard._id;
//                     clonedAutoConfigGrafanaDashboard.dashboardName = duplicateProfileName + ' - ' + clonedAutoConfigGrafanaDashboard.dashboardName;
//                     clonedAutoConfigGrafanaDashboard.profile = duplicateProfileName;
//                     clonedAutoConfigGrafanaDashboard.dashboardUid = grafanaJson.dashboard.uid;
//
//                     AutoConfigGrafanaDashboards.insert(clonedAutoConfigGrafanaDashboard, (err, result) => {
//                       if (err) {
//                         console.log(err);
//                       }
//                     });
//                   }
//
//               });
//
//             });
//
//           });
//
//         } else {
//             callback(null, result);
//         }
//     }
//
//   });
//
//
// }
const updateProfileFn = (profile, profileId, callback) => {
  const modifier = {};
  if (profile.$set) modifier.$set = profile.$set;
  if (profile.$unset) modifier.$unset = profile.$unset;

  Profiles.update(
    {
      _id: profileId,
    },
    modifier,
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    },
  );
};
