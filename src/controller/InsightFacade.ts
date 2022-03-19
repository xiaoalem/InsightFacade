import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import ReadCourses from "../structure/ReadCourses";
import ReadQuery from "../query/ReadQuery";
import {readFromDisk, removeFromDisk, writeDataToDisk} from "../persistance/Utilities";
import ReadRooms from "../structure/ReadRooms";
import {distance, Room, Section} from "../structure/Miscellaneous";
import {idFormatIsCorrect} from "../persistance/checkUtilities";
import ReadData from "../structure/ReadData";
import {mergeSort} from "../query/Order";

export default class InsightFacade implements IInsightFacade {
	private insightDatasets = new Map();
	private datasets = new Map();

	constructor() {
		this.datasets = readFromDisk();
		for (const dataset of this.datasets.values()) {
			const myInsightDataSet: InsightDataset = {
				id: dataset.id,
				kind: dataset.kind,
				numRows: dataset.sections.length,
			};
			this.insightDatasets.set(dataset.id, myInsightDataSet);
		}
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (!idFormatIsCorrect(id)) {
			return Promise.reject(new InsightError("No underscore is allowed, id cannot be only whitespace"));
		}
		if (this.datasets.has(id)) {
			return Promise.reject(new InsightError("This id has already been used"));
		}
		let dataset: ReadData;
		if (kind === InsightDatasetKind.Courses) {
			dataset = new ReadCourses(id, kind);
		} else {
			dataset = new ReadRooms(id, kind);
		}
		return dataset.fillDataSet(content).then((entries: Section[] | Room[]) => {
			this.datasets.set(id, dataset);
			const myInsightDataset: InsightDataset = {
				id: id,
				kind: kind,
				numRows: entries.length,
			};
			this.insightDatasets.set(id, myInsightDataset);
			return writeDataToDisk(id, this.datasets.get(id));
		}).then(() => {
			return [...this.datasets.keys()];
		}).catch(() => {
			return Promise.reject(new InsightError("Content is invalid"));//
		});
	}

	public removeDataset(id: string): Promise<string> {
		if (!idFormatIsCorrect(id)) {
			return Promise.reject(new InsightError("No underscore is allowed, id cannot be only whitespace"));
		}
		if (!this.datasets.has(id)) {
			return Promise.reject(new NotFoundError("Given id is not found"));
		}
		this.datasets.delete(id);
		this.insightDatasets.delete(id);
		removeFromDisk(id);
		return Promise.resolve(id);
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve([...this.insightDatasets.values()]);
	}

	public performQuery(query: any): Promise<any[]> {
		const queryReader = new ReadQuery(this.datasets);
		return queryReader.readFromQuery(query).then((result) => {
			return Promise.resolve(result);
		}).catch((error) => {
			return Promise.reject(error);
		});
	}

	public sortRoomByDistance(arr: any, location: any): Promise<any[]> {
		let rooms: any[] = arr.map((row: any) => {
			row.rooms_distance = distance(row.rooms_lat, row.rooms_lon, location.lat, location.lon, "K") * 1000;
			return row;
		});
		const sortedRooms = mergeSort(rooms, ["rooms_distance", "rooms_capacity"]);
		return Promise.resolve(sortedRooms);
	}
}
