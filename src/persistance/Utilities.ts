import ReadCourses from "../structure/ReadCourses";
import * as fs from "fs-extra";
import {Room, Section} from "../structure/Miscellaneous";
import pathP from "path";
import Decimal from "decimal.js";
import ReadRooms from "../structure/ReadRooms";
import {URL} from "url";
import ReadData from "../structure/ReadData";
const persistDir = "./data";

const http = require("http");

export function writeDataToDisk(id: string, dataset: ReadCourses | ReadRooms): Promise<void> {
	const fileName = id + ".json";
	const datasetInJson = JSON.stringify(dataset);
	return new Promise((resolve, reject) => {
		return fs.access(persistDir, (error) => {
			if (error) {
				fs.mkdirSync(persistDir);
			}
			fs.writeFile(persistDir + "/" + fileName, datasetInJson, "utf8", (writeError) => {
				if (writeError) {
					console.log(writeError);
					reject();
				} else {
					console.log("Saved dataset in " + fileName);
					resolve();
				}
			});
		});
	});
}

export function readFromDisk(): Map<string, ReadData> {
	const datasets: Map<string, ReadData> = new Map();
	fs.access(persistDir, (accessError) => {
		if (accessError) {
			console.log("No data added yet");
		} else {
			const jsonsInDir = fs.readdirSync(persistDir, "utf8").filter((file) => pathP.extname(file) === ".json");
			for (const file of jsonsInDir) {
				const fileData = fs.readFileSync(pathP.join(persistDir, file)).toString();
				const json = JSON.parse(fileData);
				const sectionsData: any[] = json.sections;
				const id = json.id;
				const kind = json.kind;
				let newDataSet: ReadData;
				if (kind === "rooms") {
					newDataSet = new ReadRooms(id, kind);
				} else {
					newDataSet = new ReadCourses(id, kind);
				}
				const sections = sectionsData.map(extractData);
				newDataSet.entries = newDataSet.entries.concat(sections);
				datasets.set(id, newDataSet);
			}
		}
	});
	return datasets;
}

export function removeFromDisk(id: string) {
	const fileName = persistDir + "/" + id + ".json";
	return fs.removeSync(fileName);
}

export function xor(a: boolean, b: boolean): boolean {
	return (a || b) && !(a && b);
}

export function intersectArray(arrays: any[][]): Promise<any[]> {
	const result = arrays.reduce((first, second) => first.filter((item) => second.includes(item)));
	return Promise.resolve(result);
}
export function unionArray(arrays: any[][]): Promise<any[]> {
	return Promise.resolve([...new Set(arrays.flat())]);
}

export function notArray(arrayParent: any[], arrayChild: any[]): Promise<any[]> {
	let result = arrayParent.filter((value) => !arrayChild.includes(value));
	return Promise.resolve(result);
}

export function getSectionField(section: Section, field: string): any {
	if (field === "id") {
		return section.id;
	} else if (field === "dept") {
		return section.dept;
	} else if (field === "avg") {
		return section.avg;
	} else if (field === "instructor") {
		return section.instructor;
	} else if (field === "title") {
		return section.title;
	} else if (field === "pass") {
		return section.pass;
	} else if (field === "fail") {
		return section.fail;
	} else if (field === "audit") {
		return section.audit;
	} else if (field === "uuid") {
		return section.uuid;
	} else if (field === "year") {
		return section.year;
	} else {
		return [];
	}
}

export function getRoomField(room: Room, field: string): any {
	if (field === "fullname") {
		return room.fullname;
	} else if (field === "shortname") {
		return room.shortname;
	} else if (field === "number") {
		return room.number;
	} else if (field === "name") {
		return room.name;
	} else if (field === "address") {
		return room.address;
	} else if (field === "lat") {
		return room.lat;
	} else if (field === "lon") {
		return room.lon;
	} else if (field === "seats") {
		return room.seats;
	} else if (field === "type") {
		return room.type;
	} else if (field === "furniture") {
		return room.furniture;
	} else if (field === "href") {
		return room.href;
	} else {
		return [];
	}
}

export function getTString(item: any, groups: string[]): string {
	let resultString: string = "";
	for (const group of groups) {
		let groupField = group.split("_")[1];
		let fieldVal = instanceofCourse(item) ? getSectionField(item, groupField) : getRoomField(item, groupField);
		if (typeof fieldVal === "string") {
			fieldVal = "*".concat(fieldVal);
		}
		if (resultString === "") {
			resultString = String(fieldVal);
		} else {
			resultString = resultString.concat("()", String(fieldVal));
		}
	}
	return resultString;
}

export function zip(groups: string[], keyString: string, columns: string[]): Map<string, any> {
	let items = keyString.split("()");
	let result = new Map();
	for (let i = 0; i < groups.length; i++) {
		if(columns.includes(groups[i])) {
			if (items[i].includes("*")) {
				result.set(groups[i], items[i].slice(1));
			} else {
				result.set(groups[i], Number(items[i]));
			}
		}
	}
	return result;
}

export function findMin(fieldValues: number[]): number {
	const getMin = (a: number, b: number) => Math.min(a, b);
	return fieldValues.reduce(getMin, fieldValues[0]);
}

export function getAvg(fieldValues: number[]): number {
	if (fieldValues.length === 0) {
		return 0;
	}
	const deciValues = fieldValues.map((num) => new Decimal(num));
	const total = deciValues.reduce((prev, cur) => prev.add(cur), new Decimal(0));
	const avg = total.toNumber() / fieldValues.length;
	return Number(avg.toFixed(2));
}

export function getSum(fieldValues: number[]): number {
	if (fieldValues.length === 0) {
		return 0;
	}
	const deciValues = fieldValues.map((num) => new Decimal(num));
	const total = deciValues.reduce((prev, cur) => cur.add(prev), new Decimal(0));
	return Number(total.toFixed(2));
}

export function findMax(fieldValues: number[]): number {
	const getMax = (a: number, b: number) => Math.max(a, b);
	return fieldValues.reduce(getMax, fieldValues[0]);
}

export function countNum(fieldValues: any[]): number {
	const valueSet = new Set(fieldValues);
	return valueSet.size;
}

function extractData(jsonObject: any): Section {
	return {
		id: jsonObject.id,
		dept: jsonObject.dept,
		avg: jsonObject.avg,
		instructor: jsonObject.instructor,
		title: jsonObject.title,
		pass: jsonObject.pass,
		fail: jsonObject.fail,
		audit: jsonObject.audit,
		uuid: jsonObject.audit,
		year: jsonObject.year,
	};
}

export async function getGeoCoord(path: string): Promise<number[]> {
	const opt = new URL(path);
	return new Promise<number[]>((resolve, reject) => {
		const req = http.get(opt, (res: any) => {
			res.setEncoding("utf8");
			res.on("data", (chunk: any) => {
				const data = JSON.parse(chunk);
				const coord = [data.lat, data.lon];
				resolve(coord);
			});
			res.on("end", () => {
				// console.log("No more data in response.");
			});
		});
		req.on("error", (error: any) => {
			console.error(`problem with request: ${error.message}`);
			resolve([0, 0]);
		});
	});
}

export function instanceofRoom(obj: any): boolean {
	return (Object.keys(obj)).includes("fullname");
}

export function instanceofCourse(obj: any): boolean {
	return (Object.keys(obj)).includes("dept");
}

