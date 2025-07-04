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
// import {getEventPoints} from "../../server/imports/helpers/influx";

Meteor.methods({
  // getTrendsPeriod: (application, testEnvironment, testType ) => {
  //
  //     check(application, String);
  //     check(testEnvironment, String);
  //     check(testType, String);
  //
  //     const getTrendsPeriod = Meteor.makeAsync(getTrendsPeriodFn);
  //
  //     return getTrendsPeriod(application, testEnvironment, testType);
  //
  // },
});

// export const getTrendsPeriodFn = (application, testEnvironment, testType, callback) => {
//
//      getEventPoints(application, testEnvironment, testType, (err, eventsJson) => {
//
//         let period;
//
//         if(err){
//             callback(err, null);
//         } else {
//
//             /* get smallest and largest date and create to and from */
//             if(eventsJson.results && eventsJson.results.length > 0){
//
//                 if(eventsJson.results[0].series && eventsJson.results[0].series.length > 0){
//
//                     let events = eventsJson.results[0].series[0].values.map((value) => { return value[0] } )
//
//                     period = '&from=' + (new Date(events[events.length -1 ]).getTime() - (60 * 60 * 1000))  + '&to=' + (new Date(events[0]).getTime() + (60 * 60 * 1000));
//
//                     callback(null,period)
//                 } else {
//                     callback(null,null)
//                 }
//             } else {
//                 callback(null,null)
//             }
//
//         }
//     })
//
// }
