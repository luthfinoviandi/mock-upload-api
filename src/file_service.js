module.exports = function (fileSystem, options) {
	
	var result = function (status, data) {
		return {
			status: status,
			data: data || {}
		};
	};
	
	return {

		updateFile: function (){
			return result(200);
		},

		getFileSize: function (filename) {
			if (fileSystem.exists(filename)) {
				var size = fileSystem.size(filename);
				console.log("Request size of", filename, "is", size);
				return result(200, {size: size});
			} else {
				console.log("Request size of", filename, "not found");
				return result(404);
			}
		},
		
		readFile: function (filename) {
			if (fileSystem.exists(filename)) {
				console.log("Streaming", filename);
				return result(200, fileSystem.read(filename));
			} else {
				console.log("Streaming", filename, "not found");
				return result(404);
			}
		},
		
		writeFile: function (filename, buffer) {
			console.log("Storing", filename);
			fileSystem.write(filename, buffer);
			return result(200);
		},
		
		writeFileChunk: function (filename, buffer, chunkNumber) {
			console.log("Storing", filename, "chunk", chunkNumber);
			fileSystem.write(filename + "." + chunkNumber + ".chunk", buffer);
			return result(200);
		},
		
		assembleFileChunks: function (filename, requestTotalSize) {
			console.log("Assembling", filename, "total size", requestTotalSize);
			var chunkNumber = 1;
			var totalSize = 0;
			while (true) {
				var chunkName = filename + "." + chunkNumber + ".chunk";
				if (fileSystem.exists(chunkName)) {
					var size = fileSystem.size(chunkName);
					console.log("Testing", chunkName, "with size", size);
					chunkNumber++;
					totalSize += size;
				} else {
					console.log("Testing", chunkName, "not found");
					break;
				}
			}
			if (requestTotalSize != totalSize) {
				console.log("Request total size", requestTotalSize, "not equal to calculated total size", totalSize);
				return result(412);
			}
			console.log("Request total size", requestTotalSize, "equal to calculated total size", totalSize);
			var buffer = null;
			chunkNumber = 1;
			while (true) {
				var chunkNameX = filename + "." + chunkNumber + ".chunk";
				if (!fileSystem.exists(chunkNameX))
					break;
				buffer = buffer ? Buffer.concat([buffer, fileSystem.read(chunkNameX)]) : fileSystem.read(chunkNameX);
				fileSystem.remove(chunkNameX);
				chunkNumber++;
			}
			fileSystem.write(filename, buffer);
			return result(200);
		},

		getEbaoLookupData: function (body){
			console.log("Get Ebao Lookup Data", body);

			const fs = require('fs');

			let data = fs.readFileSync('ebaoLookup.json');
			let jsonData = JSON.parse(data);

			var filteredData = null;

			const claimNo = body.claimNo || null;

			if(claimNo != null && claimNo != ""){
				filteredData = jsonData.find(item => item.claimNo == claimNo);
			}

			const dateOfAccident = body.dateOfAccident;
			const oiVehicleNo = body.oiVehicleNumber;
			const claimType = body.claimType;

			if(dateOfAccident != null && oiVehicleNo != null && claimType != null){
				filteredData = jsonData.find(item => item.claimNo == "MT/46507499-001");
			}

			return filteredData;
		},

		getLookupCodeTable: function (tableCode){
			const fs = require('fs');

			let data = null;

			if(tableCode == 'GI_T021'){
				data = fs.readFileSync('tpSurvey.json');
			} else if(tableCode == 'GI_T022'){
				data = fs.readFileSync('tpInsurer.json');
			} else if(tableCode == 'GI_T023'){
				data = fs.readFileSync('tpWorkshop.json');
			} else if(tableCode == 'GI_T024'){
				data = fs.readFileSync('tpLawyer.json');
			} else if(tableCode == 'GI_T025'){
				data = fs.readFileSync('tpClinic.json');
			}
			let jsonData = JSON.parse(data);

			return jsonData;
		},

		getEbaoPartyLookupByName: function(partyName){
			console.log("Get Ebao Paty Lookup By Name", partyName);

			const fs = require('fs');

			let data = fs.readFileSync('ebaoPartyLookup.json');
			let jsonData = JSON.parse(data);

			console.log("JSON Data", jsonData);

			const filteredData = jsonData.filter(item => item.partyName.toUpperCase().includes(partyName.toUpperCase()));

			const resultResponse = {
				status : 200,
				voList: filteredData
			};

			return resultResponse;
		},


		getEbaoPartyLookupById: function(idNumber){
			console.log("Get Ebao Paty Lookup By ID", idNumber);

			const fs = require('fs');

			let data = fs.readFileSync('ebaoPartyLookup.json');
			let jsonData = JSON.parse(data);

			console.log("data  ", jsonData);

			const filteredData = jsonData.filter(item => item.idNum.toUpperCase().includes(idNumber.toUpperCase()));

			const resultResponse = {
				status : 200,
				voList: filteredData
			};

			return resultResponse;
		},

		getNERResult: function(){
			console.log("Get NER Result");

			const fs = require('fs');

			let data = fs.readFileSync('ai_ner_result.json');
			let jsonData = JSON.parse(data);

			const resultResponse = {
				status : 200,
				partyInfo: jsonData
			};

			return resultResponse;
		},

		createCompanyResult: function(){
			console.log("create company result")
			const fs = require('fs');
			let data = fs.readFileSync('create_company_1.json');
			let jsonData = JSON.parse(data);

			return jsonData;

		}

	};
};
