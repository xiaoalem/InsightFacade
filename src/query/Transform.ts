import ReadQuery from "./ReadQuery";
import {applyToken, cMField, numericToken, rMField} from "../structure/Miscellaneous";
import {
	countNum,
	findMax,
	findMin,
	getAvg,
	getSum,
	getTString,
	zip
} from "../persistance/Utilities";
import {
	columnKeysAreInGroupOrApply,
	transformationHasBothKeys, validApplyKey,
} from "../persistance/checkUtilities";
import {InsightError} from "../controller/IInsightFacade";
import ReadData from "../structure/ReadData";
import {rejects} from "assert";

export default class Transform {
	private queryEngine: ReadQuery;
	private datasets = new Map();
	private targetDataset: string = "";
	private datasetObj: ReadData;

	constructor(engine: ReadQuery) {
		this.queryEngine = engine;
		this.datasets = engine.getDatasets();
		this.targetDataset = engine.getTargetDataset();
		this.datasetObj = engine.getDatasetObj();
	}

	public applyTransformation(filterResult: any[], transformation: any, column: string[]): Promise<any> {
		if (!this.validTransformation(transformation, column)) {
			return Promise.reject(new InsightError("TRANSFORMATION format is invalid"));
		}
		const group =  transformation.GROUP;
		const apply = transformation.APPLY;
		return Promise.resolve(this.aggregationAndApply(filterResult, apply, group, column));
	}

	private aggregationAndApply(filteredSet: any[], apply: any[], groups: string[], column: string[]): Promise<any> {
		return this.getGrouped(filteredSet, groups).then((groupedSets) => {
			let resultList: Array<Map<any, any>> = [];
			groupedSets.forEach((val, key) => {
				let unzippedRule: Map<string, any> = zip(groups, key, column);
				for (let rule of apply) { // {"courseAvg": {"AVG": "courses_avg"}}
					const tokenSet: any[] = Object.values(rule); // {"AVG": "courses_avg"}
					const token = Object.keys(tokenSet[0])[0]; // "AVG"
					const tokenKeys: string[] = Object.values(tokenSet[0]); // "course_avg"
					const field = (tokenKeys[0]).split("_")[1];
					let numberResult = this.applySingleGroup(val, token, field);
					if (numberResult === -1) {
						return Promise.reject(new InsightError());
					}
					const ruleKey = Object.keys(rule)[0];
					if(column.includes(ruleKey)) {
						unzippedRule.set(ruleKey, numberResult);
					}
				}
				resultList.push(unzippedRule);
			});
			let objList: any[] = [];
			for (let i = 0; i < resultList.length; i++) {
				objList[i] = Array.from(resultList[i]).reduce((obj, [key, val]) => (
					Object.assign(obj, {[key]: val})
				), {});
			}
			return objList;
		}).then((appliedResult) => {
			return appliedResult;
		}).catch((error) => {
			return rejects(error);
		});
	}

	private getGrouped(filteredSet: any[], groups: string[]): Promise<Map<any, any[]>> {
		let groupedResult = new Map<any, any>();
		for (let s of filteredSet) {
			const tString = getTString(s, groups);
			let val = groupedResult.get(tString);
			if (val === undefined) {
				groupedResult.set(tString, [s]);
			} else {
				val.push(s);
			}
		}
		return Promise.resolve(groupedResult);
	}

	private applySingleGroup(filterResult: any, token: string, field: string): number {
		let fieldValues: number[] = [];
		for (let i in filterResult) {
			const s = filterResult[i];
			fieldValues.push(this.datasetObj.getField(s, field));
		}
		if (token === "MAX") {
			return findMax(fieldValues);
		} else if (token === "MIN") {
			return findMin(fieldValues);
		} else if (token === "COUNT") {
			return countNum(fieldValues);
		} else if (token === "SUM") {
			return getSum(fieldValues);
		} else if (token === "AVG") {
			return getAvg(fieldValues);
		}
		return -1;
	}

	private validTransformation(transformation: any, column: string[]): boolean {
		if (!transformationHasBothKeys(transformation)) {
			return false;
		}
		const group: string[] = transformation.GROUP;
		const apply: any[] = transformation.APPLY;
		if (!this.validGroup(group)) {
			return false;
		}
		let columnKeyMetSoFar: Set<string> = new Set();
		for (const groupKey of group) {
			if (columnKeyMetSoFar.has(groupKey)) {
				return false;
			}
			columnKeyMetSoFar.add(groupKey);
		}
		if (apply.length === 0 && !columnKeysAreInGroupOrApply(columnKeyMetSoFar, column)) {
			return false;
		} else if (apply.length !== 0) {
			for (const applyRule of apply) {
				const applyRuleCheck = this.validApplyRule(applyRule);
				if (applyRuleCheck === "false" || columnKeyMetSoFar.has(applyRuleCheck)) {
					return false;
				}
				columnKeyMetSoFar.add(applyRuleCheck);
			}
			return columnKeysAreInGroupOrApply(columnKeyMetSoFar, column);
		}
		return true;
	}

	private validApplyRule(applyRule: any): string {
		const applyKeys: string[] = Object.keys(applyRule);
		const tokenSets: any[] = Object.values(applyRule);
		if (applyKeys.length !== 1 || tokenSets.length !== 1 || !validApplyKey(applyKeys[0])) {
			return "false";
		}
		const token = Object.keys(tokenSets[0]); // ["AVG"]
		const tokenKeys: string[] = Object.values(tokenSets[0]); // [courses_dept]
		if (token.length !== 1 || tokenKeys.length !== 1 || !this.queryEngine.validKey(tokenKeys[0])) {
			return "false";
		}
		let tokenKeyTwoParts = tokenKeys[0].split("_");
		if ((!applyToken.includes(token[0]) || tokenKeyTwoParts.length !== 2)) {
			return "false";
		}
		const field = (tokenKeys[0]).split("_");
		if (numericToken.includes(token[0]) && !cMField.includes(field[1]) && !rMField.includes(field[1])) {
			return "false";
		}
		return applyKeys[0];
	}

	private validGroup(group: string[]): boolean {
		const hasInvalidGroupKeys = group.filter((groupKey) => !this.queryEngine.validKey(groupKey));
		return group.length >= 1 && hasInvalidGroupKeys.length === 0;
	}
}
