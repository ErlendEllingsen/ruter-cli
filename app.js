#!/usr/bin/env node
var fs = require("fs");
var request = require("request");
var moment = require("moment");
var flags = require("flags");
var colors = require("colors");
var graphqlRequest = require("graphql-request");

/**
 * VARIABLES
 */

// Ruter-specific variables
var transportationEmojis = {
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

var pointFrom = process.argv[2] == undefined ? false : process.argv[2];
var pointTo = process.argv[3] == undefined ? false : process.argv[3];

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
var searchObject = {
  from_id: null,
  to_id: null
};

var tools = {
  timeStampToDisplay: function(timestamp) {
    var deptTime = new moment(timestamp);
    var hrs = deptTime.hours();
    var mns = deptTime.minutes();
    hrs = (hrs >= 10 ? "" : "0") + hrs;
    mns = (mns >= 10 ? "" : "0") + mns;
    var stamp = "" + hrs + ":" + mns + "";
    return stamp;
  },
  formatSeconds: function(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.ceil((seconds % 3600) / 60);
    return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
  }
};

function removeCharFromString(string, character) {
  while (string.includes(character)) {
    string = string.replace(character, "");
  }
  return string;
}

function getApiTime(string) {
  string = removeCharFromString(string, "/");
  string = removeCharFromString(string, " ");
  string = removeCharFromString(string, ":");
  string = removeCharFromString(string, ",");
  string = removeCharFromString(string, "'");
  return string;
}

var searchProcess = {};

searchProcess.find_from = function() {
  //https://api.entur.io/geocoder/v1/autocomplete?text=eiksmarka&lang=en

  request(
    "https://api.entur.io/geocoder/v1/autocomplete?text=" +
      encodeURI(pointFrom),
    function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var contents = JSON.parse(body);
        searchObject.from_id = get_NSR_stop_place(contents);
        //Both stations are provided. find trip.
        searchProcess.find_to();
        //end error
      }
    }
  );
};

function get_NSR_stop_place(contents) {
  for (var i = 0; i < contents.features.length; i++) {
    if (contents.features[i].properties.id.startsWith("NSR")) {
      return contents.features[i].properties.id;
    }
  }
  return null;
}

searchProcess.find_to = function() {
  request(
    "https://api.entur.io/geocoder/v1/autocomplete?text=" + encodeURI(pointTo),
    function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var contents = JSON.parse(body);
        searchObject.to_id = get_NSR_stop_place(contents);
        if (searchObject.from_id === null || searchObject.to_id === null) {
          throw "can't find places";
        } else {
          searchProcess.test();
        }
      }
    }
  );
};

searchProcess.test = function() {
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
  for (var i = 0; i < obj.trip.tripPatterns.length; i++) {
    var route = obj.trip.tripPatterns[i];
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
    for (var y = 0; y < route.legs.length; y++) {
      var leg = route.legs[y];
      var legStep =
        colors.magenta("[") + colors.grey(y + 1) + colors.magenta("] ");
      var emoji = transportationEmojis[leg.mode];
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
        var stamp_departure =
          "(" + colors.red(tools.timeStampToDisplay(leg.aimedStartTime)) + ")";
        var stamp_arrival =
          "(" + colors.red(tools.timeStampToDisplay(leg.aimedEndTime)) + ")";
        var stamp_expected_departure =
          "(" +
          colors.red(tools.timeStampToDisplay(leg.expectedStartTime)) +
          ")";
        var stamp_expected_arrival =
          "(" +
          colors.red(tools.timeStampToDisplay(leg.stamp_expectedEndTime)) +
          ")";
        var travel_notice =
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
