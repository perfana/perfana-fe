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

import { Logger } from 'meteor/ostrio:logger';
import { LoggerConsole } from 'meteor/perfana:loggerconsole';

export const log = new Logger();

new LoggerConsole(log, {
  format(opts) {
    return (
      (Meteor.isServer ? '[SERVER]' : '[CLIENT]') +
      ' [' +
      opts.level +
      '] - ' +
      opts.message
    );
  },
}).enable({
  filter:
    process.env.LOG_LEVEL === 'DEBUG'
      ? ['ERROR', 'FATAL', 'WARN', 'INFO', 'DEBUG']
      : [
        'ERROR',
        'FATAL',
        'WARN',
        'INFO',
      ] /* Filters: 'ERROR', 'FATAL', 'WARN', 'DEBUG', 'INFO', 'TRACE', '*' */,
  client: true, // Set to `false` to avoid log transfer from Client to Server
  server: true, // Set to `false` to disallow execution on Server
});
