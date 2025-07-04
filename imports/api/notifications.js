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

import { Notifications } from '/imports/collections/notifications';
import { log } from '/both/logger';

if (Meteor.isServer) {
  Meteor.publish('notifications', (query, component) => {
    check(query, Match.OneOf(undefined, null, Object));
    check(component, Match.OneOf(undefined, null, String));
    log.debug(
      '######### notifications subscription query from component: ' +
        component +
        ': ' +
        JSON.stringify(query),
    );

    return Notifications.find(query, { sort: { createdAt: -1 } });
  });
}

Meteor.methods({
  insertNotification: (notification) => {
    check(notification, Object);
    Notifications.insert(notification);
    return true;
  },
  notificationUpdateViewedBy: (notification, user) => {
    check(notification, Object);
    check(user, Object);

    Notifications.update(
      {
        _id: notification._id,
      },
      {
        $push: {
          viewedBy: user._id,
        },
      },
    );
    return true;
  },
});
