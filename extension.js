"use strict";

let page = null;
let audioTag = null; 
let voiceTag = null;

const SELECTED_VOICE = "selectedVoice";
const voices = ["en-US_LisaVoice", "pt-BR_IsabelaVoice", "en-US_MichaelVoice", "en-US_AllisonVoice"];
const watsonApiUrl = "https://watson-api-explorer.mybluemix.net/text-to-speech/api/v1/synthesize?accept=audio%2Fogg%3Bcodecs%3Dopus";

chrome.contextMenus.onClicked.addListener(onClickHandler);

function onClickHandler(info, tab) {
    //page.alert(JSON.stringify(arguments));
  
    //selectAndSaveVoice(info.menuItemId);
    trySetVoiceOfVoicesAvailable(voices, info.menuItemId);
    speechText(info.selectionText);
}

function speechText(text) {
    
    if (text)
        playTextAsVoice(text, audioTag, voiceTag);
}

function playTextAsVoice(textToSpeech, audioTag, voiceTag) {
    
    let audioPostUrl = watsonApiUrl + "&voice=" + getVoice();

    fetch(audioPostUrl, {
        method: 'post',
        body : JSON.stringify({
            text : textToSpeech
        }),
        headers: new Headers({
            'Content-Type' : 'application/json',
            'Accept' : 'audio/ogg'
        })
	})
    .then(response => response.blob())
    .then(audioBytesArray => {
        voiceTag.src = URL.createObjectURL(audioBytesArray);
        audioTag.load();
        audioTag.play();
    })
    .catch(console.error);
}



// Set up context menu tree at install time.
chrome.runtime.onInstalled.addListener(function() {


    // Only selection context
    //let contexts = ["selection", "page","link","editable","image","video","audio"];

    let sid = createSelectionContextMenu();
    let pid = createPageVoiceSelectionContextMenu();
    let voiceOptionsIds = createVoiceSelectionContextMenu();

    requestSomeUntilAllArentNull([page, audioTag, voiceTag], _ => {
        setupPageAndAudio();
    });
});


function createSelectionContextMenu() {
    // on selection show the play audio button
    let contextMenuObject = {
        "title" : "Play selected text",
        "contexts" : ["selection"],
        "id" : "Selection Context"
    };

    let id = chrome.contextMenus.create(contextMenuObject);

    return id;
}

function createPageVoiceSelectionContextMenu() {
    let contextMenuObject = {
        "title" : "Select Voice To Speech",
        "contexts" : ["page"],
        "id" : "VoiceSelectionMenu"
    };

    let id = chrome.contextMenus.create(contextMenuObject);

    return id;
}

function createVoiceSelectionContextMenu() {

    voices.forEach(voice => {

        let voiceObjectOption = {
            "title" : voice,
            "type" : "radio",
            "id" : voice,
            "parentId" : "VoiceSelectionMenu"
        };

        chrome.contextMenus.create(voiceObjectOption);
    });
}

function setupPageAndAudio() {
    if (!page) page = chrome.extension.getBackgroundPage();
    if (!audioTag) audioTag = page.document.getElementById("audioTag");
    if (!voiceTag) voiceTag = page.document.getElementById("voiceTag");
}

function trySetVoiceOfVoicesAvailable(voicesArray, voiceSelected) {
    let voiceIndex = voicesArray.indexOf(voiceSelected);
    let lastSelectedVoice = getVoice();
    let selectedVoice = voiceIndex < 0 ? lastSelectedVoice : voicesArray[voiceIndex];
    setVoice(selectedVoice);
}

function getVoice() {
    return localStorage.getItem(SELECTED_VOICE) || voices[0];
}

function setVoice(voice) {
    localStorage.setItem(SELECTED_VOICE, voice);
}

function requestSomeUntilAllArentNull(nullableArray, cb) {
    let interval = setInterval((objectsArray) => {
        let test = false;
        for(let i = 0; i < nullableArray.length; i++) {
            let nullableObject = nullableArray[i];
            if (nullableObject === null) {
                test = true;
            }
        }

        if (test) cb();
        else clearOMy(); 
    }, 20, nullableArray);

    function clearOMy() {
        clearInterval(interval);    
    }
}