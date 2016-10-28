"use strict";

let page = null;
let audioTag = null; 
let voiceTag = null;
let watcherInterval = null;
let audioBlobArray = [];
let textsArray = [];
const SELECTED_VOICE = "selectedVoice";
const voices = ["en-US_LisaVoice", "pt-BR_IsabelaVoice", "en-US_MichaelVoice", "en-US_AllisonVoice"];
const watsonApiUrl = "https://watson-api-explorer.mybluemix.net/text-to-speech/api/v1/synthesize?accept=audio%2Fogg%3Bcodecs%3Dopus";

chrome.contextMenus.onClicked.addListener(onClickHandler);

function onClickHandler(info, tab) {
    //page.alert(JSON.stringify(arguments));
    //selectAndSaveVoice(info.menuItemId);
    clearPlayWatcherInterval();
    setupPageAndAudio();
    trySetVoiceOfVoicesAvailable(voices, info.menuItemId);
    speechText(info.selectionText);
}

function enqueueText(text) {
    textsArray.push(text);
}

function dequeueText() {
    let next = null;
    if (textsArray.length > 0) {
        next = textsArray.slice(0, 1)[0];
        textsArray = textsArray.slice(1, textsArray.length);
    }
    
    return next;
}

function enqueueBlob(audioBlob) {
    audioBlobArray.push(audioBlob);
}

function dequeueBlob() {
    let next = null;
    if (audioBlobArray.length > 0) {
        next = audioBlobArray.slice(0, 1)[0];
        audioBlobArray = audioBlobArray.slice(1, audioBlobArray.length);
    }
    
    return next;
}


function speechText(text) {
    
    if (text){
        let textsChunks = splitTextInto5KBArrayChunks(text);
        textsChunks.forEach(enqueueText);
        startAudioPlayWatcher(textsChunks.length);
        console.log("Texts:",textsChunks);
        console.log("Bytes: " + text.length);
        let firstText = dequeueText();
        playTextAsVoice(firstText, audioTag, voiceTag);
    }        
}

function splitTextInto5KBArrayChunks(text) {
    let words = text.split(' ');
    
    let chunks = [];
    let currentChunk = "";
    let tempText = "";
    let word = "";
    for (let i = 0; i < words.length; i++) {
        word = words[i];
        tempText = currentChunk + word;
        if (tempText.length > 100 && tempText.endsWith('.')) {
            chunks.push(tempText);            
            currentChunk = "";
        }
        else if (tempText.length > 500) {
            chunks.push(tempText);            
            currentChunk = "";
        }
        else {
            currentChunk += word + ' ';
        }
    }

    if (currentChunk !== "")
        chunks.push(currentChunk);

    return chunks;
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
    .then(audioBlob => {
        enqueueBlob(audioBlob);
        let nextText = dequeueText();
        if (nextText) {            
            playTextAsVoice(nextText, audioTag, voiceTag);
        }
    })
    .catch( error => {
        clearPlayWatcherInterval();
        console.error("Some error occured!");
        console.error(error);
        audioBlobArray = [];
        textsArray = [];
    });
}

function startAudioPlayWatcher(withBlobsLength) {
    let blobsCount = 0;
    let isPlaying = false;
    watcherInterval = setInterval(_ => {

        if (!isPlaying) {
            let nextBlob = dequeueBlob();
            if (nextBlob) {
                voiceTag.src = URL.createObjectURL(nextBlob);
                audioTag.load();
                audioTag.play();
                blobsCount++;
                isPlaying = true;
                audioTag.addEventListener("ended", function(){
                    console.log("ended");
                    console.log(audioBlobArray);
                    console.log(textsArray);
                    isPlaying = false;
                });
                
            }
            else if (blobsCount === withBlobsLength){
                clearPlayWatcherInterval();
            }
        }
    }, 500);
}

function clearPlayWatcherInterval() {
    if(watcherInterval) clearInterval(watcherInterval);
    if(audioTag && voiceTag){
        audioTag.pause();
        audioTag.load();
        voiceTag.src = "";        
    } 
    audioBlobArray = [];
    textsArray = [];
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

////////////////////////////////////////////////////
///////     SETUP REGION ///////////////////////////
////////////////////////////////////////////////////


// Set up context menu tree at install time.
chrome.runtime.onInstalled.addListener(function() {
    //let contexts = ["selection", "page","link","editable","image","video","audio"];

    let sid = createSelectionContextMenu();
    let pid = createPageVoiceSelectionContextMenu();
    let voiceOptionsIds = createVoiceSelectionContextMenu();
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