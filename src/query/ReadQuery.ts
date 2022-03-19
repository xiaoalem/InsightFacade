import ReadCourses from "../structure/ReadCourses";
import {InsightDatasetKind, InsightError, ResultTooLargeError} from "../controller/IInsightFacade";
import {
	optionsHasColumns,
	queryHasBothKeys,
	validApplyKey,
	validMKey,
	validSKey
} from "../persistance/checkUtilities";
import Filter from "./Filter";
import Transform from "./Transform";
import ReadData from "../structure/ReadData";
import {doOrders} from "./Order";

const reKey: RegExp = new RegExp(/^[^_]+_[^_]+$/);

export default class ReadQuery {

	private datasets = new Map();
	private targetDataset: string = "";
	private datasetObj: ReadData;

	constructor(datasets: Map<string, ReadData>) {
		this.datasets = datasets;
		this.datasetObj = new ReadCourses("id", InsightDatasetKind.Courses);
	}

	public readFromQuery(query: any): Promise<any[]> {
		if (!queryHasBothKeys(query)) {
			return Promise.reject(new InsightError("Invalid query: need both WHERE and OPTIONS!"));
		}
		const where = query.WHERE;
		const option = query.OPTIONS;
		return this.isOptionsValid(option).then(() => {
			if (Object.keys(where).length === 0) {
				return this.datasets.get(this.targetDataset).entries;
			} else {
				const filter: Filter = new Filter(this);
				return filter.parseFilter(where);
			}
		}).then((filterResult: any[]) => {
			const transformation = query.TRANSFORMATIONS;
			if (transformation !== undefined) {
				const transform: Transform = new Transform(this);
				return transform.applyTransformation(filterResult, transformation, option.COLUMNS);
			} else {
				return filterResult;
			}
		}).then((transformedResult: any[]) => {
			if (transformedResult.length > 5000) {
				return Promise.reject(new ResultTooLargeError());
			}
			if (query.TRANSFORMATIONS === undefined) {
				return this.selectColumns(transformedResult, option.COLUMNS);
			} else {
				return transformedResult;
			}
		}).then((transformedResult) => {
			if (transformedResult.length === 1 || transformedResult.length === 0 || option.ORDER === undefined) {
				return transformedResult;
			}
			return this.applyOrder(transformedResult, option);
		}).then((finalResult) => {
			return finalResult;
		}).catch((error) => {
			return Promise.reject(error);
		});
	}

	private selectColumns(entries: any[], columns: any[]): Promise<any[]> {
		let mapObj: any[] = this.datasetObj.selectEntries(entries, columns);
		return Promise.resolve(mapObj);
	}

	private applyOrder(sections: any[], option: any): Promise<any[]> {
		return doOrders(sections, option.ORDER).then((result) => {
			return result;
		});
	}

	private isOptionsValid(option: any): Promise<any> {
		if (!optionsHasColumns(option)) { // change to COLUMNS + SORT?
			return Promise.reject(new InsightError("Invalid query: COLUMNS is mandatory, ORDER is optional"));
		}
		let columns = option.COLUMNS;
		if (columns === undefined) {
			return Promise.reject(new InsightError("Invalid query: there is no COLUMNS tag"));
		}
		if (columns.length < 1) {
			return Promise.reject(new InsightError("At least one column needed"));
		}
		if (!this.validColumnsAndSortOrder(option)) {
			return Promise.reject(new InsightError("invalid column-sort format"));
		}
		return Promise.resolve();
	}

	public validColumnsAndSortOrder(option: any): boolean {
		if (Object.keys(option).length === 2) {
			let order = option.ORDER;
			let columnsKeys: string[] = option.COLUMNS;
			for (let c of columnsKeys) {
				if(!this.validAnyKey(c)) {
					return false;
				}
			}
			if (typeof order === "string" && !columnsKeys.includes(order)) {
				return false;
			} else if (typeof order !== "string") {
				const orderKeys = Object.keys(order);
				if (orderKeys.length !== 2 || orderKeys[0] !== "dir" || orderKeys[1] !== "keys") {
					return false;
				}
				const orderValues: any[] = Object.values(order);
				if (!["UP", "DOWN"].includes(orderValues[0])) {
					return false;
				}
				for (let k of orderValues[1]) {
					if (!columnsKeys.includes(k) || !this.validAnyKey(k)) {
						return false;
					}
				}
			}
		}
		return true;
	}

	public targetIsConsistent(idString: any): boolean {
		this.targetDataset = this.targetDataset === "" ? idString : this.targetDataset;
		this.datasetObj = this.datasets.get(idString);
		return this.targetDataset === idString;
	}

	public getDatasets(): Map<string, ReadCourses> {
		return this.datasets;
	}

	public getTargetDataset(): string {
		return this.targetDataset;
	}

	public getDatasetObj(): ReadData {
		return this.datasetObj;
	}

	public validAnyKey(key: string): boolean {
		return this.validKey(key) || validApplyKey(key);
	}

	public validKey(key: any): boolean {
		if (reKey.test(key)) {
			let splitStrings = key.split("_");
			return this.targetIsConsistent(splitStrings[0]) && (validMKey(key) || validSKey(key));
		}
		return false;
	}
}
