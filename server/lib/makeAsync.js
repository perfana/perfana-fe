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

import _ from 'lodash';

const Future = Npm.require('fibers/future');

/**
 * @namespace Meteor
 */
/**
 * @function
 * @name Meteor.makeAsync
 * @param {Function} fn - The function to make asynchronous.
 * @param {Object} [context] - Optional context for the function.
 * @returns {Function} The asynchronous function.
 */
Meteor.makeAsync = function (fn, context) {
  return function (/* arguments */) {
    const self = context || this;
    const newArgs = _.toArray(arguments);
    let callback;
    let i;

    for (i = newArgs.length - 1; i >= 0; --i) {
      const arg = newArgs[i];
      const type = typeof arg;
      if (type !== 'undefined') {
        if (type === 'function') {
          callback = arg;
          break;
        }
        break;
      }
    }

    const fut = new Future();
    if (!callback) {
      callback = function (error, data) {
        fut.return({ error: error, data: data });
      };
      newArgs.push(callback); // Add callback to the end instead of incrementing i
    } else {
      newArgs[i] = Meteor.bindEnvironment(callback); // Replace existing callback with bound version
    }

    const result = fn.apply(self, newArgs);
    return fut ? fut.wait() : result;
  };
};
