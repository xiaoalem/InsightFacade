window.onload = function() {
	putData("rooms");
	putData("courses");
}

window.addEventListener("beforeunload", function(event) {
	document.getElementById("overlay").style.display = "block";
	deleteData("rooms");
	deleteData("courses");
})

document.getElementById("course").addEventListener("click", handleClickCourse);
document.getElementById("room").addEventListener("click", handleClickRoom);
document.getElementById("submitRoom").addEventListener("click", handleRoomSubmit);
document.getElementById("submitCourse").addEventListener("click", handleCourseSubmit);

function handleCourseSubmit() {
	let courseQuery = queriesToLoad["course"];
	const dept = document.getElementById("dept");
	const section = document.getElementById("section");
	const start = document.getElementById("yearStart");
	const end = document.getElementById("yearEnd")
	courseQuery.WHERE.AND[0].IS.courses_dept = dept.value;
	courseQuery.WHERE.AND[1].IS.courses_id = section.value;
	courseQuery.WHERE.AND[2].GT.courses_year = Number(start.value) - 1;
	courseQuery.WHERE.AND[3].LT.courses_year = Number(end.value) + 1;
	const result = sendQuery(courseQuery);
	let avg;
	if (result.length === 0) {
		document.getElementById("result").style.display = "none";
		document.getElementById("avgNotFound").style.display = "block";
	} else {
		avg = result[0].overallAvg;
		console.log(avg);
		document.getElementById("avgNotFound").style.display = "none";
		document.getElementById("result").innerHTML = `The magic number is ${avg}!`;
		document.getElementById("result").style.display = "block";
	}
}

function handleRoomSubmit() {
	let roomQuery = queriesToLoad["room"];
	let locationQuery = queriesToLoad["location"];
	const building = document.getElementById("building");
	const capacity = document.getElementById("capacity");
	const furniture = document.getElementById("furniture");
	roomQuery.WHERE.AND[0].IS.rooms_furniture = furniture.value;
	roomQuery.WHERE.AND[1].GT.rooms_seats = Number(capacity.value);
	locationQuery.WHERE.IS.rooms_fullname = building.value;
	console.log(building.value);
	const rooms = sendQuery(roomQuery);
	const location = sendQuery(locationQuery);
	console.log(location);
	if (rooms.length === 0) {
		document.getElementById("roomTable").style.display = "none";
		document.getElementById("roomNotFound").style.display = "block";
	} else {
		const result = compareDistance(rooms, location[0]);
		createTable(result);
		document.getElementById("roomNotFound").style.display = "none";
		document.getElementById("roomTable").style.display = "block";
	}
}

function createTable(arr) {
	let tableBody = document.getElementById("table");
	while(tableBody.hasChildNodes()) {
		tableBody.removeChild(tableBody.firstChild);
	}
	for (let i = 0; i < arr.length; i++) {
		const e = arr[i];
		const row = `<tr>
						<td>${e.rooms_distance.toFixed()}</td>
						<td>${e.rooms_fullname}</td>
						<td>${e.rooms_name}</td>
						<td>${e.rooms_seats}</td>
						<td>${e.rooms_furniture}</td>
						<td>${e.rooms_address}</td>
						<td>
							<a href=${e.rooms_href}>Click for Information</a>
						</td>
					</tr>`
		tableBody.innerHTML += row;
	}
}

function sendQuery(query) {
	let xhr = new XMLHttpRequest();
	let result;
	xhr.open("POST", "/query", false);
	xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	xhr.onload = function() {
		if(this.status === 200) {
			result = JSON.parse(this.responseText).result;
		}
	};
	xhr.send(JSON.stringify(query));
	return result;
}

function compareDistance(rooms, location) {
	let xhr = new XMLHttpRequest();
	let result;
	xhr.open("POST", `/distance/${location.lat}/${location.lon}`, false);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onload = function() {
		if(this.status === 200) {
			result = JSON.parse(this.responseText).result;
		}
	};
	xhr.send(JSON.stringify(rooms));
	return result;
}

function deleteData(type) {
	let xhr = new XMLHttpRequest();
	let path;
	if (type === "rooms") {
		path = "/rooms";
	}
	if (type === "courses") {
		path = "/courses";
	}
	xhr.open("DELETE", `/dataset${path}`, true);
	xhr.onload = function() {
		if(this.status === 200) {
			console.log(this.responseText);
		}
	};
	xhr.send();
}

function putData(type) {
	document.getElementById("overlay").style.display = "block";
	let xhr = new XMLHttpRequest();
	let path;
	if (type === "rooms") {
		path = "/rooms/rooms";
	}
	if (type === "courses") {
		path = "/courses/courses";
	}
	xhr.open("PUT", `/dataset${path}`, false);
	xhr.onload = function() {
		if(this.status === 200) {
			console.log(this.responseText);
			document.getElementById("overlay").style.display = "none";
			if (type === "rooms") {
				extractOption("building");
				extractOption("furniture");
			}
			if (type === "courses") {
				extractOption("dept");
				extractOption("section")
			}
			document.getElementById("overlay").style.display = "none";
		}
	};
	xhr.send();
}

