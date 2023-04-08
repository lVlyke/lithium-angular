import "source-map-support/register";

/* TODO 2023-04-07 - IMPORTANT TESTING NOTE!
 * Angular `TestBed` requires zone to be imported even though no tests require it.
 * However, zone.js is currently incompatible with Promises in Node v16.17.1 or greater.
 * Because of this, unit tests can currently only be run in Node versions before v16.17.1.
 * See https://github.com/angular/angular/issues/48198
*/
import "zone.js";
import "zone.js/testing";

import "./dom";
import "./angular-init";

jasmine.DEFAULT_TIMEOUT_INTERVAL = 100;