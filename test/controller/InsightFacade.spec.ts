import {
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import * as fs from "fs-extra";

import {testFolder} from "@ubccpsc310/folder-test";
import chai, {assert, expect} from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
describe("InsightFacade", function () {
	this.timeout(10000);
	let insightFacade: InsightFacade;

	const persistDir = "./data";
	const datasetContents = new Map<string, string>();

	// Reference any datasets you've added to test/resources/archives here and they will
	// automatically be loaded in the 'before' hook.
	const datasetsToLoad: {[key: string]: string} = {
		courses: "./test/resources/archives/courses.zip",
		courses1: "./test/resources/archives/frst.zip", // valid zip file
		courses2: "./test/resources/archives/geob.zip", // valid zip file
		courses3: "./test/resources/archives/noCoursesFolder.zip", // invalid zip without courses folder
		courses4: "./test/resources/archives/zeroSection.zip", // invalid zip with zero section data
		courses5: "./test/resources/archives/noJSONFile.zip", // invalid zip without JSON files
		courses6: "./test/resources/archives/coursesWithInvalidJson.zip",
		room: "./test/resources/archives/rooms.zip", // original rooms.zip
		room2: "./test/resources/archives/noRoomsFolder.zip", // no rooms folder
		room3: "./test/resources/archives/roomOnlyOneSubHtml.zip", // only one building link works
		room4: "./test/resources/archives/noRoomData.zip", // no building link works
		room5: "./test/resources/archives/invalidIndexHtml.zip", // main index file is invalid html
		room6: "./test/resources/archives/invalidBuildingHtml.zip" // one building html file is invalid
	};

	before(function () {
		// This section runs once and loads all datasets specified in the datasetsToLoad object
		for (const key of Object.keys(datasetsToLoad)) {
			const content = fs.readFileSync(datasetsToLoad[key]).toString("base64");
			datasetContents.set(key, content);
		}
		// Just in case there is anything hanging around from a previous run
		fs.removeSync(persistDir);
	});

	describe("Add/Remove/List Dataset", function () {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			insightFacade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent from the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			fs.removeSync(persistDir);
		});
		// This is a unit test. You should create more like this!
		it("Should add a valid dataset", function () {
			const id: string = "courses";
			const content: string = datasetContents.get("courses1") ?? "";
			const expected: string[] = [id];
			return insightFacade.addDataset(id, content, InsightDatasetKind.Courses).then((result: string[]) => {
				expect(result).to.deep.equal(expected);
			});
		});

		it("Should add a valid course dataset and ignore the invalid json", function () {
			const id: string = "courses";
			const content: string = datasetContents.get("courses6") ?? "";
			const expected: string[] = [id];
			return insightFacade.addDataset(id, content, InsightDatasetKind.Courses).then((result: string[]) => {
				expect(result).to.deep.equal(expected);
			});
		});
		it("should make a successful add to a non-empty dataset", function () {
			const id1 = "courses1";
			const id2 = "courses2";
			const content1: string = datasetContents.get("courses1") ?? "";
			const content2: string = datasetContents.get("courses1") ?? "";
			return insightFacade.addDataset(id1, content1, InsightDatasetKind.Courses).then(() => {
				return insightFacade.addDataset(id2, content2, InsightDatasetKind.Courses).then((result) => {
					expect(result).to.be.an.instanceof(Array);
					expect(result).to.have.length(2);
					const courseID = result.find((id) => id === "courses1");
					const courseID2 = result.find((id) => id === "courses2");
					expect(courseID).to.exist;
					expect(courseID2).to.exist;
					expect(courseID).to.deep.equal(id1);
					expect(courseID2).to.deep.equal(id2);
				});
			});
		});
		it("should reject with InsightError of no courses folder in zip", async function () {
			const id = "courses";
			const content: string = datasetContents.get("courses3") ?? "";
			try {
				await insightFacade.addDataset(id, content, InsightDatasetKind.Courses);
				assert.fail("should have thrown InsightError");
			} catch (err) {
				console.log(err);
				return expect(err).to.be.an.instanceof(InsightError);
			}
		});
		it("should reject with InsightError of zero section in folder in zip", async function () {
			const id = "courses";
			const content: string = datasetContents.get("courses4") ?? "";
			try {
				await insightFacade.addDataset(id, content, InsightDatasetKind.Courses);
				assert.fail("should have thrown InsightError");
			} catch (err) {
				console.log(err);
				return expect(err).to.be.instanceof(InsightError);
			}
		});
		it("should reject with InsightError of no JSON file in folder in zip", async function () {
			const id = "courses";
			const content: string = datasetContents.get("courses5") ?? "";
			try {
				await insightFacade.addDataset(id, content, InsightDatasetKind.Courses);
				assert.fail("should have thrown InsightError");
			} catch (err) {
				console.log(err);
				return expect(err).to.be.instanceof(InsightError);
			}
		});
		it("should reject with InsightError of 'invalid id' with underscore upon add", async function () {
			const id = "cour_ses";
			const content: string = datasetContents.get("courses1") ?? "";
			try {
				await insightFacade.addDataset(id, content, InsightDatasetKind.Courses);
				assert.fail("should have thrown InsightError");
			} catch (err) {
				console.log(err);
				return expect(err).to.be.instanceof(InsightError);
			}
		});
		it("should reject with InsightError of 'invalid id' with only white space upon add", async function () {
			const id = "	";
			const content: string = datasetContents.get("courses1") ?? "";
			try {
				await insightFacade.addDataset(id, content, InsightDatasetKind.Courses);
				assert.fail("should have thrown InsightError");
			} catch (err) {
				console.log(err);
				return expect(err).to.be.instanceof(InsightError);
			}
		});
		it("should reject with InsightError of 'duplicated id' upon add", async function () {
			const id1 = "courses";
			const id2 = "courses";
			const content: string = datasetContents.get("courses1") ?? "";
			try {
				await insightFacade.addDataset(id1, content, InsightDatasetKind.Courses);
				try {
					await insightFacade.addDataset(id2, content, InsightDatasetKind.Courses);
					assert.fail("should have thrown InsightError");
				} catch (result) {
					console.log(result);
					return expect(result).to.be.instanceof(InsightError);
				}
			} catch (err) {
				console.log(err);
				assert.fail("should have made a successful add");
			}
		});

		it("Should add a valid room dataset", function () {
			const id: string = "rooms";
			const content: string = datasetContents.get("room") ?? "";
			const expected: string[] = [id];
			return insightFacade.addDataset(id, content, InsightDatasetKind.Rooms).then((result: string[]) => {
				expect(result).to.deep.equal(expected);
			});
		});

		it("should make a successful room add to a non-empty dataset", function () {
			const id1 = "room1";
			const id2 = "room2";
			const content1: string = datasetContents.get("room") ?? "";
			const content2: string = datasetContents.get("room") ?? "";
			return insightFacade.addDataset(id1, content1, InsightDatasetKind.Rooms).then(() => {
				return insightFacade.addDataset(id2, content2, InsightDatasetKind.Rooms).then((result) => {
					expect(result).to.be.an.instanceof(Array);
					expect(result).to.have.length(2);
					const roomID = result.find((id) => id === "room1");
					const roomID2 = result.find((id) => id === "room2");
					expect(roomID).to.exist;
					expect(roomID2).to.exist;
					expect(roomID).to.deep.equal(id1);
					expect(roomID2).to.deep.equal(id2);
				});
			});
		});
		it("should reject with InsightError of no rooms folder in zip", async function () {
			const id = "rooms";
			const content: string = datasetContents.get("room2") ?? "";
			try {
				await insightFacade.addDataset(id, content, InsightDatasetKind.Rooms);
				assert.fail("should have thrown InsightError");
			} catch (err) {
				console.log(err);
				return expect(err).to.be.an.instanceof(InsightError);
			}
		});
		it("Should add a valid room dataset even with one link works", function () {
			const id: string = "rooms";
			const content: string = datasetContents.get("room3") ?? "";
			const expected: string[] = [id];
			return insightFacade.addDataset(id, content, InsightDatasetKind.Rooms).then((result: string[]) => {
				expect(result).to.deep.equal(expected);
			});
		});
		it("Should reject InsightError since the main index.html is invalid", function () {
			const id: string = "rooms";
			const content: string = datasetContents.get("room5") ?? "";
			return insightFacade.addDataset(id, content, InsightDatasetKind.Rooms).then((result: string[]) => {
				assert.fail("should have thrown InsightError");
			}).catch((error) => {
				console.log(error);
				return expect(error).to.be.an.instanceof(InsightError);
			});
		});
		it("Should add a valid room dataset even with one link has invalid html file", function () {
			const id: string = "rooms";
			const content: string = datasetContents.get("room6") ?? "";
			const expected: string[] = [id];
			return insightFacade.addDataset(id, content, InsightDatasetKind.Rooms).then((result: string[]) => {
				expect(result).to.deep.equal(expected);
			});
		});
		it("Should reject InsightError since no building links exist", async function () {
			const id = "rooms";
			const content: string = datasetContents.get("room4") ?? "";
			try {
				await insightFacade.addDataset(id, content, InsightDatasetKind.Rooms);
				assert.fail("should have thrown InsightError");
			} catch (err) {
				console.log(err);
				return expect(err).to.be.an.instanceof(InsightError);
			}
		});

		it("should make a successful remove", function () {
			const id = "courses";
			const content: string = datasetContents.get("courses1") ?? "";
			return insightFacade
				.addDataset(id, content, InsightDatasetKind.Courses)
				.then(() => {
					return insightFacade.removeDataset(id);
				})
				.then((result) => {
					expect(result).to.deep.equal(id);
					return insightFacade.listDatasets();
				}).then((datasets) => {
					expect(datasets).to.deep.equal([]);
				});
		});
		it("should reject with NotFoundError due to remove from an empty dataset", async function () {
			const id = "courses";
			try {
				await insightFacade.removeDataset(id);
				assert.fail("should have throw NotFoundError");
			} catch (err) {
				console.log(err);
				return expect(err).to.be.instanceof(NotFoundError);
			}
		});
		it("should reject with NotFoundError due to remove with no matching id upon remove", async function () {
			const id1 = "courses";
			const id2 = "courses2";
			const content: string = datasetContents.get("courses1") ?? "";
			try {
				await insightFacade.addDataset(id1, content, InsightDatasetKind.Courses);
				try {
					await insightFacade.removeDataset(id2);
					assert.fail("should have thrown NotFoundError");
				} catch (result) {
					console.log(result);
					expect(result).to.be.instanceof(NotFoundError);
				}
			} catch (err) {
				console.log(err);
				assert.fail("should have made a successful add");
			}
		});
		it("should reject with InsightError of 'invalid id' with underscore upon remove", async function () {
			const id1 = "courses";
			const id2 = "course_s";
			const content: string = datasetContents.get("courses1") ?? "";
			try {
				await insightFacade.addDataset(id1, content, InsightDatasetKind.Courses);
				try {
					await insightFacade.removeDataset(id2);
					assert.fail("should have thrown InsightError");
				} catch (result) {
					console.log(result);
					expect(result).to.be.instanceof(InsightError);
				}
			} catch (err) {
				console.log(err);
				assert.fail("should have made a successful add");
			}
		});
		it("should reject with InsightError of 'invalid id' with only whitespace upon remove", async function () {
			const id1 = "courses";
			const id2 = "	";
			const content: string = datasetContents.get("courses2") ?? "";
			try {
				await insightFacade.addDataset(id1, content, InsightDatasetKind.Courses);
				try {
					await insightFacade.removeDataset(id2);
					assert.fail("should have thrown InsightError");
				} catch (result) {
					console.log(result);
					expect(result).to.be.instanceof(InsightError);
				}
			} catch (err) {
				console.log(err);
				assert.fail("should have made a successful add");
			}
		});
		it("should return empty string(no dataset)", function () {
			return insightFacade.listDatasets().then((dataSets) => {
				expect(dataSets).to.be.an.instanceof(Array);
				expect(dataSets).to.have.length(0);
			});
		});
		it("should return InsightDataset array of one item", function () {
			const myDataset: InsightDataset = {
				id: "courses",
				kind: InsightDatasetKind.Courses,
				numRows: 910,
			};
			const id = "courses";
			const content: string = datasetContents.get("courses1") ?? "";
			return insightFacade
				.addDataset(id, content, InsightDatasetKind.Courses)
				.then(() => {
					return insightFacade.listDatasets();
				})
				.then((dataSets) => {
					expect(dataSets).to.deep.equal([myDataset]);
				});
		});
		it("should return InsightDataset array of two item", function () {
			const myDataset1: InsightDataset = {
				id: "courses1",
				kind: InsightDatasetKind.Courses,
				numRows: 910,
			};
			const myDataset2: InsightDataset = {
				id: "courses2",
				kind: InsightDatasetKind.Courses,
				numRows: 910,
			};
			const content: string = datasetContents.get("courses1") ?? "";
			return insightFacade
				.addDataset("courses1", content, InsightDatasetKind.Courses)
				.then(() => {
					return insightFacade.addDataset("courses2", content, InsightDatasetKind.Courses);
				})
				.then(() => {
					return insightFacade.listDatasets();
				})
				.then((dataSets) => {
					expect(dataSets).to.be.an.instanceof(Array);
					expect(dataSets).to.have.length(2);
					const insightDatasetCourses = dataSets.find((dataset) => dataset.id === "courses1");
					const insightDatasetCourses2 = dataSets.find((dataset) => dataset.id === "courses2");
					expect(insightDatasetCourses).to.exist;
					expect(insightDatasetCourses2).to.exist;
					expect(insightDatasetCourses).to.deep.equal(myDataset1);
					expect(insightDatasetCourses2).to.deep.equal(myDataset2);
				});
		});
	});

	/*
	 * This test suite dynamically generates tests from the JSON files in test/queries.
	 * You should not need to modify it; instead, add additional files to the queries directory.
	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", () => {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
			fs.removeSync(persistDir);

			insightFacade = new InsightFacade();

			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [
				insightFacade.addDataset("rooms", datasetContents.get("room") ?? "", InsightDatasetKind.Rooms),
				insightFacade.addDataset("courses", datasetContents.get("courses") ?? "", InsightDatasetKind.Courses),
			];

			return Promise.all(loadDatasetPromises);
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			fs.removeSync(persistDir);
		});

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		testFolder<any, any[], PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests",
			(input) => insightFacade.performQuery(input),
			"./test/resources/queries/",
			{
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError(expected, actual) {
					if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else {
						expect(actual).to.be.instanceof(InsightError);
					}
				},
			}
		);
	});
});
