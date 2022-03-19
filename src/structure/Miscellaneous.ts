export interface Section {
	[propName: string]: any,
	id: string;
	dept: string;
	avg: number;
	instructor: string;
	title: string;
	pass: number;
	fail: number;
	audit: number;
	uuid: string;
	year: number;
}

export interface Room {
	[propName: string]: any,
	fullname: string;
	shortname: string;
	number: string;
	name: string;
	address: string;
	lat: number;
	lon: number;
	seats: number;
	type: string;
	furniture: string;
	href: string;
}

export interface Building {
	fullname: string;
	shortname: string;
	address: string;
	directory: string;
	lat: number;
	lon: number;
}

export const queryKeys = ["WHERE", "OPTIONS", "TRANSFORMATIONS"];

export const cMField = ["avg", "pass", "fail", "audit", "year"];

export const cSField = ["dept", "id", "instructor", "title", "uuid"];

export const rMField = ["lat", "lon", "seats"];

export const rSField = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];

export const filterType = ["AND", "OR", "NOT", "LT", "GT", "EQ", "IS"];

export const sType = ["IS"];

export const mType = ["LT", "GT", "EQ"];

export const options = ["COLUMNS", "ORDER"];

export const applyToken = ["MAX", "MIN", "AVG", "COUNT", "SUM"];

export const numericToken = ["MAX", "MIN", "AVG", "SUM"];

// this function is retrieved online from "https://www.geodatasource.com/developers/javascript"
// it is used to calculate distance between two points given their geographic coordinates
export function distance(lat1: number, lon1: number, lat2: number, lon2: number, unit: string) {
	if ((lat1 === lat2) && (lon1 === lon2)) {
		return 0;
	} else {
		const radLat1 = Math.PI * lat1 / 180;
		const radLat2 = Math.PI * lat2 / 180;
		const theta = lon1 - lon2;
		const radTheta = Math.PI * theta / 180;
		let dist: number;
		dist = Math.sin(radLat1) * Math.sin(radLat2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.cos(radTheta);
		if (dist > 1) {
			dist = 1;
		}
		dist = Math.acos(dist);
		dist = dist * 180 / Math.PI;
		dist = dist * 60 * 1.1515;
		if (unit === "K") {
			dist = dist * 1.609344;
		}
		if (unit === "N") {
			dist = dist * 0.8684;
		}
		return dist;
	}
}


