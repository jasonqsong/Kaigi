//main.js

var main(){
	//setup Kaigi
	speechRecognize(function(text){
		alert(text);
		//solve subtitle
	})
}



var speechRecognize=function(callback){
	//setup
	//setup microphone
	// get callback
	speech(function(text){
		//pre solve
		if(callback!=undefined){
			callback(text);
		}
	})
}