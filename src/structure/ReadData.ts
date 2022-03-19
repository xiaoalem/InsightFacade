import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import JSZip from "jszip";

export default abstract class ReadData {
	// private variables for Dataset class
	public id: string;
	public kind: InsightDatasetKind;
	public entries: any[];

	constructor(id: string, kind: InsightDatasetKind) {
		this.id = id;
		this.kind = kind;
		this.entries = [];
	}

	public parseBase64Content(content: string): Promise<JSZip> {
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
	}

	public abstract fillDataSet(content: string): Promise<any[]>;

	public selectEntries(entries: any[], columns: any[]) {
		return entries.map((s) => {
			const result: { [key: string]: any } = {};
			for (let c of columns) {
				let columnField = c.split("_")[1];
				result[c] = this.getField(s, columnField);
			}
			return result;
		});
	}

	public getField(entry: any, field: string): any {
		return entry[field];
	}
}
