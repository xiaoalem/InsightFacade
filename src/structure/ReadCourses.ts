import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import {Section} from "./Miscellaneous";

import JSZip from "jszip";
import ReadData from "./ReadData";

export default class ReadCourses extends ReadData{

	constructor(id: string, kind: InsightDatasetKind) {
		super(id, kind);
	}

	public fillDataSet(content: string): Promise<Section[]> {
		return new Promise<Section[]>((resolve, reject) => {
			this.parseBase64Content(content)
				.then((data) => {
					return this.readData(data);
				})
				.then(() => {
					resolve(this.entries);
				})
				.catch((error) => {
					reject(new InsightError("Data Input is invalid"));
				});
		});
	}

	private readData(jszip: JSZip): Promise<void> {
		const allSectionsAsyncParse: any[] = [];
		jszip.folder("courses")?.forEach((relativePath, file) => {
			const sectionAsyncParse = this.parseSection(file);
			allSectionsAsyncParse.push(sectionAsyncParse);
		});
		return new Promise((resolve, reject) => {
			return Promise.all(allSectionsAsyncParse)
				.then(() => {
					if (this.entries.length === 0) {
						reject(new InsightError());
					} else {
						resolve();
					}
				})
				.catch((error) => {
					reject(new InsightError());
				});
		});
	}

	private parseSection(jszipObject: JSZip.JSZipObject | null): Promise<void> {
		if (jszipObject === null) {
			return Promise.resolve();
		}
		return new Promise((resolve, reject) => {
			jszipObject
				.async("string")
				.then((result) => {
					const resultInJSON = JSON.parse(result);
					const data = resultInJSON.result.map(extractData);
					this.entries = this.entries.concat(data);
					resolve();
				})
				.catch((error) => {
					resolve();
				});
		});
	}
}

function extractData(jsonObject: any): Section {
	return {
		id: jsonObject.Course,
		dept: jsonObject.Subject,
		avg: jsonObject.Avg,
		instructor: jsonObject.Professor,
		title: jsonObject.Title,
		pass: jsonObject.Pass,
		fail: jsonObject.Fail,
		audit: jsonObject.Audit,
		uuid: String(jsonObject.id),
		year: jsonObject.Section === "overall" ? 1900 : Number(jsonObject.Year),
	};
}


