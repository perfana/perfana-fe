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

/* eslint-disable no-unused-vars */
import crypto from 'crypto';
import { Autoupdate } from 'meteor/autoupdate';
import { WebAppInternals } from 'meteor/webapp';

WebAppInternals.setInlineScriptsAllowed(false);
WebAppInternals.setInlineScriptsAllowed(false);

export function helmetOptions() {
  const domain = Meteor.absoluteUrl()
    .replace(/http(s)*:\/\//, '')
    .replace(/\/$/, '');
  const s = Meteor.absoluteUrl().match(/(?!=http)s(?=:\/\/)/) ? 's' : '';
  const runtimeConfig = Object.assign(__meteor_runtime_config__, Autoupdate, {
    accountsConfigCalled: true,
  });
  // eslint-disable-next-line no-unused-vars
  // noinspection JSUnusedLocalSymbols
  const runtimeConfigHash = crypto
    .createHash('sha256')
    .update(
      `__meteor_runtime_config__ = JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(runtimeConfig))}"))`,
    )
    .digest('base64');

  const scriptSrc = ["'self'", `http${s}://${domain}`];

  if (Meteor.settings.helmet.scriptSrc) {
    scriptSrc.concat(Meteor.settings.helmet.scriptSrc);
  }

  const styleSrc = ["'self'", "'unsafe-inline'", `http${s}://${domain}`];

  if (Meteor.settings.helmet.styleSrc) {
    styleSrc.concat(Meteor.settings.helmet.styleSrc);
  }

  return {
    contentSecurityPolicy: {
      directives: {
        connectSrc: [
          '*',
          "'self'",
          `http${s}://${domain}`,
          `ws${s}://${domain}`,
        ],
        defaultSrc: ["'self'"],
        frameAncestors: ["'self'"],
        frameSrc: Meteor.settings.helmet.frameSrc,
        imgSrc: Meteor.settings.helmet.frameSrc.concat("'self'"),
        manifestSrc: ["'self'"],
        mediaSrc: ["'self'"],
        scriptSrc: scriptSrc,
        styleSrc: styleSrc,
      },
    },
  };
}