function extractOption(type) {
	let xhr = new XMLHttpRequest();
	const jsonObj = queriesToLoad[type];
	xhr.open("POST", "/query", true);
	xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	xhr.onload = function() {
		if(this.status === 200) {
			const result = JSON.parse(this.responseText).result;
			roomOptions[type] = result.map((value, index) => {
				return Object.values(value)[0];
			})
			createOptions(type);
		}
	};
	xhr.send(JSON.stringify(jsonObj));
}



function handleClickCourse() {
	document.getElementById("inputRoom").style.display = "none";
	document.getElementById("inputCourse").style.display = "block";
}



function handleClickRoom() {
	document.getElementById("inputCourse").style.display = "none";
	document.getElementById("inputRoom").style.display = "block";
}

function handleChooseDept() {
	const dept = document.getElementById("dept").value;
	queriesToLoad.section.WHERE.IS.courses_dept = dept;
	extractOption("section");
}

function createOptions(type) {
	const allOptions = document.getElementById(type);
	while (allOptions.hasChildNodes()) {
		allOptions.removeChild(allOptions.firstChild);
	}
	for (let entry of roomOptions[type]) {
		const element = document.createElement("option");
		if (type === "dept") {
			element.textContent = entry.toUpperCase();
		} else {
			element.textContent = entry;
		}
		element.value = entry;
		allOptions.append(element);
	}
}

const queriesToLoad = {
	dept: {
		"WHERE": {},
		"OPTIONS": {
			"COLUMNS": [
				"courses_dept"
			],
			"ORDER": "courses_dept"
		},
		"TRANSFORMATIONS": {
			"GROUP": [
				"courses_dept"
			],
			"APPLY": []
		}
	},
	section: {
		"WHERE": {
			"IS": {
				"courses_dept": "aanb"
			}
		},
		"OPTIONS": {
			"COLUMNS": [
				"courses_id"
			],
			"ORDER": "courses_id"
		},
		"TRANSFORMATIONS": {
			"GROUP": [
				"courses_id"
			],
			"APPLY": []
		}
	},
	building: {
		"WHERE": {},
		"OPTIONS": {
			"COLUMNS": [
				"rooms_fullname"
			],
			"ORDER": "rooms_fullname"
		},
		"TRANSFORMATIONS": {
			"GROUP": [
				"rooms_fullname"
			],
			"APPLY": []
		}
	},
	furniture: {
		"WHERE": {},
		"OPTIONS": {
			"COLUMNS": [
				"rooms_furniture"
			],
			"ORDER": "rooms_furniture"
		},
		"TRANSFORMATIONS": {
			"GROUP": [
				"rooms_furniture"
			],
			"APPLY": []
		}
	},
	room: {
		"WHERE": {
			"AND": [
				{
					"IS":{
						"rooms_furniture": "*"
					}
				},
				{
					"GT":{
						"rooms_seats": 0
					}
				}
			]
		},
		"OPTIONS": {
			"COLUMNS": [
				"rooms_fullname",
				"rooms_name",
				"rooms_address",
				"rooms_seats",
				"rooms_furniture",
				"rooms_href",
				"rooms_lat",
				"rooms_lon"
			],
			"ORDER": "rooms_seats"
		}
	},
	course: {
		"WHERE": {
			"AND": [
				{
					"IS": {
						"courses_dept": "aanb"
					}
				},
				{
					"IS": {
						"courses_id": "504"
					}
				},
				{
					"GT": {
						"courses_year": 1900
					}
				},
				{
					"LT": {
						"courses_year": 2021
					}
				}
			]
		},
		"OPTIONS": {
			"COLUMNS": [
				"overallAvg"
			]
		},
		"TRANSFORMATIONS": {
			"GROUP": [
				"courses_dept",
				"courses_id"
			],
			"APPLY": [
				{
					"overallAvg": {
						"AVG": "courses_avg"
					}
				}
			]
		}
	},
	location: {
		"WHERE": {
			"IS": {
				"rooms_fullname": ""
			}
		},
		"OPTIONS": {
			"COLUMNS": [
				"lat",
				"lon"
			]
		},
		"TRANSFORMATIONS": {
			"GROUP": [
				"rooms_lat",
				"rooms_lon"
			],
			"APPLY": [
				{
					"lat": {
						"MAX": "rooms_lat"
					}
				},
				{
					"lon": {
						"MAX": "rooms_lon"
					}
				}
			]
		}
	}
};

let roomOptions = {
	building: [],
	furniture: [],
	dept: [],
	section: [],
};


