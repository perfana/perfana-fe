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

// noinspection RegExpDuplicateCharacterInClass

import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ApiKeys } from '/imports/collections/apiKeys';
import { base64decode, base64encode } from 'nodejs-base64';
import { log } from '/both/logger';

const saltRounds = 10;

const bound = Meteor.bindEnvironment((callback) => {
  callback();
});

export const compareApiKey = (token, callback) => {
  try {
    let description;
    try {
      description = base64decode(token).split('#')[0];
    } catch (decodeError) {
      const err = new Error('Invalid API key format');
      err.stack = decodeError.stack;
      callback(err, null);
      return;
    }

    const apiKeyDoc = ApiKeys.findOne({
      description: description,
    });

    if (apiKeyDoc) {
      bcrypt.compare(token, apiKeyDoc.apiKey, function (err, result) {
        bound(() => {
          if (err) {
            log.error('API key comparison error', {
              error: err,
              stack: err.stack,
            });
            callback(err, null);
          } else {
            if (
              result === true &&
              new Date(apiKeyDoc.validUntil) > new Date()
            ) {
              callback(null, true);
            } else {
              const err = new Error(
                result === false ? 'Invalid API key' : 'Expired token',
              );
              Error.captureStackTrace(err);
              log.error('API key validation failed', {
                error: err.message,
                stack: err.stack,
                isExpired:
                  result === true &&
                  new Date(apiKeyDoc.validUntil) <= new Date(),
              });
              callback(err, null);
            }
          }
        });
      });
    } else {
      const err = new Error('API key not found');
      Error.captureStackTrace(err);
      log.error('API key lookup failed', {
        error: err.message,
        stack: err.stack,
      });
      callback(err, null);
    }
  } catch (err) {
    Error.captureStackTrace(err);
    log.error('Unexpected error in compareApiKey', {
      error: err.message,
      stack: err.stack,
    });
    callback(err, null);
  }
};

export const createApiKey = (description, ttl, callback) => {
  try {
    const uuid = uuidv4();

    const token = base64encode(`${description}#${uuid}`);

    const ttlUnitPattern = new RegExp('[0-9]+([{d,w,M,y}])', 'i');

    const ttlNumberPattern = new RegExp('([0-9]+)[{d,w,M,y}]', 'i');

    const ttlUnit = ttl.match(ttlUnitPattern)[1];
    const ttlNumber = ttl.match(ttlNumberPattern)[1];
    let validUntil;
    let date;

    switch (ttlUnit) {
      case 'd':
        date = new Date();
        validUntil = date.setDate(date.getDate() + parseInt(ttlNumber));
        break;
      case 'w':
        date = new Date();
        validUntil = date.setDate(date.getDate() + parseInt(ttlNumber) * 7);
        break;
      case 'M':
        date = new Date();
        validUntil = date.setMonth(date.getMonth() + parseInt(ttlNumber));
        break;
      case 'y':
        date = new Date();
        validUntil = date.setFullYear(date.getFullYear() + parseInt(ttlNumber));
        break;
    }

    bcrypt.genSalt(saltRounds, function (err, salt) {
      bound(() => {
        if (err) {
          log.error(err); // an error occurred
        } else {
          bcrypt.hash(token, salt, function (err, hash) {
            bound(() => {
              if (err) {
                log.error(err); // an error occurred
              } else {
                ApiKeys.insert(
                  {
                    apiKey: hash,
                    description: description,
                    validUntil: validUntil,
                  },
                  (error) => {
                    if (error) {
                      log.error(error);
                      throw new Error(error);
                    } else {
                      callback(null, token);
                    }
                  },
                );
              }
            });
          });
        }
      });
    });
  } catch (err) {
    callback(err, null);
  }
};
