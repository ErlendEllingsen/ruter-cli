#!/usr/bin/env node
const fs = require("fs");
const request = require("request");
const moment = require("moment");
const flags = require("flags");
const colors = require("colors");
const graphqlRequest = require("graphql-request");

/**
 * VARIABLES
 */

// Ruter-specific variables
const transportationEmojis = {
  foot: "🚶",
  bus: "🚌",
  coach: "🚌",
  water: "⛴",
  rail: "🚆",
  tram: "🚋",
  metro: "🚇"
};

/**
 * PROCESS START
 */

const pointFrom = process.argv[2] == undefined ? false : process.argv[2];
const pointTo = process.argv[3] == undefined ? false : process.argv[3];

if (pointFrom == false) throw "missing from";
if (pointTo == false) throw "missing to";

//Change args to match with flags..
process.argv[2] = "--from='" + process.argv[2] + "'";
process.argv[3] = "--to='" + process.argv[3] + "'";

//Define flags
flags.defineInteger("proposals", 5, "Number of travel proposals");
flags.defineString("from", "jernbanetorget", "From-station");
flags.defineString("to", "stortinget ", "To-station");
flags.parse();

//--- FETCH STOPS ---
const searchObject = {
  from_id: null,
  to_id: null
};

const tools = {
  timeStampToDisplay: function(timestamp) {
    const deptTime = new moment(timestamp);
    let hrs = deptTime.hours();
    let mns = deptTime.minutes();
    hrs = (hrs >= 10 ? "" : "0") + hrs;
    mns = (mns >= 10 ? "" : "0") + mns;
    return "" + hrs + ":" + mns + "";
  },
  formatSeconds: function(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.ceil((seconds % 3600) / 60);
    return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
  },
  get_NSR_stop_place: function(contents) {
    for (let i = 0; i < contents.features.length; i++) {
      if (contents.features[i].properties.id.startsWith("NSR")) {
        return contents.features[i].properties.id;
      }
    }
    return null;
  }
};

const searchProcess = {};

searchProcess.find_from = function() {
  request(
    "https://api.entur.io/geocoder/v1/autocomplete?text=" +
      encodeURI(pointFrom),
    function(error, response, body) {
      if (!error && response.statusCode == 200) {
        const contents = JSON.parse(body);
        searchObject.from_id = tools.get_NSR_stop_place(contents);
        if (searchObject.from_id !== null) {
          searchProcess.find_to();
        } else {
          throw "can't find from id";
        }
      }
    }
  );
};

searchProcess.find_to = function() {
  request(
    "https://api.entur.io/geocoder/v1/autocomplete?text=" + encodeURI(pointTo),
    function(error, response, body) {
      if (!error && response.statusCode == 200) {
        const contents = JSON.parse(body);
        searchObject.to_id = tools.get_NSR_stop_place(contents);
        if (searchObject.to_id !== null) {
          searchProcess.query();
        } else {
          throw "can't find to id";
        }
      }
    }
  );
};

searchProcess.query = function() {
  const endpoint = "https://api.entur.io/journey-planner/v2/graphql";
  const variables = {
    toId: searchObject.to_id,
    fromId: searchObject.from_id
  };
  const query = `query getTrips($toId: String!, $fromId: String!) {
    trip(from: {place: $fromId}, to: {place: $toId}) {
      tripPatterns {
        startTime
        endTime
        duration
        legs {
          fromPlace {
            name
          }
          toPlace {
            name
          }
          mode
          distance
          duration
          aimedStartTime
          aimedEndTime
          expectedStartTime
          expectedEndTime
          line {
            name
            id
            publicCode
            notices {
              id
            }
          }
        }
      }
    }
  }`;
  graphqlRequest
    .request(endpoint, query, variables)
    .then(data => searchProcess.trip_output(data));
};

searchProcess.trip_output = function(obj) {
  // OUTPUT
  console.log("--------------------------------");
  console.log(colors.green("Travel Routes " + pointFrom + " -> " + pointTo));
  for (let i = 0; i < obj.trip.tripPatterns.length; i++) {
    const route = obj.trip.tripPatterns[i];
    console.log(
      colors.bold.yellow(
        "------- " +
          "Route #" +
          (i + 1) +
          " (Travel Time: " +
          tools.formatSeconds(route.duration) +
          ") -------"
      )
    );
    console.log(
      "Departure:".bold.white + "	" + new moment(route.startTime).toString()
    );
    console.log(
      "Arrival:".bold.white + "	" + new moment(route.endTime).toString()
    );
    console.log("");
    for (let y = 0; y < route.legs.length; y++) {
      const leg = route.legs[y];
      const legStep =
        colors.magenta("[") + colors.grey(y + 1) + colors.magenta("] ");
      const emoji = transportationEmojis[leg.mode];
      if (leg.mode == "foot") {
        //Walking
        console.log(
          legStep +
            emoji +
            " Walk " +
            colors.cyan(tools.formatSeconds(leg.duration))
        );
      } else {
        //USING TRANSPORT (NOT WALKING)
        const stamp_departure =
          "(" + colors.red(tools.timeStampToDisplay(leg.aimedStartTime)) + ")";
        const stamp_arrival =
          "(" + colors.red(tools.timeStampToDisplay(leg.aimedEndTime)) + ")";
        const stamp_expected_departure =
          "(" +
          colors.red(tools.timeStampToDisplay(leg.expectedStartTime)) +
          ")";
        const stamp_expected_arrival =
          "(" +
          colors.red(tools.timeStampToDisplay(leg.stamp_expectedEndTime)) +
          ")";
        const travel_notice =
          leg.notices !== undefined && leg.notices.length > 0
            ? "⚠️  Remarks! Check app or ruter.no ⚠️ "
            : "";

        console.log(
          legStep +
            emoji +
            " " +
            leg.fromPlace.name +
            " " +
            stamp_departure +
            " " +
            leg.line.publicCode +
            " -> " +
            leg.toPlace.name +
            " " +
            stamp_arrival +
            " " +
            travel_notice
        );
      }
      // end stage iteration
    }
    console.log(""); //new line at bottom
    //end travel proposal iteration
  }
  //end trip_output
};

//Start process
searchProcess.find_from();
