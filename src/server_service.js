var Express = require("express");
var https = require('https');
var Multer = require("multer");
var BodyParser = require("body-parser");
var fs = require("fs");
var key = fs.readFileSync('key.pem');
var cert = fs.readFileSync('cert.pem');
var express = Express();

var server = https.createServer({key: key, cert: cert}, express);
server.listen(8080, () => {
	console.log('listening on 8080')
});
module.exports = {
	
	init: function (Config) {
		var upload = Multer({ storage: Multer.memoryStorage() });		
		const bodyParser = require('body-parser');

		express.use(bodyParser.json({limit: '50mb'}));
		express.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
		if (Config.staticServe)
			express.use("/static", Express["static"](Config.staticServe));

		var fileSystem = require(__dirname + "/file_system.js")({
			timer: Config.timer || 1000 * 30,
			clean: Config.clean || 1000 * 60 * 5 
		});

		var fileService = require(__dirname + "/file_service.js")(fileSystem);
		
		var saveFile = function(request, response, filename) {
			console.log("Attached File", request.file);
			var result = fileService.writeFile(filename || request.file.originalname, request.file.buffer);
			if (request.query._postmessage) {
				if (request.query._postmessageid)
					result.data._postmessageid = request.query._postmessageid;

				response
					.status(result.status)
					.header("Content-Type", "text/html")
					.send("<!DOCTYPE html><script>parent.postMessage(JSON.stringify(" + JSON.stringify(result.data) + "), '*');</script>");
			} else {
				result.data = {
								   "status":    {
								      "code": "0",
								      "message": "Success"
								   },
								   "filePath": "usr/uploaded/" + filename
								}

				console.log("Response", result.data)

				response.status(result.status).send(result.data);
			}
		};

		var saveFileDynamic = function(request, response, file) {
			console.log("Attached File", file);
			var result = fileService.writeFile(file.originalname, file.buffer);
			if (request.query._postmessage) {
				if (request.query._postmessageid)
					result.data._postmessageid = request.query._postmessageid;

				response
					.status(result.status)
					.header("Content-Type", "text/html")
					.send("<!DOCTYPE html><script>parent.postMessage(JSON.stringify(" + JSON.stringify(result.data) + "), '*');</script>");
			} else {
				result.data = {
								   "status":    {
								      "code": "0",
								      "message": "Success"
								   },
								   "filePath": "usr/uploaded/" + file.originalname
								}

				console.log("Response", result.data)

				response.status(result.status).send(result.data);
			}
		};

		express.options("/*", function(req, res, next){
			res.header('Access-Control-Allow-Origin', '*');
			res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
			res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Cache-Control');
			res.send(200);
		});
		
		express.use(function(request, response, next) {
			response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
			response.header("Access-Control-Allow-Origin", request.headers.origin || "*");
			if (request.headers.origin)
				response.header("Access-Control-Allow-Credentials", "true");
			next();
		});

		express.get('/files/:filename/size', function (request, response) {
			var result = fileService.getFileSize(request.params.filename);
			response.status(result.status).send(result.data);
		});

		express.get('/files/:filename', function (request, response) {
			var result = fileService.readFile(request.params.filename);
			response.status(result.status).send(result.data);
		});

		express.post("/files", upload.any(), function (request, response) {
			request.files.forEach(file => {
				saveFileDynamic(request, response, file);
			})
		});

		express.post("/files/:filename", upload.single('attachment'), function (request, response) {
			console.log("Uploading...")
			saveFile(request, response, request.params.filename);
		});

		express.options("*", function (request, response) {
			response.status(200).send({});
		});

		express.post("/chunk/:filename", upload.single('attachment'), function (request, response) {
			var result = fileService.writeFileChunk(request.params.filename, request.file.buffer, request.body[Config.parameterChunkNumber || "chunknumber"]);
			response.status(result.status).send(result.data);
		});

		express.post("/assemble/:filename", function (request, response) {
			var result = fileService.assembleFileChunks(request.params.filename, request.body[Config.parameterTotalSize || "totalsize"]);
			response.status(result.status).send(result.data);
		});

		express.post("/BAEM/sending-file", function (request, response){
			console.log("Headers", request.headers);
			console.log("Body", request.body);
			let base64String = request.body.FileMessage.base64Message;
			let fileExtension = request.body.FileMessage.fileExtension;

			let base64Object = base64String.split(';base64,').pop();

			const uuid = require('uuid');
			const filename = `${uuid.v1()}.${fileExtension}`;

			const buffer = new Buffer(base64Object, 'base64');

			console.log("filename", filename, buffer);

			fileService.writeFile(filename, buffer);


			const result = {
							   "status": "success",
							   "fileId": filename
							}

			response.status(200).send(result);
		});

		express.post("/BAEM/sending-email", function(request, response){
			console.log("Do Sending Email")
			console.log("Body", request.body)
			console.log("Headers", request.headers)
			var result = fileService.updateFile();

			result.data = {
							   "status":    {
							      "code": "0",
							      "message": "Success"
							   },
							   "claimNo": request.claimNo
							}
			response.status(result.status).send(result.data)
		});

		express.post("/update-file", function(request, response){
			console.log("Do Update File")
			var result = fileService.updateFile();

			result.data = {
							   "status":    [{
							      "code": "0",
							      "message": "Success"
							   },
							   {
							   	  "code": "0",
							   	  "message": "Success"
							   }],
							   "claimNo": request.claimNo
							}
			response.status(result.status).send(result.data)
		});

		express.post("/get-lookup", function(request, response){
			console.log("Get Lookup", request.body)
			
			let tableCode = request.body.tableCode;

			var result = fileService.getLookupCodeTable(tableCode);
			

			console.log("Get Lookup Result", result)

			response.status(200).send(result)
		});

		express.post("/ebao-lookup", function(request, response){
			console.log("Do Ebao Lookup", request.body);

			var result = fileService.getEbaoLookupData(request.body);

			console.log("Result", result)

			if(result){
				response.status(200).send(result)
			} else {
				const result = {
					status:
					{
						"code": "ERR-01",
						"message": "IPAS request doesn’t match for Accident number + Claim Type OD-MO/TP-MI + Claimant ID Number"
					},
					claimMatchSOABO: {
						"validPolicyCoverage": "3",
						"existingClaimFile": "3"
					},
					policySOABOs:[],
					claimCaseSOABOs:[]
				}

				response.status(200).send(result);
			}
		});

		express.post("/ebao-party-lookup", function(request, response){
			console.log("Do Ebao Party Lookup", request.body);

			const partyName = request.body.partyName;
			const idNumber = request.body.idNumber;
			var result = {};
			if(partyName){
				result = fileService.getEbaoPartyLookupByName(partyName);
			} else if(idNumber) {
				result = fileService.getEbaoPartyLookupById(idNumber);
			}

			console.log("Result", result)
			response.status(200).send(result)
		});

		express.post("/ai-ner-result", function(request, response){
			console.log("Do NER Result", request.body);

			const partyName = request.body.partyName;
			const idNumber = request.body.idNumber;
			var result = fileService.getNERResult();

			console.log("Result", result)
			response.status(200).send(result)
		});

		express.post("/auth/BAEM/accessToken", function(request, response){
			console.log("Headers", request.headers);
			console.log("Body", request.body);
			console.log("Password", request.body.password);

			const data = {
				accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
			}
			response.status(200).send(data)
		});

		express.post("/new-claim", function(request, response){
			console.log("New Claim", request.body);

			const result = {
				status: [
					{
						"code": "0",
						"message": "Success"
					}
				],
				claimNo: "MT/34227880-001"
			}

			console.log("Result", result)
			response.status(200).send(result)
		});

		express.post("/test-filename", upload.any(), function(request, response){
			console.log("Test filename body", request.body);

			request.files.forEach(file => {
				if(file.originalname == request.body.fileName){
					saveFileDynamic(request, response, file);
				} else {
					response.status(500).send()
				}
			})

		});

		return express;
	},


	
	run: function (server, port) {
		port = port || 5000;
		server.listen(port, function () {
			console.log("Listening on", port);
		});
	}
	
};