import {
	cMField, cSField,
	filterType, queryKeys, rMField, rSField
} from "../structure/Miscellaneous";

const reKey: RegExp = new RegExp(/^[^_]+_[^_]+$/);
const reApplyKey: RegExp = new RegExp(/^[^_]+$/);
const reUnderscore: RegExp = new RegExp(/^[^_]+$/);
const reWhitespace: RegExp = new RegExp(/.*\S.*/);

export function queryHasBothKeys(queryInput: any) {
	let keys = Object.keys(queryInput);
	for (let key of keys) {
		if (!queryKeys.includes(key)) {
			return false;
		}
	}
	return queryInput.WHERE !== undefined && queryInput.OPTIONS !== undefined;
}

export function transformationHasBothKeys(transformation: any) {
	const keys = Object.keys(transformation);
	for (let key of keys) {
		if (!["GROUP", "APPLY"].includes(key)) {
			return false;
		}
	}
	return !(transformation.GROUP === undefined || transformation.APPLY === undefined);
}

export function columnKeysAreInGroupOrApply(keysMetSoFar: Set<string>, column: string[]): boolean {
	return (column.filter((columnKey) => keysMetSoFar.has(columnKey))).length === column.length;
}

export function optionsHasColumns(option: any) {
	let oks = Object.keys(option);
	if (oks.length === 1 && oks[0] === "COLUMNS") {
		return true;
	}
	return oks.length === 2 && option.COLUMNS !== undefined && option.ORDER !== undefined;
}

export function filterHasOnlyOneKey(filterNode: any): boolean {
	const filterKeys = Object.keys(filterNode);
	const filterValues = Object.values(filterNode);
	return filterKeys.length === 1 && filterValues.length === 1 && filterType.includes(filterKeys[0]);
}

export function idFormatIsCorrect(id: string): boolean {
	return reUnderscore.test(id) && reWhitespace.test(id);
}

export function wildCardAccepted(fieldValue: string, value: string): boolean {
	const valueWTStar = value.replace(/\*/g, "");
	if (value.charAt(0) === "*") {
		if (value.charAt(value.length - 1) === "*") {
			return fieldValue.includes(valueWTStar);
		} else {
			return fieldValue.endsWith(valueWTStar);
		}
	}
	if (value.charAt(value.length - 1) === "*") {
		return fieldValue.startsWith(valueWTStar );
	}
	return fieldValue === value;
}

export function validComparisonFormat(filterValue: any[], type: string): boolean {
	if (filterValue.length !== 1) {
		return false;
	}
	let keys = Object.keys(filterValue[0]);
	let values = Object.values(filterValue[0]);
	if (keys.length !== 1 || values.length !== 1) {
		return false;
	}
	let key = keys[0];
	if (type === "IS") {
		return reKey.test(key) && validSComparison(key, values[0]);
	}
	return reKey.test(key) && validMComparison(key, values[0]);
}

export function validMKey(mKey: string) {
	let idAndField = mKey.split("_");
	const idString = idAndField[0];
	const mField = idAndField[1];
	if (validIdString(idString)) {
		if (idString === "courses") {
			return cMField.includes(mField);
		} else if (idString === "rooms") {
			return rMField.includes(mField);
		}
	}
	return false;
}

export function validSKey(sKey: string) {
	let idAndField = sKey.split("_");
	const idString = idAndField[0];
	const sField = idAndField[1];
	if (validIdString(idString)) {
		if (idString === "courses") {
			return cSField.includes(sField);
		} else if (idString === "rooms") {
			return rSField.includes(sField);
		}
	}
	return false;
}

export function validMComparison(mKey: string, value: any): boolean {
	return validMKey(mKey) && typeof value === "number";
}

export function validSComparison(sKey: string, value: any): boolean {
	return validSKey(sKey) && typeof value === "string";
}

export function validIdString(idString: string): boolean {
	return !idString.includes("_") && idString.length > 0;
}

export function validApplyKey(key: string): boolean {
	return reApplyKey.test(key);
}

