/**
 * URL prefix
 */
var urlPrefix = 'https://05778542.ngrok.io/?';

var fs = require('fs');
var colorsJson = JSON.parse(fs.readFileSync('colors.json', 'utf8'));

/**
 * App ID for the skill
 */
var APP_ID = null; //replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]';
// curl -X GET --header "Accept: application/json" "https://api.multco.us/bridges/hawthorne?access_token=email:token&access_token=email:token"

// bridgeinfo uses https
var http = require('https');

var globalResponse;

/**
 * The AlexaSkill Module that has the AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');


var LightingSkill = function() {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
LightingSkill.prototype = Object.create(AlexaSkill.prototype);
LightingSkill.prototype.constructor = LightingSkill;

LightingSkill.prototype.eventHandlers.onSessionStarted = function(sessionStartedRequest, session) {
    console.log("LightingSkill onSessionStarted requestId: " + sessionStartedRequest.requestId + ", sessionId: " + session.sessionId);

    // any session init logic would go here
};

LightingSkill.prototype.eventHandlers.onLaunch = function(launchRequest, session, response) {
    console.log("LightingSkill onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    getWelcomeResponse(response);
};

LightingSkill.prototype.eventHandlers.onSessionEnded = function(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId + ", sessionId: " + session.sessionId);

    // any session cleanup logic would go here
};

LightingSkill.prototype.intentHandlers = {

    "SetColorIntent": function(intent, session, response) {
        handleColorIntentRequest(intent, session, response);
    },
    "GetVersionIntent": function(intent, session, response) {
        handleVersionIntentRequest(intent, session, response);
    },
    "AMAZON.HelpIntent": function(intent, session, response) {
        var speechText = "Ask me to do something with the lights.";
        var repromptText = "Would you like to change the lights again?";
        var speechOutput = {
            speech: speechText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        var repromptOutput = {
            speech: repromptText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.ask(speechOutput, repromptOutput);
    },

    "AMAZON.StopIntent": function(intent, session, response) {
        var speechOutput = {
            speech: "Goodbye",
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function(intent, session, response) {
        var speechOutput = {
            speech: "Goodbye",
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.tell(speechOutput);
    }
};

/**
 * Function to handle the onLaunch skill behavior
 */

function getWelcomeResponse(response) {
    globalResponse = response;
    // If we wanted to initialize the session to have some attributes we could add those here.
    var cardTitle = "Phillip";
    var repromptText = "Would you like me to change the lights again?";
    var speechText = "Would you like me to change the lights?";
    var cardOutput = "";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.

    var speechOutput = {
        speech: "<speak>" + speechText + "</speak>",
        type: AlexaSkill.speechOutputType.SSML
    };
    var repromptOutput = {
        speech: repromptText,
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    response.askWithCard(speechOutput, repromptOutput, cardTitle, cardOutput);
}

/**
 * Gets a poster prepares the speech to reply to the user.
 */
function handleVersionIntentRequest(intent, session, response) {
    globalResponse = response;

    var prefixContent = "";
    var cardContent = "";
    var cardTitle = "";

    var speechOutput = {
        speech: "<speak>I am version zero dot zero dot one</speak>",
        type: AlexaSkill.speechOutputType.SSML
    };
    var repromptOutput = {
        speech: "Do you want to hear the version again?",
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    response.tellWithCard(speechOutput, cardTitle, cardContent);
}


/**
 * Gets a poster prepares the speech to reply to the user.
 */
function handleColorIntentRequest(intent, session, response) {
    globalResponse = response;

    if (!validate(intent)) {
        return;
    }

    var color = intent.slots.ColorName.value.toLowerCase();

    setColor(color, function(result) {
        console.log(result);
        var speechText = '';
        if (result.status === 'success') {
            speechText = "Successfully set the lights " + color;
        } else {
            speechText = "Unable to set the lights " + color;
        }

        var cardTitle = "Light Adjustment";
        var speechOutput = {
            speech: "<speak>" + speechText + "</speak>",
            type: AlexaSkill.speechOutputType.SSML
        };
        response.tellWithCard(speechOutput, cardTitle, speechText);
    });
}



function validate(intent) {

    var allowed = [];
    for (var key in colorsJson) {
      if (colorsJson.hasOwnProperty(key)) {
        allowed.push(key + ", ") ;
      }
    }

    if (!intent || allowed.indexOf(intent.slots.ColorName.value.toLowerCase()) <= -1) {
        msg = "it appears the requested color " + intent.slots.ColorName.value.toLowerCase() + " is not listed. You can ask about";
        for (var i = 0; i < allowed.length; i++) {
            msg += " " + allowed[i];
        }

        errorMessage(msg);
        console.log("request is NOT valid for " + intent.slots.ColorName.value.toLowerCase());
        return false;
    }

    console.log("request is valid for " + intent.slots.ColorName.value);
    return true;
}

function setColor(color, eventCallback, apiResource) {

    console.log("set color:" + color);

    url = urlPrefix + getQueryParam(color);

    console.log('request url: ' + url);

    http.get(url, function(res) {
        var body = '';
        res.on('data', function(chunk) {
            body += chunk;
        });
        res.on('end', function() {
            try {
                console.log("request was success = " + body);
                var jsonResult = {
                    body: "",
                    status: ""
                };
                // jsonResult.body = JSON.parse(body);
                jsonResult.status = 'success';
                eventCallback(jsonResult);
            } catch (err) {
                console.log("Got error: ", err);
                eventCallback({
                    status: 'error',
                    message: body
                });
            }
        });
    }).on('error', function(e) {
        console.log("Got error: ", e);
        errorMessage("setting the lights to " + bridge);
    });
}

function getQueryParam(color) {
    var colorObj = colorsJson[color];
    if (colorObj) {
        return 'r=' + colorObj.r + '&g=' + colorObj.g + '&b=' + colorObj.b + '&i=' + colorObj.i;
    } else {
        return 'r=255&g=255&b=255&i=255';
    }
}

function errorMessage(errString) {
    var speechText = "I am sorry, there was an error. " + errString;
    var speechOutput = {
        speech: "<speak>" + speechText + "</speak>",
        type: AlexaSkill.speechOutputType.SSML
    };
    var repromptOutput = {
        speech: "Would you like to try and change the lighing color again?",
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    globalResponse.tellWithCard(speechOutput, "Error", speechText);
}

// Create the handler that responds to the Alexa Request.
exports.handler = function(event, context) {
    // Create an instance of the HistoryBuff Skill.
    var skill = new LightingSkill();
    skill.execute(event, context);
};
