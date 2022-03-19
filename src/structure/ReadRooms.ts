import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import {Building, Room} from "./Miscellaneous";

import JSZip from "jszip";

import {getGeoCoord} from "../persistance/Utilities";
import ReadData from "./ReadData";

const parse5 = require("parse5");

let buildings: any[] = [];
let buildingRooms: Map<string, any[]> = new Map();
let contentJSZip: any = null;

export default class ReadRooms extends ReadData {
	// private variables for Dataset class


	constructor(id: string, kind: InsightDatasetKind) {
		super(id, kind);
		buildings = [];
		buildingRooms = new Map<string, any[]>();
		contentJSZip = null;
	}

	public fillDataSet(content: string): Promise<Room[]> {
		return new Promise<Room[]>((resolve, reject) => {
			this.parseBase64Content(content)
				.then((data) => {
					contentJSZip = data;
					const jszipFile = data.file("rooms/index.htm");
					if (jszipFile === null) {
						reject(new InsightError("no rooms/index.htm found"));
					}
					return this.parseJSZipToJson(jszipFile);
				}).then((jsonFile) => {
					return this.getTableJson(jsonFile, "building");
				}).then((tableJson) => {
					return this.processTable(tableJson, "building", null);
				}).then(() => {
					if (this.entries.length === 0) {
						reject(new InsightError("no data entry"));
					}
					resolve(this.entries);
				}).catch((error) => {
					reject(new InsightError("Data Input is invalid"));
				});
		});
	}

	public parseBase64Content = (content: string): Promise<JSZip> => {
		const zip = new JSZip();
		return new Promise((resolve, reject) => {
			zip.loadAsync(content, {base64: true})
				.then(() => {
					resolve(zip);
				})
				.catch((error) => {
					reject(new InsightError());
				});
		});
	};

	public parseJSZipToJson (jszipObject: JSZip.JSZipObject | null | undefined): Promise<any> {
		return new Promise((resolve, reject) => {
			return jszipObject?.async("string").then((stringFile) => {
				return parse5.parse(stringFile);
			}).then((jsonTree) => {
				resolve(jsonTree);
			}).catch((error) => {
				reject();
			});
		});
	}

	private getTableJson(jsonFile: any, shortName: string): Promise<any> {
		return this.searchTreeForTable(jsonFile, shortName).then(() => {
			if (buildings.length === 0) {
				return Promise.reject("no building information");
			} else {
				if (shortName === "building") {
					return Promise.resolve(buildings);
				} else {
					const rooms = buildingRooms.get(shortName);
					return Promise.resolve(rooms);
				}
			}
		});
	}

	private searchTreeForTable(jsonFile: any, shortName: string): Promise<void> {
		if (jsonFile.nodeName === "tr") {
			if (jsonFile.parentNode.nodeName === "tbody") {
				if (shortName === "building") {
					buildings.push(jsonFile);
				} else {
					buildingRooms.get(shortName)?.push(jsonFile);
				}
				return Promise.resolve();
			}
		}
		if (jsonFile.childNodes === undefined) {
			return Promise.resolve();
		}
		const processChildNodes: any[] = [];
		for (const child of jsonFile.childNodes) {
			const asyncChildNode = this.searchTreeForTable(child, shortName);
			processChildNodes.push(asyncChildNode);
		}
		return Promise.all(processChildNodes).then(() => {
			return Promise.resolve();
		});
	}

	private processTable(tableJson: any, type: string, buildingInfo: any): Promise<void> {
		const allProcessRowsAsync: any[] = [];
		for (const row of tableJson) {
			if (type === "building") {
				const asyncBuildingRow = this.processBuildingRow(row);
				allProcessRowsAsync.push(asyncBuildingRow);
			} else {
				const asyncRoomRow = this.processRoomRow(row, buildingInfo);
				allProcessRowsAsync.push(asyncRoomRow);
			}
		}
		if (allProcessRowsAsync.length === 0) {
			return Promise.resolve();
		} else {
			return Promise.all(allProcessRowsAsync).then((promises) => {
				return Promise.resolve();
			});
		}
	}

