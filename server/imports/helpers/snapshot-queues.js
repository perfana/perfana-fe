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

import { default as mongodb } from 'mongodb';
import mongoDbQueue from 'mongodb-queue';

let snapshotWithChecksQueue;
let snapshotQueue;

export const getQueues = () => {
  return new Promise((resolve, reject) => {
    if (snapshotWithChecksQueue && snapshotQueue) {
      resolve({
        snapshotQueue: snapshotQueue,
        snapshotWithChecksQueue: snapshotWithChecksQueue,
      });
    } else {
      const dbPattern = new RegExp('mongodb:\/\/.*\/([^\?]+)\?.*');
      const perfanDb = process.env.MONGO_URL.match(dbPattern)[1];

      const options = {
        useUnifiedTopology: true,
        useNewUrlParser: true,
        // reconnectInterval: 10000, // wait for 10 seconds before retry
        // reconnectTries: Number.MAX_VALUE, // retry forever
      };

      const url = process.env.MONGO_URL;

      const client = new mongodb.MongoClient(url, options);

      // noinspection JSIgnoredPromiseFromCall
      client.connect((err) => {
        if (err) reject(err);

        const db = client.db(perfanDb);

        snapshotWithChecksQueue = mongoDbQueue(db, 'snapshotWithChecksQueue', {
          visibility: 3600,
        });
        snapshotQueue = mongoDbQueue(db, 'snapshotQueue', { visibility: 3600 });

        resolve({
          snapshotQueue: snapshotQueue,
          snapshotWithChecksQueue: snapshotWithChecksQueue,
        });
      });
    }
  });
};
