#!/usr/bin/env node
var request = require('request');
var colors = require('colors');
var fs = require('fs');


/**
 * VARIABLES
 */

var transportations = {
	'0': '🚶',
	'2': '🚌',
	'6': '🚆',
	'7': '🚋',
	'8': '🚇'
};

var pointFrom = (process.argv[2] == undefined ? false : process.argv[2]);
var pointTo = (process.argv[3] == undefined ? false : process.argv[3]);

if (pointFrom == false) throw "missing from";
if (pointTo == false) throw "missing to";

//--- FETCH STOPS ---
// var stops = fs.readFileSync('stops.json');
var searchObject = {
	from_id: null,
	to_id: null
};

var tools = {

	timeStampToDisplay: function(timestamp){

		var deptTime = new Date(timestamp);
		var hrs = deptTime.getHours();
		var mns = deptTime.getMinutes();
		hrs = (hrs >= 10 ? '' : '0') + hrs;
		mns = (mns >= 10 ? '' : '0') + mns;	
		var stamp = '' + hrs + ':' + mns + "";
		return stamp;		

	}

}

var searchProcess = {

};

searchProcess.find_from = function() {

	request('http://reisapi.ruter.no/Place/GetPlaces/?id=' + encodeURI(pointFrom), function (error, response, body) {
		if (!error && response.statusCode == 200) {
			
			var contents = JSON.parse(body);	
			searchObject.from_id = contents[0].ID;

			//Both stations are provided. find trip.
			searchProcess.find_to();	
			

			//end error
		}
	});

}


searchProcess.find_to = function() {

	request('http://reisapi.ruter.no/Place/GetPlaces/?id=' + encodeURI(pointTo), function (error, response, body) {
		if (!error && response.statusCode == 200) {
			
			var contents = JSON.parse(body);	
			searchObject.to_id = contents[0].ID;
			searchProcess.find_trip();
			//end error
		}
	});

}

searchProcess.find_trip = function(){



	request('http://reisapi.ruter.no/Travel/GetTravels?fromPlace=' + searchObject.from_id + '&toPlace=' + searchObject.to_id + '&isafter=true', function (error, response, body) {
		if (!error && response.statusCode == 200) {
			
			searchProcess.trip_output(JSON.parse(body));

			//end error
		}
	});

}

searchProcess.trip_output = function(obj) {

	// OUTPUT
	console.log('--------------------------------');
	console.log(colors.green('REISEFORSLAG ' + pointFrom + " -> " + pointTo));

	fs.writeFileSync('trip.fs', JSON.stringify(obj));


	for (var i = 0; i < obj.TravelProposals.length; i++) {
		var travelProposal = obj.TravelProposals[i];

		console.log(colors.bold.yellow('------- ' + 'Forslag #' + (i+1) + ' -------'));

		console.log('Departure: '.bold.white + " " + new Date(travelProposal.DepartureTime).toString());
		console.log('Arrival: '.bold.white + " " + new Date(travelProposal.ArrivalTime).toString());
		console.log('');

		//REMARKS
		if (travelProposal.Remarks.length > 0) {
			console.log('⚠️  Remarks! Check app or ruter.no ⚠️');
			console.log('');
		}

		for (var y = 0; y < travelProposal.Stages.length; y++) {
			var stage = travelProposal.Stages[y];

			var stageStep = (colors.magenta('[') + colors.grey(y + 1) + colors.magenta('] '));
			var emoji = transportations[stage.Transportation];


			if (stage.Transportation == '0') { //Walking
				console.log(stageStep + emoji  + " Walk " + colors.cyan(stage.WalkingTime));
			} else {

				//USING TRANSPORT (NOT WALKING)
				
				var stamp_departure = '(' + colors.red(tools.timeStampToDisplay(stage.DepartureTime)) + ')';
				var stamp_arrival = '(' + colors.red(tools.timeStampToDisplay(stage.ArrivalTime)) + ')';

				console.log(stageStep  + " " + stage.DepartureStop.Name + ' ' + stamp_departure + ' ' + emoji + '  -> ' + stage.ArrivalStop.Name + " " + stamp_arrival);	
			}
			
			//end stage iteration
		}

		console.log(''); //new line at bottom

		//end travel proposal iteration
	}


	//end trip_output
}



//Start process
searchProcess.find_from();

