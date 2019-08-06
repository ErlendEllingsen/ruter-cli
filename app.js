#!/usr/bin/env node
const flags = require("flags");
const Configstore = require('configstore');
const packageJson = require('./package.json');


/**
 * SETUP
 */
const config = new Configstore(packageJson.name, {
  predefinedRoutes: [],
  something: ''
}); // init cfg


const appArgs = process.argv.slice(2);
if (appArgs.length === 0) appArgs[0] = 'help';
const command = appArgs[0];

switch (command) {
  case 'help':
    break;
  case 'setHome':
    break;
  case 'saveTrip': 
    break;
   
}


// console.log(config.get('predefinedRoutes'));
// process.exit(0);

/**
 * PROCESS START
 */


console.log(appArgs);
process.exit(0);

//Define flags
if ((setHome = process.argv[2]) !== undefined) {
  config.set('home', setHome);
  console.log('Home destination set to', setHome);
  process.exit(0);
}


// Fetch input
const pointFrom = process.argv[2] == undefined ? false : process.argv[2];
const pointTo = process.argv[3] == undefined ? false : process.argv[3];

if (pointFrom == false) throw "missing from";
if (pointTo == false) throw "missing to";

//Change args to match with flags..
process.argv[2] = "--from='" + process.argv[2] + "'";
process.argv[3] = "--to='" + process.argv[3] + "'";

// Load search params.
const searchProcess = require('./lib/travelPlanner');

//Start process
searchProcess.find_from(pointFrom, pointTo);
