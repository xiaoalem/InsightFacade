import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";
import {expect, use} from "chai";
import chaiHttp from "chai-http";
import * as fs from "fs-extra";

describe("Facade D3", function () {

	let facade: InsightFacade;
	let server: Server;
	const persistDir = "./data";

	use(chaiHttp);

	before(function () {
		facade = new InsightFacade();
		server = new Server(4321);
		// TODO: start server here once and handle errors properly
		server.start().then(() => {
			console.info("Server started");
		}).catch((err: Error) => {
			console.error(`ERROR: ${err.message}`);
		});
	});

	after(function () {
		// TODO: stop server here once!
		server.stop().then(() => {
			console.info("Server stopped");
		}).catch((err: Error) => {
			console.error(`ERROR: ${err.message}`);
		});
	});

	beforeEach(function () {
		// might want to add some process logging here to keep track of what"s going on
		console.info(`BeforeTest: ${this.currentTest?.title}`);
		facade = new InsightFacade();
	});

	afterEach(function () {
		// might want to add some process logging here to keep track of what"s going on
		console.info(`AfterTest: ${this.currentTest?.title}`);
		fs.removeSync(persistDir);
	});

	// Sample on how to format PUT requests

	// it("PUT test for courses dataset", function () {
	// 	try {
	// 		return chai.request("http://localhost:4321/")
	// 			.put("dataset/courses/courses")
	// 			.send(ZIP_FILE_DATA)
	// 			.set("Content-Type", "application/x-zip-compressed")
	// 			.then(function (res: Response) {
	// 				// some logging here please!
	// 				expect(res.status).to.be.equal(200);
	// 			})
	// 			.catch(function (err) {
	// 				// some logging here please!
	// 				expect.fail();
	// 			});
	// 	} catch (err) {
	// 		// and some more logging here!
	// 	}
	// });

	// The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