	private processBuildingRow(row: any): Promise<void> {
		let buildingInfo: Building = {
			fullname: "",
			shortname: "",
			address: "",
			directory: "",
			lat: 0,
			lon: 0
		};
		let path = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team065/";
		for (const child of row.childNodes) {
			if (child.nodeName === "td") {
				const field = child.attrs[0].value;
				if (field === "views-field views-field-field-building-code") {
					buildingInfo.shortname = child.childNodes[0].value.trim();
				}
				if (field === "views-field views-field-title") {
					buildingInfo.fullname = child.childNodes[1].childNodes[0].value.trim();
				}
				if (field === "views-field views-field-field-building-address") {
					buildingInfo.address = child.childNodes[0].value.trim();
				}
				if (field === "views-field views-field-nothing") {
					buildingInfo.directory = "rooms" + child.childNodes[1].attrs[0].value.trim().slice(1);
				}
			}
		}
		path = path + buildingInfo.address.replace(/\s/g, "%20");
		return getGeoCoord(path).then((coord) => {
			buildingInfo.lat = coord[0];
			buildingInfo.lon = coord[1];
		}).then(() => {
			if (this.buildingInfoIsNotFilled(buildingInfo)) {
				return Promise.resolve();
			}
			buildingRooms.set(buildingInfo.shortname, []);
			return this.getRoomsInfo(buildingInfo, buildingInfo.shortname).then(() => {
				return Promise.resolve();
			});
		});
	}

	private getRoomsInfo(buildingInfo: Building, shortName: string): Promise<void> {
		const jszipFile = contentJSZip.file(buildingInfo.directory);
		if (jszipFile === null) {
			return Promise.resolve();
		}
		return this.parseJSZipToJson(jszipFile).then((jsonFile) => {
			return this.getTableJson(jsonFile, shortName);
		}).then((tableJson) => {
			return this.processTable(tableJson, "room", buildingInfo);
		}).then(() => {
			return Promise.resolve();
		}).catch((error) => {
			return Promise.reject(error);
		});
	}

	private processRoomRow(row: any, buildingInfo: Building): Promise<void> {
		let roomInfo: Room = {
			fullname: buildingInfo.fullname,
			shortname: buildingInfo.shortname,
			number: "",
			name: buildingInfo.shortname + "_",
			address: buildingInfo.address,
			lat: buildingInfo.lat,
			lon: buildingInfo.lon,
			seats: 0,
			type: "",
			furniture: "",
			href: ""
		};
		for (const child of row.childNodes) {
			if (child.nodeName === "td") {
				const field = child.attrs[0].value;
				if (field === "views-field views-field-field-room-number") {
					roomInfo.number = child.childNodes[1].childNodes[0].value.trim();
					roomInfo.name = roomInfo.name + roomInfo.number;
				}
				if (field === "views-field views-field-field-room-capacity") {
					roomInfo.seats = Number(child.childNodes[0].value.trim());
				}
				if (field === "views-field views-field-field-room-furniture") {
					roomInfo.furniture = child.childNodes[0].value.trim();
				}
				if (field === "views-field views-field-field-room-type") {
					roomInfo.type = child.childNodes[0].value.trim();
				}
				if (field === "views-field views-field-nothing") {
					roomInfo.href = child.childNodes[1].attrs[0].value.trim();
				}
			}
		}
		if (this.roomInfoIsNotFilled(roomInfo, buildingInfo)) {
			return Promise.resolve();
		}
		this.entries.push(roomInfo);
		return Promise.resolve();
	}

	private buildingInfoIsNotFilled(buildingInfo: Building) {
		return buildingInfo === {
			fullname: "",
			shortname: "",
			address: "",
			directory: "",
			lat: 0,
			lon: 0
		};
	}

	private roomInfoIsNotFilled(roomInfo: Room, buildingInfo: Building) {
		return roomInfo === {
			fullname: buildingInfo.fullname,
			shortname: buildingInfo.shortname,
			number: "",
			name: this.id + "_" + buildingInfo.shortname + "_",
			address: buildingInfo.address,
			lat: buildingInfo.lat,
			lon: buildingInfo.lon,
			seats: 0,
			type: "",
			furniture: "",
			href: ""
		};
	}
}


