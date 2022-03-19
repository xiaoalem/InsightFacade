import {filterHasOnlyOneKey, validComparisonFormat, wildCardAccepted} from "../persistance/checkUtilities";
import {InsightError} from "../controller/IInsightFacade";
import {
	intersectArray,
	notArray,
	unionArray, xor
} from "../persistance/Utilities";
import ReadQuery from "./ReadQuery";
const reAsterisk: RegExp = new RegExp(/^[*]?[^*]*[*]?$/);

export default class Filter {
	private queryEngine: ReadQuery;
	private datasets = new Map();
	private targetDataset: string = "";

	constructor(engine: ReadQuery) {
		this.queryEngine = engine;
		this.datasets = engine.getDatasets();
		this.targetDataset = engine.getTargetDataset();
	}

	public parseFilter(filterNode: any): Promise<any[]> {
		if (!filterHasOnlyOneKey(filterNode)) {
			return Promise.reject(new InsightError("Invalid Query Input"));
		}
		const filterKey = Object.keys(filterNode)[0];
		const filterValue = Object.values(filterNode);
		if (filterKey === "NOT") {
			return this.handleNot(filterValue).then((result) => {
				return result;
			}).catch((error) => {
				return Promise.reject(error);
			});
		} else if (["AND", "OR"].includes(filterKey)) {
			return this.handleLogic(filterValue, filterKey).then((result) => {
				return result;
			}).catch((error) => {
				return Promise.reject(error);
			});
		}
		return this.handleComparison(filterValue, filterKey)
			.then((results) => {
				return results;
			})
			.catch((error: Error) => {
				return Promise.reject(error);
			});
	}

	private handleComparison(filterValue: any[], type: string): Promise<any[]> {
		if (!validComparisonFormat(filterValue, type)) {
			return Promise.reject(new InsightError("Invalid comparison"));
		}
		const inputString: any = Object.values(filterValue[0])[0];
		const idAndField = (Object.keys(filterValue[0])[0]).split("_");
		return this.finalFilter(idAndField[0], idAndField[1], inputString, type).then((result) => {
			return result;
		}).catch((error) => {
			return Promise.reject(error);
		});
	}

	private handleNot(filterValue: any[]): Promise<any[]> {
		return this.parseFilter(filterValue[0]).then((results) => {
			let parentSection: any[];
			parentSection = (this.datasets.get(this.targetDataset)).entries;
			return notArray(parentSection, results);
		}).catch((error) => {
			return Promise.reject(error);
		});
	}

	private handleLogic(filterValue: any[], type: string): Promise<any[]> {
		if (filterValue[0].length < 1) {
			return Promise.reject(new InsightError("Logic comparison needs at least one filter"));
		}
		const childrenAsyncParse: any[] = [];
		const values = filterValue[0];
		for (const child of values) {
			childrenAsyncParse.push(this.parseFilter(child));
		}
		return Promise.all(childrenAsyncParse).then((result) => {
			return type === "OR" ? unionArray(result) : intersectArray(result);
		}).catch((error) => {
			return Promise.reject(error);
		});
	}

	private finalFilter(idStr: string, field: string, filterValue: any, type: string): Promise<any[]> {
		if (!this.keyAndFieldAreConsistent(idStr, filterValue)) {
			return Promise.reject(new InsightError());
		}
		let datasetWithIdString = this.datasets.get(idStr);
		let filteredSections: any[] = [];
		let sr: any[] = datasetWithIdString.entries;
		for (let i of sr) {
			let fieldValue: any = datasetWithIdString.getField(i, field);
			if (type === "EQ" && fieldValue === filterValue) {
				filteredSections.push(i);
			} else if (type === "GT" && fieldValue > filterValue) {
				filteredSections.push(i);
			} else if (type === "LT" && fieldValue < filterValue) {
				filteredSections.push(i);
			} else if (type === "IS" && wildCardAccepted(fieldValue, filterValue)) {
				filteredSections.push(i);
			}
		}
		return Promise.resolve(filteredSections);
	}

	private keyAndFieldAreConsistent(idString: string, filterValue: any): boolean {
		if (typeof filterValue === "string" && !reAsterisk.test(filterValue)) {
			return false;
		}
		return this.datasets.has(idString) && this.queryEngine.targetIsConsistent(idString);
	}
}
